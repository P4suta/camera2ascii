# camera2ascii

Webカメラの映像をリアルタイムでASCIIアートに変換するブラウザアプリ。
外部ランタイム依存ゼロ。

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
```

## Architecture

- `src/main.ts` — エントリポイント、レンダーループ、アプリ構築
- `src/camera.ts` — getUserMedia によるWebcamキャプチャ
- `src/converter.ts` — ピクセル→ASCII変換 (輝度計算、文字マッピング)
- `src/renderer.ts` — AsciiFrame の DOM 描画
- `src/controls.ts` — UIコントロールパネル
- `src/types.ts` — AppState, AsciiFrame 等の型定義
- `src/dom.ts` — 型安全なDOM要素作成ユーティリティ
- `src/styles.ts` — CSS注入
- `src/assert.ts` — 契約アサーション関数

## Conventions

- 外部ランタイム依存ゼロ (devDependenciesのみ許可)
- 全DOM構築はTypeScriptで行う (フレームワーク不使用)
- Biome: タブインデント、行幅100文字
- TDD: テストを先に書いてから実装
- テストファイルは `src/__tests__/` に配置
