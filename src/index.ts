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
import { DEFAULT_EXCLUDE_PATTERNS } from "./config.js";

function getNotifyChannelId(): string {
  const id =
    PropertiesService.getScriptProperties().getProperty("NOTIFY_CHANNEL_ID");
  if (id === null) {
    throw new Error("NOTIFY_CHANNEL_ID is not set in Script Properties");
  }
  return id;
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

function runDaily(): void {
  const now = new Date();
  const notifyChannelId = getNotifyChannelId();

  const channels = fetchAllChannels();
  saveChannelSnapshot(channels);

  const sheetExcludes = loadExcludeNames();
  const excludeNames = [...DEFAULT_EXCLUDE_PATTERNS, ...sheetExcludes];

  const existingWarnings = loadWarnings();

  const { newWarnings, archiveCandidates, remainingWarnings } =
    classifyChannels(channels, existingWarnings, excludeNames, now);

  for (const candidate of archiveCandidates) {
    archiveChannel(candidate.channelId);
  }

  const updatedWarnings = [...remainingWarnings, ...newWarnings];
  saveWarnings(updatedWarnings);

  const warningMessage = buildWarningMessage(newWarnings);
  if (warningMessage !== "") {
    postMessage(notifyChannelId, warningMessage);
  }

  const archiveReport = buildArchiveReport(archiveCandidates);
  if (archiveReport !== "") {
    postMessage(notifyChannelId, archiveReport);
  }
}
