import { SHEET_NAMES } from "./config.js";
import type { WarningEntry } from "./config.js";

function getSpreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  const id =
    PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (id === null) {
    throw new Error("SPREADSHEET_ID is not set in Script Properties");
  }
  return SpreadsheetApp.openById(id);
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

export function loadExcludeNames(): readonly string[] {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.excludes);
  if (sheet === null) {
    return [];
  }

  const data = sheet.getDataRange().getValues() as string[][];
  return data
    .slice(1)
    .map((row) => row[0] ?? "")
    .filter((name) => name !== "");
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
    channelId: String(row[0] ?? ""),
    channelName: String(row[1] ?? ""),
    isPrivate: row[2] === true || row[2] === "TRUE",
    warnedAt: String(row[3] ?? ""),
    inactiveDays: Number(row[4] ?? 0),
  }));
}

export function saveWarnings(warnings: readonly WarningEntry[]): void {
  const ss = getSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_NAMES.warnings);

  sheet.clearContents();

  const header = [
    ["channelId", "channelName", "isPrivate", "warnedAt", "inactiveDays"],
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

  const header = [["channelId", "channelName", "isPrivate", "lastActivityTs"]];
  const rows = channels.map((ch) => [
    ch.id,
    ch.name,
    ch.isPrivate,
    ch.lastActivityTs,
  ]);

  const allRows = [...header, ...rows];
  sheet.getRange(1, 1, allRows.length, 4).setValues(allRows);
}
