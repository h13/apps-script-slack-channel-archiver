export const WARNING_THRESHOLD_DAYS = 95;
export const GRACE_PERIOD_DAYS = 5;

export const SHEET_NAMES = {
  channels: "channels",
  warnings: "archive_warnings",
  excludes: "exclude_channels",
} as const;

export const DEFAULT_EXCLUDE_PATTERNS: readonly string[] = [
  "general",
  "random",
];

export interface SlackChannel {
  readonly id: string;
  readonly name: string;
  readonly isPrivate: boolean;
  readonly lastActivityTs: number;
}

export interface WarningEntry {
  readonly channelId: string;
  readonly channelName: string;
  readonly isPrivate: boolean;
  readonly warnedAt: string;
  readonly inactiveDays: number;
}

export interface ArchiveCandidate {
  readonly channelId: string;
  readonly channelName: string;
  readonly isPrivate: boolean;
  readonly inactiveDays: number;
  readonly warnedAt: string;
  readonly graceDaysElapsed: number;
}

export interface ArchiveResult {
  readonly warned: readonly WarningEntry[];
  readonly archived: readonly ArchiveCandidate[];
  readonly skipped: readonly string[];
}
