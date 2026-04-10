# DESIGN.md — camera2ascii 設計ドキュメント

## 概要

Webカメラの映像をリアルタイムでASCIIアートに変換し、ブラウザ上に表示するアプリケーション。
外部ランタイム依存ゼロで、純粋なブラウザAPIのみで実装。

## 設計方針

### 外部依存ゼロ

ランタイムにおける外部ライブラリの使用を一切禁止する。
Canvas API、getUserMedia、requestAnimationFrame 等のブラウザ標準APIのみで構築。
これにより、バンドルサイズの最小化とセキュリティリスクの排除を達成。

### モジュラー設計

責務ごとに明確に分離されたモジュール構成:

```
camera.ts    → Webcamストリーム管理
converter.ts → ピクセルデータ → ASCII変換
renderer.ts  → AsciiFrame → DOM描画
controls.ts  → UI操作
main.ts      → アプリケーション統合
```

各モジュールは独立してテスト可能。

## 主要アルゴリズム

### 輝度計算

ITU-R BT.601 規格の輝度係数を使用:

```
Y = 0.299R + 0.587G + 0.114B
```

人間の視覚感度に合わせた重み付け（緑 > 赤 > 青）。

### ASCII文字マッピング

文字ランプ（視覚的密度順）をインデックスで参照:

```
standard: @%#*+=-:. (空白)
blocks:   █▓▒░ (空白)
```

ダークバックグラウンド向けに反転マッピング:
- 明るいピクセル → 密な文字（@等） → 画面上で明るく見える
- 暗いピクセル → 疎な文字（空白） → 画面上で暗く見える

```typescript
index = floor(((255 - brightness) / 255) * (ramp.length - 1))
```

### フレーム処理パイプライン

```
getUserMedia → HTMLVideoElement → OffscreenCanvas (drawImage)
  → getImageData (ダウンサンプリング)
  → 輝度計算 + 文字マッピング
  → DOM描画 (textContent or innerHTML)
```

オフスクリーンCanvasのサイズをASCIIグリッドのサイズに合わせることで、
ブラウザ内蔵の補間アルゴリズムによるダウンサンプリングを利用。

### レンダリング戦略

- **モノクロモード**: `pre.textContent = str`
  - 単一DOM変更で高速
  - 文字列結合のみ
- **カラーモード**: `pre.innerHTML = spans`
  - 各文字を `<span style="color:rgb(r,g,b)">` でラップ
  - 特殊文字のHTMLエスケープ対応

### FPS制御

`requestAnimationFrame` ループ内でタイムスタンプベースのスロットリング:

```typescript
const interval = 1000 / targetFps;
if (elapsed >= interval) {
  // フレーム処理
  lastFrameTime = now - (elapsed % interval);  // ドリフト補正
}
```

### アスペクト比補正

文字は縦が横の約2倍の大きさのため、高さに0.5の補正係数を適用:

```typescript
height = width * (videoHeight / videoWidth) * 0.5
```

## UI設計

### レイアウト

- Flexbox: ASCII出力（左/メイン） + コントロール（右/260px）
- モバイル（768px以下）: コントロールが下部に折り返し

### テーマ

GitHub Dark風:
- 背景: `#0d1117`
- テキスト: `#c9d1d9`
- ASCII背景: `#000`
- コントロール: `#161b22`
- アクセント: `#238636`

## エラーハンドリング

| エラー | DOMException.name | ユーザーメッセージ |
|--------|-------------------|-------------------|
| カメラ拒否 | NotAllowedError | カメラアクセスが拒否されました |
| カメラなし | NotFoundError | カメラが検出されません |
| カメラ使用中 | NotReadableError | カメラが他のアプリで使用中です |

## ビルド・デプロイ

### Bun Bundler

```bash
bun build ./src/main.ts --outdir ./dist --target browser --minify
```

エントリポイント1つからバンドルを生成。tree-shakingとminifyが自動適用。

### GitHub Pages

GitHub Actions で `main` ブランチへのpush時に自動デプロイ:
1. `bun install` + `bun run build`
2. ルートディレクトリ（index.html + dist/）をアーティファクトとしてアップロード
3. `actions/deploy-pages` でデプロイ
