---
sidebar_position: 1
---

# プロジェクト構造

このガイドでは、FORMIXコードベースの構成を説明します。

## ディレクトリ概要

```
FORMIX/
├── src/
│   ├── actions/           # Actions層（外部API）
│   ├── use_cases/         # Use Cases層（アプリケーションロジック）
│   ├── domain/            # Domain層（ビジネスルール）
│   │   ├── entities/      # ドメインエンティティ
│   │   └── value_objects/ # 値オブジェクト
│   ├── infrastructure/    # Infrastructure層
│   ├── interfaces/        # インターフェース定義
│   └── config/            # 設定
├── processes/
│   ├── owner/             # Owner AOプロセス
│   ├── holder/            # Holder AOプロセス
│   └── requester/         # Requester AOプロセス
├── crypto/                # 暗号プリミティブ
├── tests/
│   ├── unit/              # 単体テスト
│   ├── integration/       # 統合テスト
│   └── e2e/               # E2Eテスト
├── examples/              # サンプルコード
├── docs/                  # ドキュメント（このサイト）
└── scripts/               # ビルドとデプロイスクリプト
```

## ソースコード構造

### `src/actions/`

外部コードが対話するパブリックAPI層。

```
actions/
├── mod.rs
├── encryption.rs      # 暗号化/復号アクション
├── key_management.rs  # 鍵生成アクション
├── reencryption.rs    # 再暗号化アクション
└── errors.rs          # アクションエラー型
```

### `src/use_cases/`

アプリケーション固有のビジネスロジックとワークフロー。

```
use_cases/
├── mod.rs
├── encrypt_secret.rs
├── grant_access.rs
├── request_access.rs
└── decrypt_secret.rs
```

### `src/domain/`

コアビジネスロジック、エンティティ、値オブジェクト。

```
domain/
├── mod.rs
├── entities/
│   ├── mod.rs
│   ├── secret.rs      # Secretエンティティ
│   ├── capsule.rs     # Capsuleエンティティ
│   ├── kfrag.rs       # KFragエンティティ
│   └── cfrag.rs       # CFragエンティティ
└── value_objects/
    ├── mod.rs
    ├── keypair.rs     # KeyPair値オブジェクト
    ├── secret_data.rs # SecretData値オブジェクト
    └── public_key.rs  # PublicKey値オブジェクト
```

### `src/infrastructure/`

外部サービス統合。

```
infrastructure/
├── mod.rs
├── arweave/
│   ├── client.rs      # Arweaveクライアント
│   └── storage.rs     # ストレージ操作
├── ao/
│   ├── process.rs     # AOプロセス管理
│   └── message.rs     # AOメッセージング
└── evm/
    └── contracts.rs   # EVMコントラクトインタラクション
```

### `src/interfaces/`

抽象インターフェースとリポジトリ定義。

```
interfaces/
├── mod.rs
├── repositories/
│   ├── secret_repository.rs
│   └── kfrag_repository.rs
└── services/
    ├── storage_service.rs
    └── crypto_service.rs
```

## プロセス構造

### Ownerプロセス

```
processes/owner/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   ├── handlers/      # メッセージハンドラ
│   ├── state.rs       # プロセス状態
│   └── wasm.rs        # Wasmエントリーポイント
└── build.sh
```

### Holderプロセス

```
processes/holder/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   ├── handlers/
│   ├── state.rs
│   ├── proxy/         # プロキシノードロジック
│   └── wasm.rs
└── build.sh
```

### Requesterプロセス

```
processes/requester/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   ├── handlers/
│   ├── state.rs
│   └── wasm.rs
└── build.sh
```

## 暗号ライブラリ

```
crypto/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   ├── curve.rs       # 楕円曲線操作
│   ├── keys.rs        # 鍵生成
│   ├── encryption.rs  # 暗号プリミティブ
│   ├── pre.rs         # プロキシ再暗号化
│   └── threshold.rs   # 閾値操作
└── benches/
    └── crypto_bench.rs
```

## 設定ファイル

```
FORMIX/
├── Cargo.toml         # Rustワークスペース設定
├── Makefile           # ビルドコマンド
├── rust-toolchain.toml # Rustバージョン指定
├── .github/
│   └── workflows/     # CI/CDパイプライン
└── config/
    ├── default.toml   # デフォルト設定
    └── test.toml      # テスト設定
```

## 主要ファイル

| ファイル | 目的 |
|------|---------|
| `Cargo.toml` | ワークスペースと依存関係管理 |
| `Makefile` | ビルド、テスト、デプロイコマンド |
| `rust-toolchain.toml` | Rustバージョン固定 |
| `.env.example` | 環境変数テンプレート |

## モジュール依存関係

```
actions
    ↓
use_cases
    ↓
domain ← interfaces
    ↓
infrastructure
    ↓
config
```

依存ルール：内側の層は外側の層に依存しない。

## 次のステップ

- [開発コマンド](/docs/development/commands) - 利用可能なmakeターゲット
- [APIリファレンス](/docs/api/actions-api) - Actions層ドキュメント
