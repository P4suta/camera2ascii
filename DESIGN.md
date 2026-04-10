# DESIGN.md — camera2ascii

## 思想

camera2ascii は「ツール」ではない。「体験」である。

ページを開いた瞬間、カメラが起動し、自分の姿が文字の粒子に溶けていく。
ボタンもスライダーもメニューもない。あるのは黒い画面と白い文字だけ。
操作を意識させない。ただ、見る。

## 設計原則

### 1. ゼロUI

コントロールパネルは存在しない。設定項目は存在しない。
全パラメータはアプリケーションが最適値を自律的に決定する。

- 文字セット: ビルド時に密度解析された257レベルUnicodeランプ
- 列数/行数: ウィンドウサイズとフォントメトリクスから自動計算
- FPS: requestAnimationFrame に完全委任
- ミラー: 常にON
- カメラ: デフォルトの前面カメラ

ユーザーが触れるものは何もない。

### 2. Canvas描画

文字はDOMではなく `<canvas>` に `fillText()` で描画する。

`<pre>` + textContent は「テキスト」である。選択でき、コピーでき、検索できる。
しかしこのアプリが映す内容は映像であり、毎秒数十回書き換わる。
テキストとして扱えることに意味はなく、ユーザーを困惑させるだけ。

Canvas描画により:
- テキスト選択が根本的に不可能になる
- DOM操作コストがゼロになる
- フォントメトリクスを精密に制御できる

### 3. 即時起動

ページロード → カメラ許可要求 → 描画開始。

Startボタンは置かない。このページに来た目的は一つ。
自分の姿がASCIIアートになるのを見ること。

### 4. 適応的レイアウト

ウィンドウサイズが変わると、列数と行数がリアルタイムに再計算される。
フォントサイズは固定。セルの数がウィンドウに合わせて増減する。

```
cols = floor(windowWidth / cellWidth)
rows = floor(windowHeight / cellHeight)
```

### 5. 外部依存ゼロ

ランタイムにおける外部ライブラリの使用を一切禁止する。
Canvas API、getUserMedia、requestAnimationFrame — ブラウザ標準APIのみ。

## ビジュアル

### 色

```
背景    #000000                    完全な黒
文字    rgba(255, 255, 255, 0.85)  わずかに透明な白
エラー  rgba(255, 255, 255, 0.5)   控えめに
```

黒と白だけ。アクセントカラーは存在しない。

### フォント

```
"SF Mono", "Menlo", "Consolas", "Courier New", monospace
```

等幅でなければ文字グリッドは成立しない。

### 起動画面

カメラ許可を待つ間、黒い画面の中央に白い文字で:

```
camera access required
```

小文字。句読点なし。フェードインする。

### エラー表示

画面下部にトースト。数秒後にフェードアウト。

## アーキテクチャ

```
main.ts        即時起動、レンダーループ、リサイズ対応
camera.ts      getUserMedia、フレームキャプチャ
converter.ts   ピクセル → 文字変換（257レベル密度ランプ）
renderer.ts    Canvas fillText() 描画
styles.ts      全画面Canvas + 起動/エラー表示
types.ts       型定義
```

### フレーム処理

```
video → capture canvas (drawImage, ダウンサンプリング)
→ getImageData → 輝度計算 → ランプ参照 → 文字配列
→ display canvas (fillText × cols × rows)
```

キャプチャ用Canvasのサイズを列数×行数に合わせ、
ブラウザの補間アルゴリズムでダウンサンプリング。

### 輝度計算

```
Y = 0.299R + 0.587G + 0.114B
```

### 文字マッピング

ビルド時に生成された257レベル密度ランプを使用。
2,154のUnicode文字をCanvasに描画してピクセル密度を計測し、等間隔サンプリング。

反転マッピング:
```
charIndex = floor(((255 - luma) / 255) * 256)
```

### アスペクト比補正

等幅フォントのセルは縦 ≈ 横 × 2。高さに0.5を掛ける。

## エラーハンドリング

| DOMException       | 表示                                   |
|--------------------|----------------------------------------|
| NotAllowedError    | camera access was denied               |
| NotFoundError      | no camera found                        |
| NotReadableError   | camera is in use by another app        |

小文字、句読点なし。トーンを揃える。
