# Slack Channel Archiver

[![CI](https://github.com/h13/apps-script-slack-channel-archiver/actions/workflows/ci.yml/badge.svg)](https://github.com/h13/apps-script-slack-channel-archiver/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/h13/apps-script-slack-channel-archiver/blob/main/LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D24-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)
[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4.svg)](https://developers.google.com/apps-script)

[English](README.md)

**非アクティブな Slack チャンネルを自動アーカイブ — private チャンネルにも対応。** 閾値は設定可能（デフォルト: 95日で警告、5日の猶予後にアーカイブ）。

[apps-script-fleet](https://github.com/h13/apps-script-fleet) テンプレートから生成。[100日後にアーカイブされるSlackチャネル](https://konifar.hatenablog.com/entry/2021/11/20/145833) にインスパイアされ、private チャンネル対応を追加。

## 仕組み

```
トリガー → 全チャンネル取得（public + private）
              → Bot が public チャンネルに自動参加
              → スプレッドシートにスナップショット保存
              → チャンネル分類:
                  • 非アクティブ ≥ WARNING_THRESHOLD_DAYS → 警告リスト + Slack 通知
                  • 警告 ≥ GRACE_PERIOD_DAYS            → アーカイブ + Slack 通知
                  • 再びアクティブに       → 警告リストから除去
```

## Apps Script プロジェクト

| 環境 | リンク |
|------|--------|
| dev | [slack-channel-archiver-dev](https://script.google.com/d/1esjLNfXKGlfG6SLY1bibN6a39-cty4pKXyABycRJozDnK6JN8FXcP23o/edit) |
| prod | [slack-channel-archiver-prod](https://script.google.com/d/19lVnm0g3_RTPd5CFsfwAkvqVGy1i3Qo3dJ3GEGdRkX4OQCZH9LAZhlcv/edit) |

## クイックスタート

### 1. Slack Bot の作成

[api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From an app manifest** → [`slack-app-manifest.yml`](slack-app-manifest.yml) を貼り付け → ワークスペースにインストール。

### 2. Script Property の設定

Apps Script エディタ: プロジェクトの設定（歯車アイコン）→ スクリプト プロパティ → `SPREADSHEET_ID` を追加。

### 3. スプレッドシートの初期化

Apps Script エディタで `initSpreadsheet` を選択して ▶ 実行。必要なシートと `settings` シート（デフォルト値入り）が自動作成される。初回は OAuth 承認が必要。

### 4. 設定値の入力

スプレッドシートの `settings` シートを開いて記入:

| key | value | 必須 |
|-----|-------|------|
| `SLACK_BOT_TOKEN` | Bot User OAuth Token (`xoxb-...`) | はい |
| `NOTIFY_CHANNEL_ID` | Slack 通知先チャンネル ID（`C01234567` 形式） | はい |
| `WARNING_THRESHOLD_DAYS` | 非アクティブ警告までの日数 | いいえ（デフォルト: `95`） |
| `GRACE_PERIOD_DAYS` | 警告からアーカイブまでの猶予日数 | いいえ（デフォルト: `5`） |
| `TRIGGER_INTERVAL` | `hourly`, `daily`, `weekly` | いいえ（デフォルト: `daily`） |
| `TRIGGER_HOUR` | `0`〜`23` | いいえ（デフォルト: `9`） |

### 5. トリガーの設定

Apps Script エディタで `setupTrigger` を選択して ▶ 実行。`settings` シートからスケジュールを読み込む。初回は `script.scriptapp` スコープの承認が必要。

## プロジェクト構成

```
src/
├── index.ts            # GAS エントリポイント（archiveInactiveChannels, setupTrigger, initSpreadsheet）
├── config.ts           # 型定義・インターフェース・デフォルト定数（WARNING=95日, GRACE=5日）
├── channel-service.ts  # チャンネル分類ロジック（純粋関数）
├── notifier.ts         # Slack 通知メッセージ組み立て（純粋関数）
├── slack-client.ts     # Slack API ラッパー（ステートレス、token は引数で受け取り）
└── sheet-store.ts      # スプレッドシート読み書き + 設定ローダー
test/
├── channel-service.test.ts
└── notifier.test.ts
```

## 開発

| コマンド | 説明 |
|---------|------|
| `pnpm run check` | lint + typecheck + test（全チェック） |
| `pnpm run build` | TypeScript をバンドルして `dist/` に出力 |
| `pnpm run test` | Jest（カバレッジ付き） |
| `pnpm run test -- --watch` | Jest ウォッチモード |
| `pnpm run deploy` | check → build → dev にデプロイ |
| `pnpm run deploy:prod` | check → build → 本番にデプロイ |

## CI/CD

CI は全 push と PR で実行。CD は `dev` または `main` へのマージで自動デプロイ — GitHub Actions の environment 別 secrets/variables で設定済み。詳細は [apps-script-fleet のドキュメント](https://github.com/h13/apps-script-fleet#cicd-パイプライン)を参照。

## 元記事との違い

| 機能 | 元記事 | 本プロジェクト |
|------|--------|----------------|
| private チャンネル | 非対応 | `conversations.list` に `types=public_channel,private_channel` で対応 |
| 自動参加 | 手動で `/invite` | Bot が `conversations.join` で public チャンネルに自動参加 |
| 再アクティブ化検知 | 言及なし | 投稿があったチャンネルは警告リストから自動除去 |
| 通知フォーマット | 基本的 | private チャンネルに :lock: アイコン表示 |
| 設定管理 | ハードコード | スプレッドシート `settings` シート（コード変更不要で設定変更可） |

## 注意事項

- `src/index.ts` の関数に `export` キーワードは付けない（GAS ランタイムは ES モジュール構文を認識できない）
- `src/index.ts`, `src/slack-client.ts`, `src/sheet-store.ts` はテストカバレッジ対象外（GAS グローバルが Node.js で実行不可のため）
- カバレッジ閾値: 全メトリクス 80%（`jest.config.json` で変更可）
- `SPREADSHEET_ID` のみ Script Properties に保存。他の全設定はスプレッドシートの `settings` シートで管理

## ライセンス

[MIT](LICENSE)
