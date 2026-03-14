import { WARNING_THRESHOLD_DAYS, GRACE_PERIOD_DAYS } from "./config.js";
import type { SlackChannel, WarningEntry, ArchiveCandidate } from "./config.js";

const MS_PER_DAY = 86_400_000;

export interface ClassifyResult {
  readonly newWarnings: readonly WarningEntry[];
  readonly archiveCandidates: readonly ArchiveCandidate[];
  readonly remainingWarnings: readonly WarningEntry[];
}

export function calcInactiveDays(lastActivityTs: number, now: Date): number {
  const elapsedMs = now.getTime() - lastActivityTs * 1000;
  return Math.floor(elapsedMs / MS_PER_DAY);
}

export function isExcluded(
  channelName: string,
  excludeNames: readonly string[],
): boolean {
  return excludeNames.includes(channelName);
}

export function classifyChannels(
  channels: readonly SlackChannel[],
  existingWarnings: readonly WarningEntry[],
  excludeNames: readonly string[],
  now: Date,
): ClassifyResult {
  const warningMap = new Map(existingWarnings.map((w) => [w.channelId, w]));

  const newWarnings: WarningEntry[] = [];
  const archiveCandidates: ArchiveCandidate[] = [];
  const remainingWarnings: WarningEntry[] = [];

  for (const channel of channels) {
    if (isExcluded(channel.name, excludeNames)) {
      continue;
    }

    const inactiveDays = calcInactiveDays(channel.lastActivityTs, now);
    const existingWarning = warningMap.get(channel.id);

    if (inactiveDays < WARNING_THRESHOLD_DAYS) {
      continue;
    }

    if (existingWarning === undefined) {
      newWarnings.push({
        channelId: channel.id,
        channelName: channel.name,
        isPrivate: channel.isPrivate,
        warnedAt: now.toISOString(),
        inactiveDays,
      });
      continue;
    }

    const warnedAt = new Date(existingWarning.warnedAt);
    const graceDaysElapsed = Math.floor(
      (now.getTime() - warnedAt.getTime()) / MS_PER_DAY,
    );

    if (graceDaysElapsed >= GRACE_PERIOD_DAYS) {
      archiveCandidates.push({
        channelId: channel.id,
        channelName: channel.name,
        isPrivate: channel.isPrivate,
        inactiveDays,
        warnedAt: existingWarning.warnedAt,
        graceDaysElapsed,
      });
    } else {
      remainingWarnings.push({
        ...existingWarning,
        inactiveDays,
      });
    }
  }

  return { newWarnings, archiveCandidates, remainingWarnings };
}
