import {
  SHEET_NAMES,
  DEFAULT_WARNING_THRESHOLD_DAYS,
  DEFAULT_GRACE_PERIOD_DAYS,
} from './config.js';
import type { WarningEntry, Settings } from './config.js';

function getRequiredScriptProperty(key: string): string {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  if (value === null || value.trim() === '') {
    throw new Error(`${key} is not set in Script Properties`);
  }
  return value.trim();
}

function getSpreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  return SpreadsheetApp.openById(getRequiredScriptProperty('SPREADSHEET_ID'));
}

function getOrCreateSheet(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  name: string,
): GoogleAppsScript.Spreadsheet.Sheet {
  const existing = ss.getSheetByName(name);
  if (existing !== null) {
    return existing;
  }
  return ss.insertSheet(name);
}

export function loadSettings(): Settings {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.settings);
  if (sheet === null) {
    throw new Error('settings sheet not found. Run initSpreadsheet first.');
  }

  const data = sheet.getDataRange().getValues() as (string | number)[][];
  const map = new Map<string, string>();
  for (const row of data.slice(1)) {
    const key = String(row[0] ?? '').trim();
    const value = String(row[1] ?? '').trim();
    if (key !== '') {
      map.set(key, value);
    }
  }

  // The bot token lives in Script Properties, not in the settings sheet:
  // anyone who can view the Spreadsheet must not be able to read the token.
  const token = getRequiredScriptProperty('SLACK_BOT_TOKEN');

  const channelId = map.get('NOTIFY_CHANNEL_ID') ?? '';
  if (channelId === '') {
    throw new Error('NOTIFY_CHANNEL_ID is not set in settings sheet');
  }

  return {
    slackBotToken: token,
    notifyChannelId: channelId,
    warningThresholdDays: Number(
      map.get('WARNING_THRESHOLD_DAYS') || DEFAULT_WARNING_THRESHOLD_DAYS,
    ),
    gracePeriodDays: Number(
      map.get('GRACE_PERIOD_DAYS') || DEFAULT_GRACE_PERIOD_DAYS,
    ),
    triggerInterval: map.get('TRIGGER_INTERVAL') || 'daily',
    triggerHour: Number(map.get('TRIGGER_HOUR') || '9'),
  };
}

export function loadExcludeNames(): readonly string[] {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.excludes);
  if (sheet === null) {
    return [];
  }

  const data = sheet.getDataRange().getValues() as string[][];
  return data
    .slice(1)
    .map((row) => row[0] ?? '')
    .filter((name) => name !== '');
}

export function loadWarnings(): readonly WarningEntry[] {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.warnings);
  if (sheet === null) {
    return [];
  }

  const data = sheet.getDataRange().getValues() as (
    | string
    | number
    | boolean
  )[][];
  return data.slice(1).map((row) => ({
    channelId: String(row[0] ?? ''),
    channelName: String(row[1] ?? ''),
    isPrivate: row[2] === true || row[2] === 'TRUE',
    warnedAt: String(row[3] ?? ''),
    inactiveDays: Number(row[4] ?? 0),
  }));
}

export function saveWarnings(warnings: readonly WarningEntry[]): void {
  const ss = getSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.warnings);

  sheet.clearContents();

  const header = [
    ['channelId', 'channelName', 'isPrivate', 'warnedAt', 'inactiveDays'],
  ];
  const rows = warnings.map((w) => [
    w.channelId,
    w.channelName,
    w.isPrivate,
    w.warnedAt,
    w.inactiveDays,
  ]);

  const allRows = [...header, ...rows];
  sheet.getRange(1, 1, allRows.length, 5).setValues(allRows);
}

export function saveChannelSnapshot(
  channels: readonly {
    readonly id: string;
    readonly name: string;
    readonly isPrivate: boolean;
    readonly lastActivityTs: number;
  }[],
): void {
  const ss = getSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.channels);

  sheet.clearContents();

  const header = [['channelId', 'channelName', 'isPrivate', 'lastActivityTs']];
  const rows = channels.map((ch) => [
    ch.id,
    ch.name,
    ch.isPrivate,
    ch.lastActivityTs,
  ]);

  const allRows = [...header, ...rows];
  sheet.getRange(1, 1, allRows.length, 4).setValues(allRows);
}
