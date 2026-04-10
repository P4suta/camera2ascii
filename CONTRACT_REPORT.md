# Design by Contract レポート

## 概要

`src/assert.ts` に定義された契約関数（`precondition`, `postcondition`, `assertInRange`, `assertPositive`, `assertNonEmpty`）を各モジュールの公開関数に埋め込んだ。プロダクションロジックは一切変更していない。

## モジュール別の契約一覧

### src/converter.ts

| 関数 | 種別 | 契約内容 |
|------|------|----------|
| `brightness(r,g,b)` | 事前条件 | `assertInRange(r, 0, 255)`, `assertInRange(g, 0, 255)`, `assertInRange(b, 0, 255)` |
| `brightness(r,g,b)` | 事後条件 | `assertInRange(result, 0, 255)` — 戻り値が 0-255 の範囲内 |
| `brightnessToChar(b, ramp)` | 事前条件 | `assertInRange(b, 0, 255)`, `assertNonEmpty(ramp)` |
| `brightnessToChar(b, ramp)` | 事後条件 | `postcondition(ramp.includes(result))` — 戻り値が ramp 内の文字 |
| `imageDataToAscii(imageData, ramp, colorMode)` | 事前条件 | `assertNonEmpty(ramp)` |
| `imageDataToAscii(imageData, ramp, colorMode)` | 事後条件 | `postcondition(chars.length === totalPixels)` — 出力文字数がピクセル数と一致 |

### src/camera.ts

| 関数 | 種別 | 契約内容 |
|------|------|----------|
| `captureFrame(video, ctx, width, height, flip)` | 事前条件 | `assertPositive(width)`, `assertPositive(height)` |

### src/renderer.ts

| 関数 | 種別 | 契約内容 |
|------|------|----------|
| `createOutputElement()` | 事後条件 | `postcondition(pre.tagName === "PRE")` |
| `renderFrame(output, frame, width, colorMode)` | 事前条件 | `assertNonEmpty(frame.chars)`, `assertPositive(width)` |

### src/dom.ts

| 関数 | 種別 | 契約内容 |
|------|------|----------|
| `el(tag, attrs?, children?)` | 事後条件 | `postcondition(element.tagName === tag.toUpperCase())` — 生成要素のタグ名が引数と一致 |

### src/main.ts

| 関数 | 種別 | 契約内容 |
|------|------|----------|
| `processFrame(state, video, ctx, canvas, output)` | 事前条件 | `assertPositive(state.width)`, `assertPositive(state.height)` |

### src/types.ts

| 関数 | 種別 | 契約内容 |
|------|------|----------|
| `createDefaultState()` | 不変条件 | `assertPositive(width)`, `assertPositive(height)`, `assertPositive(targetFps)`, `assertPositive(fontSize)`, `postcondition(currentFps >= 0)` |

### 変更なしのモジュール

- **src/styles.ts** — `injectStyles()` は DOM への副作用のみで、数値制約や戻り値の検証が不要
- **src/controls.ts** — UI コントロール生成関数群。内部で `el()` を使用しており、`el()` の契約で間接的にカバーされる

## テスト結果

全 103 テストが通過（8 ファイル、168 expect 呼び出し）。契約の追加によるテスト失敗なし。

## 発見事項

- **バグの発見はなし** — 既存コードは全ての契約条件を満たしていた
- `imageDataToAscii` の `rampLen === 0` ガード（1文字 ramp の場合）は正しく動作しており、`assertNonEmpty` との整合性も問題なし
- `processFrame` は `CHAR_RAMPS` から不明なキーで取得した場合に `standard` へフォールバックする設計になっており、これは健全な防御的プログラミング
