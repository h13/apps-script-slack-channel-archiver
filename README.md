# Slack Channel Archiver

[![CI](https://github.com/h13/apps-script-slack-channel-archiver/actions/workflows/ci.yml/badge.svg)](https://github.com/h13/apps-script-slack-channel-archiver/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/h13/apps-script-slack-channel-archiver/blob/main/LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D24-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)
[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4.svg)](https://developers.google.com/apps-script)

[日本語](README.ja.md)

**Auto-archive Slack channels inactive for 100 days — including private channels.**

Built from [apps-script-fleet](https://github.com/h13/apps-script-fleet) template. Inspired by [100日後にアーカイブされるSlackチャネル](https://konifar.hatenablog.com/entry/2021/11/20/145833), extended with private channel support.

## How It Works

```
Daily trigger → Fetch all channels (public + private)
                    → Save snapshot to Spreadsheet
                    → Classify channels:
                        • 95+ days inactive → Add to warning list, notify Slack
                        • On warning list 5+ days → Archive, notify Slack
                        • Became active again → Remove from warning list
```

## GAS Projects

| Environment | Link |
|-------------|------|
| dev | [slack-channel-archiver-dev](https://script.google.com/d/1esjLNfXKGlfG6SLY1bibN6a39-cty4pKXyABycRJozDnK6JN8FXcP23o/edit) |
| prod | [slack-channel-archiver-prod](https://script.google.com/d/19lVnm0g3_RTPd5CFsfwAkvqVGy1i3Qo3dJ3GEGdRkX4OQCZH9LAZhlcv/edit) |

## Project Structure

```
src/
├── index.ts            # GAS entry point: runDaily()
├── config.ts           # Types & constants (WARNING=95d, GRACE=5d)
├── channel-service.ts  # Channel classification logic (pure functions)
├── notifier.ts         # Slack notification message builder (pure functions)
├── slack-client.ts     # Slack API wrapper (UrlFetchApp)
└── sheet-store.ts      # Spreadsheet read/write (SpreadsheetApp)
test/
├── channel-service.test.ts  # 15 test cases
└── notifier.test.ts         # 6 test cases
```

## Setup

### 1. Create a Slack Bot

Required scopes:

| Scope | Purpose |
|-------|---------|
| `channels:read` | List public channels |
| `groups:read` | List private channels |
| `channels:history` | Read last message timestamp (public) |
| `groups:history` | Read last message timestamp (private) |
| `channels:manage` | Archive public channels |
| `groups:write` | Archive private channels |
| `chat:write` | Post notifications |

### 2. Create a Google Spreadsheet

Add an `exclude_channels` sheet with channel names to skip (one per row, with a header row).

### 3. Configure Script Properties

| Property | Value |
|----------|-------|
| `SLACK_BOT_TOKEN` | Bot User OAuth Token (`xoxb-...`) |
| `SPREADSHEET_ID` | Google Spreadsheet ID |
| `NOTIFY_CHANNEL` | Notification channel (default: `#general`) |

### 4. Set Up a Time Trigger

In the Apps Script editor: Triggers → Add Trigger → `runDaily` → Time-driven → Day timer.

## Development

```bash
pnpm install
pnpm run check    # lint + typecheck + test
pnpm run build    # bundle to dist/
pnpm run deploy   # check → build → push to dev
```

## Differences from the Original Blog Post

| Feature | Original | This Project |
|---------|----------|-------------|
| Private channels | Not supported | Supported (`conversations.list` with `types=public_channel,private_channel`) |
| Reactivation detection | Not mentioned | Channels with new activity are removed from warning list |
| Notification format | Basic | Private channels marked with :lock: icon |
| State management | Spreadsheet | Spreadsheet (same pattern, extended schema) |

## License

[MIT](LICENSE)
