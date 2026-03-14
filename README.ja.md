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

### 2. Google スプレッドシートの作成

`exclude_channels` シートを作成し、除外するチャンネル名を記入（1行1チャンネル、ヘッダー行あり）。

### 3. Script Properties の設定

| プロパティ | 値 |
|------------|------|
| `SLACK_BOT_TOKEN` | Bot User OAuth Token (`xoxb-...`) |
| `SPREADSHEET_ID` | Google スプレッドシートの ID |
| `NOTIFY_CHANNEL_ID` | 通知先チャンネル ID（`C01234567` 形式） |

### 4. 時間トリガーの設定

Apps Script エディタ: トリガー → トリガーを追加 → `archiveInactiveChannels` → 時間主導型 → 日付ベースのタイマー。

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
