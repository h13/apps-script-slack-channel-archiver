import { buildWarningMessage, buildArchiveReport } from "../src/notifier.js";
import type { WarningEntry, ArchiveCandidate } from "../src/config.js";

describe("buildWarningMessage", () => {
  it("returns empty string for no warnings", () => {
    expect(buildWarningMessage([])).toBe("");
  });

  it("builds message for single public channel warning", () => {
    const warnings: readonly WarningEntry[] = [
      {
        channelId: "C001",
        channelName: "old-project",
        isPrivate: false,
        warnedAt: "2026-03-14T00:00:00.000Z",
        inactiveDays: 96,
      },
    ];

    const message = buildWarningMessage(warnings);

    expect(message).toContain("old-project");
    expect(message).toContain("96");
    expect(message).toContain("5日後");
  });

  it("marks private channels with lock icon", () => {
    const warnings: readonly WarningEntry[] = [
      {
        channelId: "G001",
        channelName: "secret-project",
        isPrivate: true,
        warnedAt: "2026-03-14T00:00:00.000Z",
        inactiveDays: 100,
      },
    ];

    const message = buildWarningMessage(warnings);

    expect(message).toContain("\u{1F512}");
    expect(message).toContain("secret-project");
  });

  it("builds message for multiple warnings", () => {
    const warnings: readonly WarningEntry[] = [
      {
        channelId: "C001",
        channelName: "ch-a",
        isPrivate: false,
        warnedAt: "2026-03-14T00:00:00.000Z",
        inactiveDays: 96,
      },
      {
        channelId: "C002",
        channelName: "ch-b",
        isPrivate: false,
        warnedAt: "2026-03-14T00:00:00.000Z",
        inactiveDays: 100,
      },
    ];

    const message = buildWarningMessage(warnings);

    expect(message).toContain("ch-a");
    expect(message).toContain("ch-b");
    expect(message).toContain("2件");
  });
});

describe("buildArchiveReport", () => {
  it("returns empty string for no archives", () => {
    expect(buildArchiveReport([])).toBe("");
  });

  it("builds report for archived channels", () => {
    const archived: readonly ArchiveCandidate[] = [
      {
        channelId: "C001",
        channelName: "dead-project",
        isPrivate: false,
        inactiveDays: 101,
        warnedAt: "2026-03-08T00:00:00.000Z",
        graceDaysElapsed: 6,
      },
    ];

    const report = buildArchiveReport(archived);

    expect(report).toContain("dead-project");
    expect(report).toContain("101");
    expect(report).toContain("アーカイブ");
  });

  it("includes lock icon for private channels", () => {
    const archived: readonly ArchiveCandidate[] = [
      {
        channelId: "G001",
        channelName: "secret-dead",
        isPrivate: true,
        inactiveDays: 105,
        warnedAt: "2026-03-01T00:00:00.000Z",
        graceDaysElapsed: 10,
      },
    ];

    const report = buildArchiveReport(archived);

    expect(report).toContain("\u{1F512}");
  });
});
