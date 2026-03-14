import { classifyChannels } from "./channel-service.js";
import { buildWarningMessage, buildArchiveReport } from "./notifier.js";
import {
  fetchAllChannels,
  archiveChannel,
  postMessage,
} from "./slack-client.js";
import {
  loadExcludeNames,
  loadWarnings,
  saveWarnings,
  saveChannelSnapshot,
} from "./sheet-store.js";
import {
  DEFAULT_EXCLUDE_PATTERNS,
  DEFAULT_WARNING_THRESHOLD_DAYS,
  DEFAULT_GRACE_PERIOD_DAYS,
} from "./config.js";
import type { Thresholds } from "./config.js";

function getNotifyChannelId(): string {
  const id =
    PropertiesService.getScriptProperties().getProperty("NOTIFY_CHANNEL_ID");
  if (id === null) {
    throw new Error("NOTIFY_CHANNEL_ID is not set in Script Properties");
  }
  return id;
}

function setupTrigger(): void {
  const props = PropertiesService.getScriptProperties();
  const interval = props.getProperty("TRIGGER_INTERVAL") ?? "daily";
  const hour = Number(props.getProperty("TRIGGER_HOUR") ?? "9");

  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === "archiveInactiveChannels") {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  const builder = ScriptApp.newTrigger("archiveInactiveChannels")
    .timeBased()
    .atHour(hour);

  switch (interval) {
    case "hourly":
      builder.everyHours(1).create();
      break;
    case "weekly":
      builder.everyWeeks(1).create();
      break;
    default:
      builder.everyDays(1).create();
      break;
  }

  Logger.log(
    `Trigger created: archiveInactiveChannels (${interval} at ${hour}:00)`,
  );
}

function initSpreadsheet(): void {
  const id =
    PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (id === null) {
    throw new Error("SPREADSHEET_ID is not set in Script Properties");
  }
  const ss = SpreadsheetApp.openById(id);

  const sheetNames = ["channels", "archive_warnings", "exclude_channels"];
  for (const name of sheetNames) {
    if (ss.getSheetByName(name) === null) {
      ss.insertSheet(name);
    }
  }

  const excludeSheet = ss.getSheetByName("exclude_channels")!;
  if (excludeSheet.getLastRow() === 0) {
    excludeSheet.getRange(1, 1).setValue("channel_name");
  }

  const defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet !== null) {
    ss.deleteSheet(defaultSheet);
  }

  Logger.log("Spreadsheet initialized: " + ss.getUrl());
}

function loadThresholds(): Thresholds {
  const props = PropertiesService.getScriptProperties();
  const warningThresholdDays = Number(
    props.getProperty("WARNING_THRESHOLD_DAYS") ??
      String(DEFAULT_WARNING_THRESHOLD_DAYS),
  );
  const gracePeriodDays = Number(
    props.getProperty("GRACE_PERIOD_DAYS") ?? String(DEFAULT_GRACE_PERIOD_DAYS),
  );
  return { warningThresholdDays, gracePeriodDays };
}

function archiveInactiveChannels(): void {
  const now = new Date();
  const notifyChannelId = getNotifyChannelId();
  const thresholds = loadThresholds();

  const channels = fetchAllChannels();
  saveChannelSnapshot(channels);

  const sheetExcludes = loadExcludeNames();
  const excludeNames = [...DEFAULT_EXCLUDE_PATTERNS, ...sheetExcludes];

  const existingWarnings = loadWarnings();

  const { newWarnings, archiveCandidates, remainingWarnings } =
    classifyChannels(channels, existingWarnings, excludeNames, now, thresholds);

  for (const candidate of archiveCandidates) {
    archiveChannel(candidate.channelId);
  }

  const updatedWarnings = [...remainingWarnings, ...newWarnings];
  saveWarnings(updatedWarnings);

  const warningMessage = buildWarningMessage(
    newWarnings,
    thresholds.gracePeriodDays,
  );
  if (warningMessage !== "") {
    postMessage(notifyChannelId, warningMessage);
  }

  const archiveReport = buildArchiveReport(archiveCandidates);
  if (archiveReport !== "") {
    postMessage(notifyChannelId, archiveReport);
  }
}
