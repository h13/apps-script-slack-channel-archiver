import {
  calcInactiveDays,
  isExcluded,
  classifyChannels,
} from "../src/channel-service.js";
import type { SlackChannel, WarningEntry, Thresholds } from "../src/config.js";

const NOW = new Date("2026-03-14T00:00:00+09:00");
const DAY_MS = 86_400_000;

function makeChannel(
  overrides: Partial<SlackChannel> & { readonly id: string },
): SlackChannel {
  return {
    name: "test-channel",
    isPrivate: false,
    lastActivityTs: NOW.getTime() / 1000,
    ...overrides,
  };
}

describe("calcInactiveDays", () => {
  it("returns 0 for activity today", () => {
    const ts = NOW.getTime() / 1000;
    expect(calcInactiveDays(ts, NOW)).toBe(0);
  });

  it("returns correct days for past activity", () => {
    const thirtyDaysAgo = (NOW.getTime() - 30 * DAY_MS) / 1000;
    expect(calcInactiveDays(thirtyDaysAgo, NOW)).toBe(30);
  });

  it("floors fractional days", () => {
    const halfDay = (NOW.getTime() - 1.5 * DAY_MS) / 1000;
    expect(calcInactiveDays(halfDay, NOW)).toBe(1);
  });
});

describe("isExcluded", () => {
  const excludeNames = ["general", "random", "important"];

  it("returns true for excluded channel name", () => {
    expect(isExcluded("general", excludeNames)).toBe(true);
  });

  it("returns false for non-excluded channel name", () => {
    expect(isExcluded("project-alpha", excludeNames)).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(isExcluded("General", excludeNames)).toBe(false);
  });
});

describe("classifyChannels", () => {
  const excludeNames = ["general"];
  const thresholds: Thresholds = {
    warningThresholdDays: 95,
    gracePeriodDays: 5,
  };

  it("identifies warning candidates (95+ days inactive)", () => {
    const staleChannel = makeChannel({
      id: "C001",
      name: "old-project",
      lastActivityTs: (NOW.getTime() - 96 * DAY_MS) / 1000,
    });

    const result = classifyChannels(
      [staleChannel],
      [],
      excludeNames,
      NOW,
      thresholds,
    );

    expect(result.newWarnings).toHaveLength(1);
    expect(result.newWarnings[0]!.channelId).toBe("C001");
    expect(result.archiveCandidates).toHaveLength(0);
  });

  it("skips channels below warning threshold", () => {
    const activeChannel = makeChannel({
      id: "C002",
      name: "active-project",
      lastActivityTs: (NOW.getTime() - 10 * DAY_MS) / 1000,
    });

    const result = classifyChannels(
      [activeChannel],
      [],
      excludeNames,
      NOW,
      thresholds,
    );

    expect(result.newWarnings).toHaveLength(0);
    expect(result.archiveCandidates).toHaveLength(0);
  });

  it("skips excluded channels", () => {
    const generalChannel = makeChannel({
      id: "C003",
      name: "general",
      lastActivityTs: (NOW.getTime() - 200 * DAY_MS) / 1000,
    });

    const result = classifyChannels(
      [generalChannel],
      [],
      excludeNames,
      NOW,
      thresholds,
    );

    expect(result.newWarnings).toHaveLength(0);
    expect(result.archiveCandidates).toHaveLength(0);
  });

  it("identifies archive candidates from existing warnings past grace period", () => {
    const staleChannel = makeChannel({
      id: "C004",
      name: "dead-project",
      lastActivityTs: (NOW.getTime() - 100 * DAY_MS) / 1000,
    });

    const existingWarning: WarningEntry = {
      channelId: "C004",
      channelName: "dead-project",
      isPrivate: false,
      warnedAt: new Date(NOW.getTime() - 6 * DAY_MS).toISOString(),
      inactiveDays: 94,
    };

    const result = classifyChannels(
      [staleChannel],
      [existingWarning],
      excludeNames,
      NOW,
      thresholds,
    );

    expect(result.archiveCandidates).toHaveLength(1);
    expect(result.archiveCandidates[0]!.channelId).toBe("C004");
    expect(result.archiveCandidates[0]!.graceDaysElapsed).toBe(6);
    expect(result.newWarnings).toHaveLength(0);
  });

  it("keeps warned channels in warnings if grace period not elapsed", () => {
    const staleChannel = makeChannel({
      id: "C005",
      name: "warned-project",
      lastActivityTs: (NOW.getTime() - 97 * DAY_MS) / 1000,
    });

    const existingWarning: WarningEntry = {
      channelId: "C005",
      channelName: "warned-project",
      isPrivate: false,
      warnedAt: new Date(NOW.getTime() - 3 * DAY_MS).toISOString(),
      inactiveDays: 94,
    };

    const result = classifyChannels(
      [staleChannel],
      [existingWarning],
      excludeNames,
      NOW,
      thresholds,
    );

    expect(result.archiveCandidates).toHaveLength(0);
    expect(result.newWarnings).toHaveLength(0);
  });

  it("does not re-warn channels already in warning list", () => {
    const staleChannel = makeChannel({
      id: "C006",
      name: "already-warned",
      lastActivityTs: (NOW.getTime() - 96 * DAY_MS) / 1000,
    });

    const existingWarning: WarningEntry = {
      channelId: "C006",
      channelName: "already-warned",
      isPrivate: false,
      warnedAt: new Date(NOW.getTime() - 2 * DAY_MS).toISOString(),
      inactiveDays: 94,
    };

    const result = classifyChannels(
      [staleChannel],
      [existingWarning],
      excludeNames,
      NOW,
      thresholds,
    );

    expect(result.newWarnings).toHaveLength(0);
  });

  it("handles private channels the same as public", () => {
    const privateChannel = makeChannel({
      id: "G001",
      name: "secret-project",
      isPrivate: true,
      lastActivityTs: (NOW.getTime() - 100 * DAY_MS) / 1000,
    });

    const result = classifyChannels(
      [privateChannel],
      [],
      excludeNames,
      NOW,
      thresholds,
    );

    expect(result.newWarnings).toHaveLength(1);
    expect(result.newWarnings[0]!.isPrivate).toBe(true);
  });

  it("removes warnings for channels that became active again", () => {
    const reactivatedChannel = makeChannel({
      id: "C007",
      name: "revived-project",
      lastActivityTs: (NOW.getTime() - 10 * DAY_MS) / 1000,
    });

    const staleWarning: WarningEntry = {
      channelId: "C007",
      channelName: "revived-project",
      isPrivate: false,
      warnedAt: new Date(NOW.getTime() - 3 * DAY_MS).toISOString(),
      inactiveDays: 96,
    };

    const result = classifyChannels(
      [reactivatedChannel],
      [staleWarning],
      excludeNames,
      NOW,
      thresholds,
    );

    expect(result.newWarnings).toHaveLength(0);
    expect(result.archiveCandidates).toHaveLength(0);
    expect(result.remainingWarnings).toHaveLength(0);
  });
});
