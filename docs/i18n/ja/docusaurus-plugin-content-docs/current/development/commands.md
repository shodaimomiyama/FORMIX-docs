---
sidebar_position: 2
---

# 開発コマンド

FORMIXはビルド自動化に`make`を使用しています。このガイドでは利用可能なすべてのコマンドを説明します。

## クイックリファレンス

| コマンド | 説明 |
|---------|-------------|
| `make build` | すべてのコンポーネントをビルド |
| `make test` | すべてのテストを実行 |
| `make clean` | ビルド成果物をクリーン |
| `make fmt` | コードをフォーマット |
| `make lint` | リンターを実行 |

## ビルドコマンド

### `make build`

Wasmモジュールを含むすべてのRustコンポーネントをビルドします。

```bash
make build
```

このコマンドは：
1. コアライブラリをコンパイル
2. すべてのAOプロセスWasmモジュールをビルド
3. TypeScriptバインディングを生成（該当する場合）

### `make build-release`

最適化されたプロダクションビルドを作成します。

```bash
make build-release
```

### `make build-wasm`

WebAssemblyモジュールのみをビルドします。

```bash
make build-wasm
```

### `make clean`

すべてのビルド成果物を削除します。

```bash
make clean
```

## テストコマンド

### `make test`

完全なテストスイートを実行します。

```bash
make test
```

### `make test-unit`

単体テストのみを実行します。

```bash
make test-unit
```

### `make test-integration`

統合テストを実行します。

```bash
make test-integration
```

### `make test-e2e`

E2Eテストを実行します（ローカルAO環境が必要）。

```bash
make test-e2e
```

### `make test-coverage`

テストカバレッジレポートを生成します。

```bash
make test-coverage
```

カバレッジレポートは`target/coverage/`に生成されます。

## コード品質コマンド

### `make fmt`

`rustfmt`を使用してすべてのRustコードをフォーマットします。

```bash
make fmt
```

### `make fmt-check`

ファイルを変更せずにフォーマットをチェックします。

```bash
make fmt-check
```

### `make lint`

Clippyリンターを実行します。

```bash
make lint
```

### `make lint-fix`

Clippyを実行し、自動修正を適用します。

```bash
make lint-fix
```

## 開発コマンド

### `make dev`

ホットリロード付きの開発環境を起動します。

```bash
make dev
```

### `make run-example`

基本的なサンプルワークフローを実行します。

```bash
make run-example
```

### `make bench`

パフォーマンスベンチマークを実行します。

```bash
make bench
```

ベンチマーク結果はターミナルに表示され、`target/criterion/`に保存されます。

## ドキュメントコマンド

### `make docs`

Rustドキュメントを生成します。

```bash
make docs
```

### `make docs-open`

ドキュメントを生成し、ブラウザで開きます。

```bash
make docs-open
```

### `make docs-site`

Docusaurusドキュメントサイトを起動します。

```bash
make docs-site
```

## デプロイコマンド

### `make deploy-local`

ローカルAO開発環境にデプロイします。

```bash
make deploy-local
```

### `make deploy-testnet`

AOテストネットにデプロイします。

```bash
make deploy-testnet
```

**注意**: `.env`ファイルでの適切な設定が必要です。

## ユーティリティコマンド

### `make check`

ビルドせずにすべてのチェック（フォーマット、リント、テスト）を実行します。

```bash
make check
```

### `make ci`

完全なCIパイプラインをローカルで実行します。

```bash
make ci
```

これはGitHub Actionsで実行されるものと同等です。

### `make setup`

開発環境をセットアップします。

```bash
make setup
```

以下をインストールします：
- 必要なRustターゲット
- 開発依存関係
- Gitフック

## 環境変数

テンプレートから`.env`ファイルを作成：

```bash
cp .env.example .env
```

主要な環境変数：

| 変数 | 説明 | デフォルト |
|----------|-------------|---------|
| `RUST_LOG` | ログレベル | `info` |
| `AO_GATEWAY` | AOゲートウェイURL | `https://ao.arweave.dev` |
| `ARWEAVE_GATEWAY` | Arweaveゲートウェイ | `https://arweave.net` |

## Cargoコマンド

Cargoを直接使用することもできます：

```bash
# ビルド
cargo build

# テスト
cargo test

# 特定のテストを実行
cargo test test_encryption

# 特定のパッケージをビルド
cargo build -p d-tpres-crypto

# フィーチャー付きで実行
cargo build --features "debug-mode"
```

## トラブルシューティング

### ターゲットが見つからないビルドエラー

```bash
rustup target add wasm32-unknown-unknown
```

### リントエラー

```bash
# すべてのリント問題を確認
make lint

# 可能なものを自動修正
make lint-fix
```

### テストタイムアウト

遅いテストの場合、タイムアウトを増やします：

```bash
RUST_TEST_TIME_UNIT=60000 make test
```

## コントリビューション

PRを提出する前に以下を実行：

```bash
make ci
```

これにより、コードがすべてのチェックをパスすることが確認されます。

## 次のステップ

- [プロジェクト構造](/docs/development/project-structure) - コード構成
- [APIリファレンス](/docs/api/actions-api) - Actions層ドキュメント
