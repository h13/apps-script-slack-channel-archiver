import { classifyChannels } from "./channel-service.js";
import { buildWarningMessage, buildArchiveReport } from "./notifier.js";
import {
  fetchAllChannels,
  archiveChannel,
  postMessage,
} from "./slack-client.js";
import {
  loadSettings,
  loadExcludeNames,
  loadWarnings,
  saveWarnings,
  saveChannelSnapshot,
} from "./sheet-store.js";
import {
  DEFAULT_EXCLUDE_PATTERNS,
  DEFAULT_WARNING_THRESHOLD_DAYS,
  DEFAULT_GRACE_PERIOD_DAYS,
  SHEET_NAMES,
} from "./config.js";

function setupTrigger(): void {
  const settings = loadSettings();

  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === "archiveInactiveChannels") {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  const builder = ScriptApp.newTrigger("archiveInactiveChannels")
    .timeBased()
    .atHour(settings.triggerHour);

  switch (settings.triggerInterval) {
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
    `Trigger created: archiveInactiveChannels (${settings.triggerInterval} at ${settings.triggerHour}:00)`,
  );
}

function initSpreadsheet(): void {
  const id =
    PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (id === null) {
    throw new Error("SPREADSHEET_ID is not set in Script Properties");
  }
  const ss = SpreadsheetApp.openById(id);

  const sheetNames = [
    SHEET_NAMES.channels,
    SHEET_NAMES.warnings,
    SHEET_NAMES.excludes,
    SHEET_NAMES.settings,
  ];
  for (const name of sheetNames) {
    if (ss.getSheetByName(name) === null) {
      ss.insertSheet(name);
    }
  }

  const excludeSheet = ss.getSheetByName(SHEET_NAMES.excludes)!;
  if (excludeSheet.getLastRow() === 0) {
    excludeSheet.getRange(1, 1).setValue("channel_name");
  }

  const settingsSheet = ss.getSheetByName(SHEET_NAMES.settings)!;
  if (settingsSheet.getLastRow() === 0) {
    const defaults = [
      ["key", "value"],
      ["SLACK_BOT_TOKEN", ""],
      ["NOTIFY_CHANNEL_ID", ""],
      ["WARNING_THRESHOLD_DAYS", String(DEFAULT_WARNING_THRESHOLD_DAYS)],
      ["GRACE_PERIOD_DAYS", String(DEFAULT_GRACE_PERIOD_DAYS)],
      ["TRIGGER_INTERVAL", "daily"],
      ["TRIGGER_HOUR", "9"],
    ];
    settingsSheet.getRange(1, 1, defaults.length, 2).setValues(defaults);
  }

  const defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet !== null) {
    ss.deleteSheet(defaultSheet);
  }

  Logger.log("Spreadsheet initialized: " + ss.getUrl());
}

function archiveInactiveChannels(): void {
  const now = new Date();
  const settings = loadSettings();
  const token = settings.slackBotToken;

  const channels = fetchAllChannels(token);
  saveChannelSnapshot(channels);

  const sheetExcludes = loadExcludeNames();
  const excludeNames = [...DEFAULT_EXCLUDE_PATTERNS, ...sheetExcludes];

  const existingWarnings = loadWarnings();

  const thresholds = {
    warningThresholdDays: settings.warningThresholdDays,
    gracePeriodDays: settings.gracePeriodDays,
  };

  const { newWarnings, archiveCandidates, remainingWarnings } =
    classifyChannels(channels, existingWarnings, excludeNames, now, thresholds);

  for (const candidate of archiveCandidates) {
    archiveChannel(token, candidate.channelId);
  }

  const updatedWarnings = [...remainingWarnings, ...newWarnings];
  saveWarnings(updatedWarnings);

  const warningMessage = buildWarningMessage(
    newWarnings,
    thresholds.gracePeriodDays,
  );
  if (warningMessage !== "") {
    postMessage(token, settings.notifyChannelId, warningMessage);
  }

  const archiveReport = buildArchiveReport(archiveCandidates);
  if (archiveReport !== "") {
    postMessage(token, settings.notifyChannelId, archiveReport);
  }
}
