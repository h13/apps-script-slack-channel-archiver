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

function getNotifyChannel(): string {
  return (
    PropertiesService.getScriptProperties().getProperty("NOTIFY_CHANNEL") ??
    "#general"
  );
}

function runDaily(): void {
  const now = new Date();
  const notifyChannel = getNotifyChannel();

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
    postMessage(notifyChannel, warningMessage);
  }

  const archiveReport = buildArchiveReport(archiveCandidates);
  if (archiveReport !== "") {
    postMessage(notifyChannel, archiveReport);
  }
}
