# Slack Channel Archiver

[![CI](https://github.com/h13/apps-script-slack-channel-archiver/actions/workflows/ci.yml/badge.svg)](https://github.com/h13/apps-script-slack-channel-archiver/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/h13/apps-script-slack-channel-archiver/blob/main/LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D24-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)
[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4.svg)](https://developers.google.com/apps-script)

[日本語](README.ja.md)

**Auto-archive inactive Slack channels — including private channels.** Configurable thresholds (default: 95-day warning + 5-day grace period).

Built from [apps-script-fleet](https://github.com/h13/apps-script-fleet) template. Inspired by [100日後にアーカイブされるSlackチャネル](https://konifar.hatenablog.com/entry/2021/11/20/145833), extended with private channel support.

## How It Works

```
Trigger → Fetch all channels (public + private)
              → Auto-join public channels (Bot)
              → Save snapshot to Spreadsheet
              → Classify channels:
                  • Inactive ≥ WARNING_THRESHOLD_DAYS → Warning list + Slack notification
                  • Warning ≥ GRACE_PERIOD_DAYS      → Archive + Slack notification
                  • Became active     → Remove from warning list
```

## Apps Script Projects

| Environment | Link                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| dev         | [slack-channel-archiver-dev](https://script.google.com/d/1esjLNfXKGlfG6SLY1bibN6a39-cty4pKXyABycRJozDnK6JN8FXcP23o/edit)  |
| prod        | [slack-channel-archiver-prod](https://script.google.com/d/19lVnm0g3_RTPd5CFsfwAkvqVGy1i3Qo3dJ3GEGdRkX4OQCZH9LAZhlcv/edit) |

## Quick Start

### 1. Create a Slack Bot

Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From an app manifest** → paste [`slack-app-manifest.yml`](slack-app-manifest.yml) → Install to Workspace.

### 2. Set Script Properties

In the Apps Script editor: Project Settings (gear icon) → Script Properties → add:

| key               | value                                                             |
| ----------------- | ----------------------------------------------------------------- |
| `SPREADSHEET_ID`  | ID of the Spreadsheet used as the data store                      |
| `SLACK_BOT_TOKEN` | Bot User OAuth Token (`xoxb-...`) from the app installed in step 1 |

The token lives in Script Properties — not in the Spreadsheet — so that people who can view the Spreadsheet cannot read it. Script Properties are only visible to editors of this Apps Script project.

### 3. Initialize Spreadsheet

Run `initSpreadsheet` in the Apps Script editor (▶). Creates the required sheets and a `settings` sheet with default values. First run requires OAuth authorization.

### 4. Fill in Settings

Open the Spreadsheet → `settings` sheet → fill in:

| key                      | value                                 | required              |
| ------------------------ | ------------------------------------- | --------------------- |
| `NOTIFY_CHANNEL_ID`      | Slack channel ID (`C01234567` format) | yes                   |
| `WARNING_THRESHOLD_DAYS` | Days of inactivity before warning     | no (default: `95`)    |
| `GRACE_PERIOD_DAYS`      | Days between warning and archive      | no (default: `5`)     |
| `TRIGGER_INTERVAL`       | `hourly`, `daily`, `weekly`           | no (default: `daily`) |
| `TRIGGER_HOUR`           | `0`–`23`                              | no (default: `9`)     |

### 5. Set Up Trigger

Run `setupTrigger` in the Apps Script editor (▶). Reads the schedule from the `settings` sheet. First run requires `script.scriptapp` scope authorization.

## Project Structure

```
src/
├── index.ts            # GAS entry points (archiveInactiveChannels, setupTrigger, initSpreadsheet)
├── config.ts           # Types, interfaces & default constants (WARNING=95d, GRACE=5d)
├── channel-service.ts  # Channel classification logic (pure functions)
├── notifier.ts         # Slack notification message builder (pure functions)
├── slack-client.ts     # Slack API wrapper (stateless, token passed as argument)
└── sheet-store.ts      # Spreadsheet read/write + settings loader
test/
├── channel-service.test.ts
└── notifier.test.ts
```

## Development

| Command                    | Description                             |
| -------------------------- | --------------------------------------- |
| `pnpm run check`           | lint + typecheck + test (all checks)    |
| `pnpm run build`           | Bundle TypeScript and output to `dist/` |
| `pnpm run test`            | Jest with coverage                      |
| `pnpm run test -- --watch` | Jest watch mode                         |
| `pnpm run deploy`          | check → build → deploy to dev           |
| `pnpm run deploy:prod`     | check → build → deploy to production    |

## CI/CD

CI runs on every push and PR. CD deploys on merge to `dev` or `main` — configured via GitHub Actions secrets/variables per environment. See [apps-script-fleet docs](https://github.com/h13/apps-script-fleet#cicd-pipeline) for details.

## Differences from the Original Blog Post

| Feature          | Original         | This Project                                                                   |
| ---------------- | ---------------- | ------------------------------------------------------------------------------ |
| Private channels | Not supported    | Supported via `conversations.list` with `types=public_channel,private_channel` |
| Auto-join        | Manual `/invite` | Bot auto-joins public channels via `conversations.join`                        |
| Reactivation     | Not mentioned    | Channels with new activity are removed from warning list                       |
| Notification     | Basic            | Private channels marked with :lock: icon                                       |
| Configuration    | Hardcoded        | Spreadsheet `settings` sheet (editable without code changes)                   |

## Private Channel Coverage

The bot can only see private channels it is a member of. It auto-joins public channels, but **someone has to invite it to each private channel**. To bulk-invite the bot to every private channel you belong to, use the companion tool [apps-script-slack-bot-inviter](https://github.com/h13/apps-script-slack-bot-inviter).

## Migrating from Older Versions

Earlier versions stored `SLACK_BOT_TOKEN` in the Spreadsheet `settings` sheet. To migrate:

1. Add `SLACK_BOT_TOKEN` to Script Properties (Project Settings → Script Properties)
2. Delete the `SLACK_BOT_TOKEN` row from the `settings` sheet
3. Deploy the new code (`pnpm run deploy:prod` or merge to `main`)

## Notes

- Functions in `src/index.ts` must not have the `export` keyword — the GAS runtime does not support ES module syntax
- `src/index.ts`, `src/slack-client.ts`, `src/sheet-store.ts` are excluded from test coverage (GAS globals cannot run in Node.js)
- Coverage threshold: 80% for all metrics (configurable in `jest.config.json`)
- Secrets (`SLACK_BOT_TOKEN`) and `SPREADSHEET_ID` live in Script Properties; tunable settings live in the Spreadsheet `settings` sheet so they can be adjusted without code access

## License

[MIT](LICENSE)
