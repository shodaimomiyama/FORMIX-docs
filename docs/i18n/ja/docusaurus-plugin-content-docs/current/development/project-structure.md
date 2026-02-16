---
sidebar_position: 1
---

# プロジェクト構造

このガイドでは、FORMIXコードベースの構成を説明します。

## ディレクトリ概要

```
FORMIX/
├── client/                    # メインRustクライアントライブラリ
│   ├── src/
│   │   ├── actions/           # Actionsレイヤー（パブリックAPI）
│   │   ├── controller/        # Controllerレイヤー（バリデーション、抽出）
│   │   ├── usecase/           # UseCaseレイヤー（ワークフロー、サービス、コア）
│   │   ├── domain/            # Domainレイヤー（エンティティ、値オブジェクト）
│   │   ├── repositories/      # リポジトリインターフェース（トレイト）
│   │   ├── adapter/           # Adapterレイヤー（実装）
│   │   ├── lib.rs             # クレートルート
│   │   └── di.rs              # トップレベルDI設定
│   ├── Cargo.toml
│   └── tests/
├── ao/                        # AO Networkスマートコントラクト
│   └── holder-process/        # Holder-Process (Lua)
├── docs/                      # アーキテクチャ・設計ドキュメント
└── .spec-workflow/            # 仕様ワークフローファイル
```

## ソースコード構造

### `client/src/actions/`

外部コードが対話するパブリックAPIレイヤー。

```
actions/
├── mod.rs
├── client.rs          # DTpresClient - メインエントリーポイント
├── builder.rs         # ShareBuilder & RecoverBuilder (Type-Stateパターン)
├── di.rs              # ActionsContainer DI
├── error.rs           # ActionErrorタイプ
└── options.rs         # ShareOptions設定
```

### `client/src/controller/`

入力バリデーションとDTO変換レイヤー。

```
controller/
├── mod.rs
├── di.rs              # ControllerContainer DI
├── validator.rs       # ShareValidator（パラメータバリデーション）
├── extractor.rs       # RecoverExtractor（DTO抽出）
└── error.rs           # ValidationErrorタイプ
```

### `client/src/usecase/`

アプリケーション固有のビジネスロジックとワークフロー。

```
usecase/
├── mod.rs
├── dto.rs             # データ転送オブジェクト
├── error.rs           # WorkflowErrorタイプ
├── core/              # コアサービストレイト定義
│   ├── crypto.rs      # CryptoServiceトレイト（TPRE, Shamir, AES-GCM）
│   ├── storage.rs     # ArweaveStorageServiceトレイト & 実装
│   └── contract_storage.rs  # ContractStorageトレイト（AO Network）
├── service/           # 複合サービス実装
│   ├── crypto_service.rs    # ServiceCryptoServiceImpl
│   └── storage_service.rs   # StorageServiceImpl（Arweave + Contract）
└── workflow/          # マルチステップワークフローオーケストレーション
    ├── container.rs   # WorkflowServiceContainer DI
    ├── secret_sharing_service.rs   # フェーズ1ワークフロー
    └── secret_recovery_service.rs  # フェーズ3ワークフロー
```

### `client/src/domain/`

コアビジネスロジック、エンティティ、値オブジェクト。

```
domain/
├── errors.rs          # DomainError包括的エラータイプ
├── entities/
│   ├── secret.rs      # Secretエンティティ（集約ルート、ステートマシン）
│   ├── capsule.rs     # Capsuleエンティティ（Umbral PRE Capsule）
│   ├── share.rs       # ShareCollection + EncryptedShareData
│   ├── kfrag.rs       # KFragエンティティ（ドロップ時ゼロ化）
│   └── cfrag.rs       # CFragエンティティ
└── value_objects/
    ├── ids.rs          # 型安全なID（SecretId, CapsuleId等）
    ├── key_pair.rs     # KeyPair（ドロップ時ゼロ化）
    ├── secret_data.rs  # SecretData（ドロップ時ゼロ化）
    └── symmetric_key.rs # SymmetricKey
```

### `client/src/repositories/`

永続化のための抽象リポジトリインターフェース（トレイト）。

```
repositories/
├── secret_interface.rs         # SecretRepositoryトレイト
├── capsule_interface.rs        # CapsuleRepositoryトレイト
├── share_interface.rs          # ShareCollectionRepositoryトレイト
├── kfrag_interface.rs          # KFragRepositoryトレイト
└── cfrag_interface.rs          # CFragRepositoryトレイト
```

### `client/src/adapter/`

外部サービス統合とリポジトリ実装。

```
adapter/
├── errors.rs                   # AdapterErrorタイプ
├── repository_impl/            # Arweaveバックのリポジトリ実装
│   ├── secret_impl.rs
│   ├── capsule_impl.rs
│   ├── share_impl.rs
│   ├── kfrag_impl.rs
│   └── cfrag_impl.rs
└── external/                   # 外部サービスクライアント
    ├── ao/                     # AO Networkクライアント
    │   ├── client.rs           # AOClientトレイト
    │   ├── production_client.rs
    │   ├── message.rs          # ExecuteMsg, QueryMsg, Binary
    │   └── config.rs
    ├── arweave/                # Arweaveクライアント
    │   ├── client.rs           # ArweaveClientトレイト
    │   ├── transaction.rs
    │   ├── wallet.rs
    │   └── deep_hash.rs
    └── mock_ao/                # テスト用モックAOクライアント
        ├── client.rs           # MockAOClient（インメモリ）
        └── message.rs
```

## モジュール依存関係

```
actions
    ↓
controller
    ↓
usecase (workflow → service → core)
    ↓
domain ← repositories
    ↑         ↑
    └─────────┘
         ↑ (依存性逆転)
    adapter
```

## 設計パターン

| パターン | 用途 |
|---------|-------|
| クリーンアーキテクチャ | 依存性逆転によるレイヤー分離 |
| Type-State | コンパイル時ビルダーパラメータ強制 |
| 集約ルート | `Secret` が関連エンティティを管理 |
| リポジトリ | トレイトによる永続化抽象 |
| 合成 | StorageServiceがArweave + Contractを合成 |
| Zeroize on Drop | 暗号素材の安全なメモリクリア |

## 次のステップ

- [開発コマンド](/docs/development/commands) - 利用可能なmakeターゲット
- [APIリファレンス](/docs/api/actions-api) - Actionsレイヤードキュメント
