import { GRACE_PERIOD_DAYS } from "./config.js";
import type { WarningEntry, ArchiveCandidate } from "./config.js";

function channelLabel(name: string, isPrivate: boolean): string {
  return isPrivate ? `\u{1F512} ${name}` : `#${name}`;
}

export function buildWarningMessage(warnings: readonly WarningEntry[]): string {
  if (warnings.length === 0) {
    return "";
  }

  const header = `:warning: *${warnings.length}件*のチャンネルが${GRACE_PERIOD_DAYS}日後にアーカイブされます\n`;
  const lines = warnings.map(
    (w) =>
      `• ${channelLabel(w.channelName, w.isPrivate)} (${w.inactiveDays}日間非アクティブ)`,
  );

  return `${header}\n${lines.join("\n")}`;
}

export function buildArchiveReport(
  archived: readonly ArchiveCandidate[],
): string {
  if (archived.length === 0) {
    return "";
  }

  const header = `:file_cabinet: *${archived.length}件*のチャンネルをアーカイブしました\n`;
  const lines = archived.map(
    (a) =>
      `• ${channelLabel(a.channelName, a.isPrivate)} (${a.inactiveDays}日間非アクティブ)`,
  );

  return `${header}\n${lines.join("\n")}`;
}
