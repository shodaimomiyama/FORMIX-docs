---
sidebar_position: 2
---

# 開発コマンド

FORMIXは独立したCargoクレート（`client/`, `demo/`, `ao/contracts/`）として構成されており、**ワークスペースレベルのMakefileはありません**。各ディレクトリに独自のコマンドがあります。

## クライアントライブラリ（`client/`）

コアライブラリでは、Cargoの薄いラッパーとして `make` を使用します：

| コマンド | 説明 |
|---------|-------------|
| `make check` | `cargo check` — 高速な型チェック |
| `make fmt` | `cargo fmt --all` — コードのフォーマット |
| `make clippy` | プロジェクトの厳格なリントセットによるClippy（pedantic + nursery、`unwrap`/`expect`/`panic` は禁止） |
| `make clippy-strict` | プロダクション/セキュリティ監査向けのさらに厳格なClippy（restriction + cargoリント） |
| `make lint` | `fmt` + `clippy` |
| `make test` | `cargo test` — テストスイートを実行 |
| `make all` | `check` + `lint` + `test` |

```bash
cd client
make all
```

### Cargoを直接使用する

```bash
cd client

# テストスイートを実行
cargo test

# 単一のテストを実行
cargo test test_name

# 実行可能なサンプルを実行
cargo run --example basic_usage

# 実験的なHyperBEAMバックエンド付きでビルド
cargo build --features hyperbeam
```

## デモCLI（`demo/`）

:::caution mainブランチで一時的に動作しません
`demo` クレートは、コントラクトABI移行後の現在、ビルドに失敗します。`demo/Cargo.toml` がリネームされた `contract` クレート（現在は `formix-ao-contract`）と削除済みの `production-ao` フィーチャーをまだ参照しているためです。以下のターゲットは修正後に利用できます。それまでは `cd client && cargo run --example basic_usage` を使用してください。
:::

| コマンド | 説明 |
|---------|-------------|
| `make help` | すべてのターゲットと説明を一覧表示 |
| `make build` | デモバイナリをビルド（release） |
| `make demo-local` | すべてのローカルフェーズを実行：鍵生成 → 共有 → 再暗号化 → 復元（`demo-local-all` のエイリアス） |
| `make demo-local-share REQUESTER_PUBKEY=<hex>` | ローカルフェーズ1のみ |
| `make demo-local-reencrypt SECRET_ID=<id>` | ローカルフェーズ2のみ |
| `make demo-local-recover SECRET_ID=<id>` | ローカルフェーズ3のみ |
| `make demo-keygen ROLE=owner\|requester` | ロールの鍵ペアを生成 |

```bash
cd demo
make demo-local
```

これは `cargo run --release -- local all` と同等です。

カスタムの秘密を渡すこともできます：

```bash
make demo-local PLAINTEXT="my secret message"
```

### 個別フェーズのコマンド（Cargo）

```bash
cd demo

# フェーズ1：Ownerが秘密を分割・暗号化
cargo run --release -- local share --requester-pubkey <hex>

# フェーズ2：Holderがプロキシ再暗号化を実行
cargo run --release -- local reencrypt --secret-id <id>

# フェーズ3：Requesterが秘密を復元
cargo run --release -- local recover --secret-id <id>
```

## AOコントラクト（`ao/`）

:::caution 実験的
デプロイはHyperBEAM経由でAO Networkを対象としており、**実験的**です。エンドツーエンドの統合は進行中で、デプロイツールの一部はまだ接続作業中です。ローカルモードではこれらは一切不要です。
:::

```bash
# コントラクトWASMをビルド
cd ao
npm install --ignore-scripts
npm run build     # cargo build --target wasm32-unknown-unknown --release

# モジュールをArweaveにデプロイ（資金のあるウォレットが必要）
npm run deploy -- --wallet /path/to/arweave-keyfile.json
```

`demo/` からは、同じフローが `make setup` / `make deploy` としてラップされています（`make help` を参照）。

## 環境変数

| ファイル | 変数 | 説明 |
|------|----------|-------------|
| `demo/.env`（`demo/.env.example` から作成） | `ARWEAVE_WALLET_PATH` | デプロイターゲットで使用するArweave JWKウォレットへのパス |

`RUST_LOG` はすべてのRustバイナリのログ詳細度を制御します（例：`RUST_LOG=debug`）。

## コントリビューション

PRを提出する前に、`client/` で以下を実行してください：

```bash
make all
```

これによりCIと同じチェック（フォーマット、厳格なClippy、テスト）が実行されます。

## 次のステップ

- [プロジェクト構造](/docs/development/project-structure) - コード構成
- [APIリファレンス](/docs/api/actions-api) - Actionsレイヤードキュメント
