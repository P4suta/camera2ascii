# テストツール選定

## プロジェクト情報

- **言語**: TypeScript (strict mode)
- **ランタイム**: ブラウザ (DOM API, Canvas API, getUserMedia)
- **ビルドツール**: Bun 1.3.12
- **テストランナー**: `bun test` (built-in)
- **既存テスト**: なし（新規プロジェクト）

---

## 1. Property-based Testing

### 選定: fast-check v4.6.0

**選定理由**:
- Bun公式チュートリアルで推奨されている唯一のproperty-based testingライブラリ
- `bun:test` とネイティブに統合可能
- TypeScript型定義が組み込み済み
- アクティブにメンテナンス（直近リリース: 2026年）

**不採用候補**:
- **JSVerify v0.8.4**: 7年以上メンテナンスなし。TypeScriptサポートが不十分

**インストール**:
```bash
bun add -D fast-check
```

**ビルド設定変更**: なし（devDependencyのみ）

---

## 2. Mutation Testing

### 選定: @stryker-mutator/core v9.6.0

**選定理由**:
- JavaScript/TypeScript向け唯一のアクティブなmutation testingツール
- TypeScriptチェッカー内蔵（型エラーの変異体を自動排除）
- 直近リリース: 2026年3月

**Bunテストランナー統合**:
- 公式サポートは未提供（Issue #5424）
- コマンドランナーで `bun test` を実行する方式で対応

**インストール**:
```bash
bun add -D @stryker-mutator/core
```

**ビルド設定変更**: `stryker.config.mjs` を追加

---

## 3. Contract/Assertion

### 選定: カスタムassert関数 (`src/assert.ts`)

**選定理由**:
- プロジェクトの「外部ランタイム依存ゼロ」方針に合致
- ブラウザ環境で動作する軽量なアサーション関数を自作
- `node:assert` はブラウザでは使用不可のため不採用

**不採用候補**:
- **Zod**: ランタイム依存が発生するため不適合
- **node:assert**: ブラウザ環境では動作しない（サーバーサイド専用）

**インストール**: 不要（自作モジュール）

**ビルド設定変更**: なし
