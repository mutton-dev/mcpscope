# mcpscope

> Terminal-first MCP server debugger / inspector TUI

MCP サーバーの **tools · resources · prompts** をターミナル上でブラウズし、ツールを即座に invoke してレスポンスと trace を確認できるインスペクターです。

```
mcpscope node ./my-server.js
```

```
mcpscope — node ./my-server.js
[TOOLS]  resources  prompts   Tab: switch · ↑↓: nav · Enter: invoke · q: quit

┌──────────────────────┐┌───────────────────────────────────────────────┐
│ tools                ││ Result                                        │
│ > time               ││ [                                             │
│   echo               ││   { "type": "text", "text": "2026-04-30T..." }│
│   add                ││ ]                                             │
│   slow               ││                                               │
│   fail               ││ Trace                                         │
│                      ││ request: {"name":"time","arguments":{}}       │
│                      ││ response: {"content":[...]}                   │
│                      ││ duration: 4ms                                 │
└──────────────────────┘└───────────────────────────────────────────────┘
```

---

## インストール

```bash
npm install -g mcpscope
```

または npx で使い捨て実行:

```bash
npx mcpscope node ./my-server.js
```

---

## 使い方

```bash
mcpscope <command> [args...]
```

| 例 | 説明 |
|----|------|
| `mcpscope node dist/server.js` | Node.js MCP サーバーを起動して接続 |
| `mcpscope npx @modelcontextprotocol/server-filesystem /tmp` | npm パッケージのサーバーを直接検査 |
| `mcpscope python server.py` | Python MCP サーバーに接続 |
| `mcpscope --help` | ヘルプを表示 |
| `mcpscope --version` | バージョンを表示 |

---

## キーバインド

| キー | 動作 |
|------|------|
| `Tab` | tools → resources → prompts タブを切替 |
| `↑` / `↓` | リスト内でカーソル移動 |
| `Enter` | ツールを invoke（引数なしなら即実行、引数ありなら JSON 入力モードへ） |
| `Esc` | JSON 入力モードをキャンセル |
| `q` | 終了 |

---

## 画面構成

```
mcpscope — <server command>
[TOOLS]  resources  prompts          ← タブバー（現在のタブは [ ] で囲まれる）

┌─────────────────────┐┌────────────────────────────────────────┐
│ リストペイン         ││ 結果ペイン                              │
│ > selected-item     ││ Result                                  │
│   other-item        ││ [ { "type": "text", "text": "..." } ]  │
│                     ││                                         │
│                     ││ Trace                                   │
│                     ││ request:  { ... }                       │
│                     ││ response: { ... }                       │
│                     ││ duration: 12ms                          │
└─────────────────────┘└────────────────────────────────────────┘
```

- **リストペイン**: tools / resources / prompts の一覧。`>` が現在のカーソル位置。
- **結果ペイン**: 最後の invoke 結果と trace（request・response・所要時間）を表示。

### JSON args 入力モード

引数スキーマに `properties` が存在するツールを `Enter` で選択すると入力モードに切替わります。

```
JSON args (Enter to invoke, Esc cancel):
{"text":"hello"}
```

JSON として parse できない入力はエラーメッセージを表示します。

---

## ユースケース

### 開発中サーバーの動作確認

MCP サーバーを書いたら、ビルド → CLI テストを繰り返す前にまず mcpscope で手動 invoke して期待通りの response が返るか確認できます。

```bash
# ts-node で直接繋いで開発サイクルを短縮
mcpscope npx ts-node src/my-server.ts
```

### 公開パッケージの調査

npm に公開されている MCP サーバーを Claude Code に登録する前に構造を確認できます。

```bash
mcpscope npx @modelcontextprotocol/server-brave-search
# → tools タブで提供 API を確認
# → invoke して実際の response を検証
```

### Trace によるデバッグ

invoke 後の結果ペインに表示される Trace は:

- `request` — クライアントが送信した `tools/call` ペイロード
- `response` — サーバーが返した生のレスポンス
- `duration` — ラウンドトリップ時間（ms）

レスポンス形式の不備や遅延の原因特定に使えます。

---

## 動作要件

- Node.js 20+

---

## 開発

```bash
git clone https://github.com/mutton-dev/mcpscope
cd mcpscope
npm install
npm run dev        # watch ビルド
npm test           # vitest
npm run typecheck  # tsc --noEmit
```

### テスト用サーバー

リポジトリに `test-server.mjs` が同梱されています。

```bash
node dist/index.js node test-server.mjs
```

tools 5 件（`time` / `echo` / `add` / `slow` / `fail`）、resources 2 件、prompts 2 件を提供します。

---

## ライセンス

MIT — [Mutton's AI Lab](https://mutton.dev/lab)
