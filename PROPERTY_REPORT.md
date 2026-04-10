# Property-based Testing レポート

## 概要

`fast-check` を使用して、各モジュールの公開関数に対するプロパティベーステストを実装した。既存のテストファイルに `describe("property-based", ...)` ブロックとして追加。

## テスト結果

全 119 テスト通過（8 ファイル、168 expect 呼び出し）。プロパティベーステストによるバグの発見はなし。

## モジュール別テスト一覧

### src/converter.ts

| 関数 | プロパティ | 説明 |
|------|-----------|------|
| `brightness` | 出力範囲 | 任意の有効な r,g,b (0-255) に対して、結果が [0, 255] の範囲内 |
| `brightness` | 単調性 | 全チャンネルが増加すれば、輝度も増加（または維持） |
| `brightness` | 重み順序 | 同じ値の場合、green > red > blue の寄与順 |
| `brightnessToChar` | 出力がランプ内 | 任意の b (0-255) と非空ランプに対して、結果がランプの文字 |
| `brightnessToChar` | 境界値 | b=255 → ramp[0]、b=0 → ramp[末尾] |
| `imageDataToAscii` | 出力長 | chars.length が常に width * height と一致 |
| `imageDataToAscii` | カラーモード | mono → colors は null、非 mono → colors は chars と同じ長さの配列 |
| `imageDataToAscii` | 均一入力 | 全ピクセル同一色 → 全文字同一 |

### src/renderer.ts

| 関数 | プロパティ | 説明 |
|------|-----------|------|
| `renderFrame` | mono 行構造 | 出力の行数が height と一致し、各行の長さが width と一致 |
| `renderFrame` | 例外なし | 有効なフレームデータと width > 0 に対して例外が発生しない |

### src/dom.ts

| 関数 | プロパティ | 説明 |
|------|-----------|------|
| `el` | タグ名一致 | 任意の有効なタグ名に対して、tagName が大文字変換後の値と一致 |
| `el` | 属性ラウンドトリップ | setAttribute した属性が getAttribute で同じ値として取得可能 |

### src/assert.ts

| 関数 | プロパティ | 説明 |
|------|-----------|------|
| `assertInRange` | 範囲内受理 | [min, max] 内の任意の値に対して例外が発生しない |
| `assertInRange` | 範囲外拒否 | min 未満または max 超過の値に対して例外が発生する |
| `assertPositive` | 正数受理 | 任意の正の整数に対して例外が発生しない |
| `assertPositive` | 非正数拒否 | 0 以下の値に対して例外が発生する |

## 発見事項

- **バグの発見はなし** — 全てのプロパティが満たされていることを確認
- `brightness` の BT.601 重み付け計算は、単調性と重み順序の両方を正しく保持
- `brightnessToChar` の境界マッピングが正確に動作（ramp[0] が最高輝度、ramp[末尾] が最低輝度）
- `imageDataToAscii` は均一入力に対して正しく均一出力を生成
- `assertInRange` と `assertPositive` の境界条件が正確に機能

## テスト追加数

| ファイル | 追加テスト数 |
|---------|------------|
| `converter.test.ts` | 8 |
| `renderer.test.ts` | 2 |
| `dom.test.ts` | 2 |
| `assert.test.ts` | 4 |
| **合計** | **16** |
