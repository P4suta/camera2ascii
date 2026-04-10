# camera2ascii

Webカメラの映像をリアルタイムでASCIIアートに変換するブラウザアプリ。
外部ランタイム依存ゼロ。Canvas描画。UIなし。即時起動。

## Tech Stack

- TypeScript (strict), Bun (bundler/test runner), Biome (linter/formatter)
- GitHub Pagesで静的サイトとしてデプロイ

## Commands

```bash
bun install              # 依存関係インストール
bun run dev              # 開発ビルド (watch mode)
bun run build            # プロダクションビルド (dist/)
bun test                 # テスト実行
bun test --coverage      # カバレッジ付きテスト
bun run lint             # Biome lint
bun run format           # Biome format
bun run check            # lint + 型チェック
bun run generate:charmap # Unicode密度ランプ再生成
```

## Architecture

- `src/main.ts` — エントリポイント、即時起動、レンダーループ、リサイズ対応
- `src/camera.ts` — getUserMedia によるWebcamキャプチャ
- `src/converter.ts` — ピクセル→文字変換 (257レベルUnicode密度ランプ)
- `src/renderer.ts` — Canvas fillText() 描画
- `src/types.ts` — AppState, AsciiFrame 型定義
- `src/styles.ts` — CSS注入 (全画面Canvas + 起動/エラー表示)
- `src/assert.ts` — 契約アサーション関数
- `src/generated/charmap.ts` — ビルド時生成のUnicode密度ランプ
- `scripts/generate-charmap.ts` — 文字密度解析スクリプト

## Conventions

- 外部ランタイム依存ゼロ (devDependenciesのみ許可)
- UIコントロールなし。全パラメータは自動決定
- Canvas描画（DOM textContent/innerHTML は使わない）
- Biome: タブインデント、行幅100文字
- TDD: テストを先に書いてから実装
- テストファイルは `src/__tests__/` に配置

## Design

設計思想は DESIGN.md を参照。
