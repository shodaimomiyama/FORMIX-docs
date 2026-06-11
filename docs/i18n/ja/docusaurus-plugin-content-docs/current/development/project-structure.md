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
├── ao/                        # AOコントラクト + HyperBEAMデプロイ（Rust → WASM）
│   ├── contracts/             # formix-ao-contractクレート（ローカルではネイティブリンクで使用）
│   │   └── src/               # lib.rs, handlers.rs, message.rs, state.rs, getrandom_impl.rs
│   ├── scripts/               # Node.jsデプロイスクリプト（deploy.js, instantiate.js, …）— 実験的
│   └── test/                  # コントラクトテスト
├── ao_cwao/                   # レガシーのCosmWasm時代のコントラクト（参照用に保持）
├── demo/                      # CLIデモアプリケーション（ローカル + プロダクションモード）
│   ├── src/
│   │   ├── main.rs            # clapによるCLI：local all/share/reencrypt/recover
│   │   ├── main_production.rs # プロダクション専用CLI（現在は非稼働）
│   │   └── key_store.rs       # 鍵の永続化と中間結果のシリアライズ
│   ├── Cargo.toml             # 依存関係：formixクライアント, contract, clap, tokio
│   ├── Makefile               # demo-local, setup, deployターゲット
│   ├── README.md              # 詳細な使用方法ドキュメント（日本語）
│   └── .formix-demo/          # ランタイムデータディレクトリ（生成される）
│       ├── owner/             # Ownerの鍵 + フェーズ1の出力
│       ├── requester/         # Requesterの鍵
│       └── contract/          # フェーズ2の出力（CFrag）
├── docs/                      # アーキテクチャ・設計ドキュメント（PRD.md, status.md, …）
└── .spec-workflow/            # 仕様ワークフローファイル（仕様、承認、ステアリング）
```

## ソースコード構造

### `client/src/actions/`

外部コードが対話するパブリックAPIレイヤー。

```
actions/
├── mod.rs
├── client.rs          # FormixClient - メインエントリーポイント
├── builder.rs         # ShareBuilder & RecoverBuilder（Type-Stateパターン）
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
├── dto.rs             # データ転送オブジェクト（リクエスト/結果タイプ）
├── error.rs           # WorkflowErrorタイプ
├── core/              # コアサービストレイト定義
│   ├── mod.rs
│   ├── crypto.rs      # CryptoServiceトレイト（TPRE, Shamir, AES-GCM）
│   ├── storage.rs     # ArweaveStorageServiceトレイト & 実装
│   └── contract_storage.rs  # ContractStorageトレイト（AO Network）
├── service/           # 複合サービス実装
│   ├── mod.rs
│   ├── crypto_service.rs    # ServiceCryptoServiceImpl
│   └── storage_service.rs   # StorageServiceImpl（Arweave + Contract）
└── workflow/          # マルチステップワークフローオーケストレーション
    ├── mod.rs
    ├── container.rs   # WorkflowServiceContainer DI
    ├── secret_sharing_service.rs   # フェーズ1ワークフロー
    └── secret_recovery_service.rs  # フェーズ3ワークフロー
```

### `client/src/domain/`

コアビジネスロジック、エンティティ、値オブジェクト。

```
domain/
├── mod.rs
├── errors.rs          # DomainError包括的エラータイプ
├── entities/
│   ├── mod.rs
│   ├── secret.rs      # Secretエンティティ（集約ルート、ステートマシン）
│   ├── capsule.rs     # Capsuleエンティティ（Umbral PRE Capsule）
│   ├── share.rs       # ShareCollection + EncryptedShareData
│   ├── kfrag.rs       # KFragエンティティ（ドロップ時ゼロ化）
│   └── cfrag.rs       # CFragエンティティ
└── value_objects/
    ├── mod.rs
    ├── ids.rs          # 型安全なID（SecretId, CapsuleId等）
    ├── key_pair.rs     # KeyPair（ドロップ時ゼロ化）
    ├── secret_data.rs  # SecretData（ドロップ時ゼロ化）
    └── symmetric_key.rs # SymmetricKey
```

### `client/src/repositories/`

永続化のための抽象リポジトリインターフェース（トレイト）。

```
repositories/
├── mod.rs
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
├── mod.rs
├── errors.rs                   # AdapterErrorタイプ
├── repository_impl/            # Arweaveバックのリポジトリ実装
│   ├── mod.rs
│   ├── secret_impl.rs          # ArweaveSecretRepository
│   ├── capsule_impl.rs         # ArweaveCapsuleRepository
│   ├── share_impl.rs           # ArweaveShareCollectionRepository
│   ├── kfrag_impl.rs           # ArweaveKFragRepository
│   └── cfrag_impl.rs           # ArweaveCFragRepository
└── external/                   # 外部サービスクライアント
    ├── mod.rs
    ├── ao/                     # AO Networkクライアント（HyperBEAM）
    │   ├── mod.rs
    │   ├── client.rs           # AOClientトレイト
    │   ├── hyperbeam_client.rs # HyperBEAMClient（実験的、`hyperbeam` フィーチャー）
    │   ├── signer.rs           # RFC-9421 rsa-pss-sha512 HTTPメッセージ署名
    │   ├── tabm.rs             # TABMマルチパートエンコーダ（HyperBEAMワイヤーフォーマット）
    │   ├── wallet.rs           # JWKウォレット処理
    │   ├── message.rs          # AOメッセージタイプ
    │   └── config.rs           # AOエンドポイント設定
    ├── ao_cwao/                # レガシーのCosmWasm時代のAOクライアント（参照用）
    ├── arweave/                # Arweaveクライアント
    │   ├── mod.rs
    │   ├── client.rs           # ArweaveClientトレイト
    │   ├── config.rs           # Arweave設定
    │   ├── transaction.rs      # トランザクションタイプ
    │   ├── wallet.rs           # ウォレット管理
    │   ├── deep_hash.rs        # 署名用ディープハッシュ
    │   └── merkle.rs           # Merkleツリー操作
    └── mock_ao/                # テスト用モックAOクライアント
        ├── mod.rs
        ├── client.rs           # MockAOClient（インメモリ）
        └── message.rs          # モックメッセージ処理
```

## スマートコントラクト

```
ao/
├── contracts/                 # formix-ao-contractクレート（Rust → WASM、HyperBEAMターゲット）
│   └── src/
│       ├── lib.rs             # WASMエントリーポイント
│       ├── handlers.rs        # アクションディスパッチ & ハンドラ（DelegateKFrag, Reencrypt, …）
│       ├── message.rs         # AOMessage / AOResponse / AOSワイヤータイプ
│       ├── state.rs           # ProcessState、ロール、Capsuleステータスマシン
│       └── getrandom_impl.rs  # WASM向け決定論的乱数シム
├── scripts/                   # HyperBEAMデプロイスクリプト（Node.js、実験的）
└── test/                      # コントラクトテスト
```

ハンドラのリファレンスは [AO Contract API](/docs/api/ao-contract) を参照してください。

**ローカルモード**では、`ao/contracts/` のコントラクトコードは `demo/` クレートのRust依存としてネイティブにリンクされます。Wasmランタイムやネットワーク接続を必要とせず、オンチェーンで実行されるのと同じロジックを実行します。

## デモアプリケーション

```
demo/
├── src/
│   ├── main.rs                # フルCLI：local {all,share,reencrypt,recover} + プロダクションコマンド
│   ├── main_production.rs     # 簡素化されたプロダクション専用CLI
│   └── key_store.rs           # 永続的な鍵ストレージ、share/reencrypt結果のシリアライズ
├── Cargo.toml                 # formixクライアント + AOコントラクトクレートに依存
├── Makefile                   # demo-local, setup, deployターゲット
└── README.md                  # mermaid図付き使用ガイド（日本語）
```

:::caution
`demo` クレートは現在のmainブランチで**一時的に動作しません**。その `Cargo.toml` が移行前の `contract` クレート名（現在は `formix-ao-contract`）と削除済みの `production-ao` フィーチャーをまだ参照しているためです。動作する代替手段については[クイックスタート](/docs/getting-started/quick-start)を参照してください。
:::

## 主要ファイル

| ファイル | 目的 |
|------|---------|
| `client/Cargo.toml` | 依存関係管理 |
| `client/src/lib.rs` | クレートルートとパブリックエクスポート |
| `client/src/actions/client.rs` | FormixClientメインエントリーポイント |
| `client/src/actions/di.rs` | ActionsContainer DI |
| `client/src/domain/entities/secret.rs` | Secret集約ルート |

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

依存関係のルール：内側のレイヤーは外側のレイヤーに依存しません。Adapterレイヤーは、依存性逆転の原則に従い、Repositoriesレイヤーで定義されたRepositoryトレイトを実装します。

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
