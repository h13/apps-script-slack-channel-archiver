import type { SlackChannel } from "./config.js";

function getToken(): string {
  const token =
    PropertiesService.getScriptProperties().getProperty("SLACK_BOT_TOKEN");
  if (token === null) {
    throw new Error("SLACK_BOT_TOKEN is not set in Script Properties");
  }
  return token;
}

function slackApi<T>(
  endpoint: string,
  params: Record<string, string> = {},
  method: "get" | "post" = "get",
): T {
  const token = getToken();

  const fetchOptions: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    headers: { Authorization: `Bearer ${token}` },
    muteHttpExceptions: true,
  };

  let url: string;
  if (method === "post") {
    url = `https://slack.com/api/${endpoint}`;
    fetchOptions.method = "post";
    fetchOptions.contentType = "application/json";
    fetchOptions.payload = JSON.stringify(params);
  } else {
    const query = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");
    url = `https://slack.com/api/${endpoint}${query ? `?${query}` : ""}`;
  }

  const response = UrlFetchApp.fetch(url, fetchOptions);

  const json = JSON.parse(response.getContentText()) as {
    ok: boolean;
    error?: string;
  } & T;

  if (!json.ok) {
    throw new Error(
      `Slack API error (${endpoint}): ${json.error ?? "unknown"}`,
    );
  }

  return json;
}

interface ConversationsListResponse {
  readonly channels: readonly {
    readonly id: string;
    readonly name: string;
    readonly is_private: boolean;
    readonly is_archived: boolean;
  }[];
  readonly response_metadata?: {
    readonly next_cursor?: string;
  };
}

interface ConversationsHistoryResponse {
  readonly messages: readonly {
    readonly ts: string;
  }[];
}

export function fetchAllChannels(): readonly SlackChannel[] {
  const allChannels: SlackChannel[] = [];
  let cursor = "";

  do {
    const params: Record<string, string> = {
      types: "public_channel,private_channel",
      exclude_archived: "true",
      limit: "200",
    };
    if (cursor !== "") {
      params["cursor"] = cursor;
    }

    const response = slackApi<ConversationsListResponse>(
      "conversations.list",
      params,
    );

    for (const ch of response.channels) {
      if (ch.is_archived) {
        continue;
      }

      if (!ch.is_private) {
        joinChannel(ch.id);
      }

      const lastActivityTs = getLastActivityTs(ch.id);

      allChannels.push({
        id: ch.id,
        name: ch.name,
        isPrivate: ch.is_private,
        lastActivityTs,
      });
    }

    cursor = response.response_metadata?.next_cursor ?? "";
    if (cursor !== "") {
      Utilities.sleep(1200);
    }
  } while (cursor !== "");

  return allChannels;
}

function joinChannel(channelId: string): void {
  try {
    slackApi("conversations.join", { channel: channelId }, "post");
  } catch {
    // Already a member or cannot join — safe to ignore
  }
}

function getLastActivityTs(channelId: string): number {
  try {
    const response = slackApi<ConversationsHistoryResponse>(
      "conversations.history",
      { channel: channelId, limit: "1" },
    );

    const firstMessage = response.messages[0];
    if (firstMessage !== undefined) {
      return parseFloat(firstMessage.ts);
    }
  } catch {
    // Bot may not be in the channel yet — treat as very old
  }

  return 0;
}

export function archiveChannel(channelId: string): void {
  slackApi("conversations.archive", { channel: channelId }, "post");
}

export function postMessage(channel: string, text: string): void {
  const token = getToken();

  UrlFetchApp.fetch("https://slack.com/api/chat.postMessage", {
    method: "post",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    payload: JSON.stringify({ channel, text }),
    muteHttpExceptions: true,
  });
}
