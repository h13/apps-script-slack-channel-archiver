# Slack Channel Archiver

[![CI](https://github.com/h13/apps-script-slack-channel-archiver/actions/workflows/ci.yml/badge.svg)](https://github.com/h13/apps-script-slack-channel-archiver/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/h13/apps-script-slack-channel-archiver/blob/main/LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D24-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)
[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4.svg)](https://developers.google.com/apps-script)

[English](README.md)

**100日間非アクティブな Slack チャンネルを自動アーカイブ — private チャンネルにも対応。**

[apps-script-fleet](https://github.com/h13/apps-script-fleet) テンプレートから生成。[100日後にアーカイブされるSlackチャネル](https://konifar.hatenablog.com/entry/2021/11/20/145833) にインスパイアされ、private チャンネル対応を追加。

## 仕組み

```
毎日のトリガー → 全チャンネル取得（public + private）
                    → スプレッドシートにスナップショット保存
                    → チャンネル分類:
                        • 95日以上非アクティブ → 警告リストに追加、Slack 通知
                        • 警告から5日以上経過 → アーカイブ実行、Slack 通知
                        • 再びアクティブに → 警告リストから除去
```

## GAS プロジェクト

| 環境 | リンク |
|------|--------|
| dev | [slack-channel-archiver-dev](https://script.google.com/d/1esjLNfXKGlfG6SLY1bibN6a39-cty4pKXyABycRJozDnK6JN8FXcP23o/edit) |
| prod | [slack-channel-archiver-prod](https://script.google.com/d/19lVnm0g3_RTPd5CFsfwAkvqVGy1i3Qo3dJ3GEGdRkX4OQCZH9LAZhlcv/edit) |

## プロジェクト構成

```
src/
├── index.ts            # GAS エントリポイント: archiveInactiveChannels()
├── config.ts           # 型定義 & 定数（WARNING=95日, GRACE=5日）
├── channel-service.ts  # チャンネル分類ロジック（純粋関数）
├── notifier.ts         # Slack 通知メッセージ組み立て（純粋関数）
├── slack-client.ts     # Slack API ラッパー（UrlFetchApp）
└── sheet-store.ts      # スプレッドシート読み書き（SpreadsheetApp）
test/
├── channel-service.test.ts  # 15 テストケース
└── notifier.test.ts         # 6 テストケース
```

## セットアップ

### 1. Slack Bot の作成

[api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From an app manifest** → [`slack-app-manifest.yml`](slack-app-manifest.yml) を貼り付け → ワークスペースにインストール。

### 2. Script Properties の設定

Apps Script エディタ: プロジェクトの設定（歯車アイコン）→ スクリプト プロパティ → 以下を追加:

| プロパティ | 値 |
|------------|------|
| `SLACK_BOT_TOKEN` | Step 1 で取得した Bot User OAuth Token (`xoxb-...`) |
| `SPREADSHEET_ID` | Google スプレッドシートの ID（新規作成 or 既存） |
| `NOTIFY_CHANNEL_ID` | Slack 通知先チャンネル ID（`C01234567` 形式） |
| `WARNING_THRESHOLD_DAYS` | 非アクティブ警告までの日数（デフォルト: `95`） |
| `GRACE_PERIOD_DAYS` | 警告からアーカイブまでの猶予日数（デフォルト: `5`） |

### 3. スプレッドシートの初期化

Apps Script エディタで `initSpreadsheet` を選択して ▶ 実行。必要なシート（`channels`, `archive_warnings`, `exclude_channels`）とヘッダーが自動作成される。初回は OAuth 承認が必要。

### 4. トリガーの設定

Script Properties でスケジュールを設定（任意）:

| プロパティ | 値 | デフォルト |
|------------|------|-----------|
| `TRIGGER_INTERVAL` | `hourly`, `daily`, `weekly` | `daily` |
| `TRIGGER_HOUR` | `0`〜`23` | `9` |

Apps Script エディタで `setupTrigger` を選択して ▶ 実行。初回は `script.scriptapp` スコープの承認が必要。

## 開発

```bash
pnpm install
pnpm run check    # lint + typecheck + test
pnpm run build    # dist/ にバンドル
pnpm run deploy   # check → build → dev に push
```

## 元記事との違い

| 機能 | 元記事 | 本プロジェクト |
|------|--------|----------------|
| private チャンネル | 非対応 | 対応（`conversations.list` に `types=public_channel,private_channel`） |
| 再アクティブ化検知 | 言及なし | 投稿があったチャンネルは警告リストから自動除去 |
| 通知フォーマット | 基本的 | private チャンネルに :lock: アイコン表示 |
| 状態管理 | スプレッドシート | スプレッドシート（同パターン、スキーマ拡張） |

## ライセンス

[MIT](LICENSE)
