---
sidebar_position: 1
---

# アーキテクチャ概要

:::info 現在のステータス
以下に説明するアーキテクチャは、**ローカルモード**で完全に実装され機能しています。Adapterレイヤーにおける **HyperBEAM** 経由の本番AO Network接続は実験的です（E2E統合は進行中）。詳細は [Current Status](/docs/intro#current-status) を参照してください。
:::

FORMIXは、関心の分離と依存性逆転を備えた**クリーンアーキテクチャ**パターンに従います。

## レイヤー構造

```
┌─────────────────────────────────────────┐
│           Actions Layer                  │  ← Public API (FormixClient, Builders)
├─────────────────────────────────────────┤
│         Controller Layer                 │  ← Input Validation & DTO Extraction
├─────────────────────────────────────────┤
│          UseCase Layer                   │  ← Workflow, Service, Core
│  ┌─────────┬──────────┬──────────┐      │
│  │Workflow  │ Service  │  Core    │      │
│  │(Sharing, │(Crypto,  │(Storage, │      │
│  │Recovery) │ Storage) │ Contract)│      │
│  └─────────┴──────────┴──────────┘      │
├─────────────────────────────────────────┤
│          Domain Layer                    │  ← Entities, Value Objects, Errors
├─────────────────────────────────────────┤
│       Repositories Layer                 │  ← Persistence Abstractions (Traits)
├─────────────────────────────────────────┤
│         Adapter Layer                    │  ← External Integrations
│  ┌──────────────┬────────────────┐      │
│  │RepositoryImpl│   External     │      │
│  │(Arweave CRUD)│(AO, Arweave,  │      │
│  │              │ MockAO)        │      │
│  └──────────────┴────────────────┘      │
└─────────────────────────────────────────┘
```

## レイヤー説明

### Actions レイヤー
すべての外部インタラクションのエントリーポイントです。このレイヤーは：
- `FormixClient` をメインパブリックAPIとして提供
- Type-State `ShareBuilder` / `RecoverBuilder` でコンパイル時安全性を確保
- `ActionsContainer` で依存性注入を管理
- 入力バリデーションをControllerレイヤーに委譲

```rust
// 例: Actionsレイヤーの使用方法
let result = client.share()
    .secret(data.to_vec())
    .threshold(3)
    .total_shares(5)
    .owner_key(owner_sk)
    .requester_key(requester_pk)
    .execute()
    .await?;
```

### Controller レイヤー
入力バリデーションとDTO変換を担当：
- `ShareValidator` - 共有操作パラメータのバリデーション
- `RecoverExtractor` - 復元パラメータの抽出とDTO変換
- `ControllerContainer` - コントローラ依存関係のDIコンテナ

### UseCase レイヤー
アプリケーション固有のビジネスロジックを含み、3つのサブレイヤーで構成されます：

- **Workflow** - `SecretSharingService`（フェーズ1）と `SecretRecoveryService`（フェーズ3）がマルチステップ操作をオーケストレーション
- **Service** - `CryptoService`（Umbral TPRE, Shamir, AES-GCM）と `StorageService`（Arweave + AOの複合）が再利用可能な機能を提供
- **Core** - `ArweaveStorageService`、`ContractStorage`、`CryptoService` がコアトレイト抽象を定義

### Domain レイヤー
外部懸念事項から独立したコアビジネスロジック：
- **エンティティ**: `Secret`（集約ルート）, `Capsule`, `ShareCollection`, `KFrag`, `CFrag`
- **値オブジェクト**: `SecretId`, `CapsuleId`, `ShareCollectionId`, `KFragId`, `CFragId`, `KeyPair`, `SecretData`, `SymmetricKey`
- **エラー**: 網羅的なエラーバリアントを持つ `DomainError`
- **ステートマシン**: `SecretState` (Initialized → Split → Distributed → Recovered)

### Repositories レイヤー
依存性逆転を用いたトレイトベースの永続化抽象を定義：
- `SecretRepository` - Secret集約ルートのCRUD
- `CapsuleRepository` - CRUD + 秘密IDによる検索
- `ShareCollectionRepository` - CRUD + 秘密IDによる検索
- `KFragRepository` - CRUD + 秘密ID・ホルダーインデックスによる検索
- `CFragRepository` - 再暗号化フラグメントのCRUD

### Adapter レイヤー
外部統合の実装：
- **RepositoryImpl** - すべてのリポジトリトレイトのArweaveバック実装
- **External/AO** - `AOClient` トレイトと `HyperBEAMClient`（実験的、`hyperbeam` フィーチャー）: RFC-9421 `rsa-pss-sha512` HTTPメッセージ署名、TABMマルチパートエンコーディング、JWKウォレット処理
- **External/AO-CWAO** - CosmWasm時代のレガシークライアント（`ao_cwao/`）。HyperBEAM移行期間中の参照用として保持
- **External/Arweave** - `ArweaveClient` トレイト、トランザクション処理、ディープハッシュ、ウォレット管理
- **External/MockAO** - テスト用インメモリAOクライアント（デフォルトバックエンド）

:::note
Adapterレイヤーは、バックエンド移行の影響を受ける唯一のレイヤーです。依存性逆転のおかげで、コアビジネスロジック、ドメイン、ユースケースの各レイヤーに変更を加えることなく、AO/Arweaveアダプタを差し替えられます。ローカルモードでは、`ao/contracts/` のコントラクトロジックが（Wasm/AO経由ではなく）ネイティブにリンクされ、同一の暗号学的振る舞いを提供します。
:::

## ストレージアーキテクチャ

FORMIXは、不変データストレージとコントラクト通信を分離する複合ストレージパターンを使用します：

```
┌──────────────────────────────────────────────┐
│              StorageService                   │
│  (Composite: Arweave + Contract)             │
├──────────────────────┬───────────────────────┤
│ ArweaveStorageService│   ContractStorage     │
│ (Immutable data)     │   (AO Network)        │
│ - store_data()       │   - send_kfrags()     │
│ - retrieve_data()    │   - delegate_capsule()│
│ - query_by_tags()    │   - retrieve_cfrags() │
│ - batch_store()      │   - retrieve_threshold│
└──────────────────────┴───────────────────────┘
```

### タグベースストレージ

Arweaveに保存されるすべてのエンティティは、発見可能性のために一貫したタグ付け戦略を使用します：

| タグ | 説明 |
|-----|-------------|
| `App-Name` | 常に `"FORMIX"` |
| `Entity-Type` | `Secret`, `ShareCollection`, `Capsule`, `KFrag`, `CFrag` |
| `Entity-Id` | エンティティ固有のUUID |
| `Secret-Id` | 親秘密のUUID（子エンティティ用） |
| `Holder-Index` | ホルダーセット内の位置（KFrag用） |
| `Deleted` | ソフト削除フラグ |

## プロセスアーキテクチャ

FORMIXは、再暗号化の調整のために3つのロールを通じて動作します。本番モード（HyperBEAM経由のAO Network、実験的）では、Holderはオンチェーンプロセスとして動作します。ローカルモードでは、Holderのコントラクトロジックはネイティブに実行されます。

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│    Owner     │    │    Holder    │    │  Requester   │
│  (Client)    │    │  (Contract)  │    │  (Client)    │
├──────────────┤    ├──────────────┤    ├──────────────┤
│ - Encrypt    │    │ - Store      │    │ - Request    │
│ - Gen KFrags │───▶│ - Re-encrypt │◀───│ - Collect    │
│ - Authorize  │    │ - Distribute │    │ - Decrypt    │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
        └───────────────────┴───────────────────┘
                           │
                ┌─────────────────────┐
                │  Storage Backend    │
                │  (Local / Arweave)  │
                └─────────────────────┘
```

現在の `FormixClient` は、呼び出し元がデータ所有者とリクエスターの両方の役割を果たす**シングルユーザー（セルフサービス）ワークフロー**向けに設計されています。ローカルモードでは、3つのロールすべてが単一プロセス内で実行されます。

## データフロー

1. **暗号化**: Owner がデータを暗号化 → Capsule + 暗号化シェア
2. **保存**: CapsuleとShareCollectionをArweaveに保存
3. **配布**: Owner がKFragを生成 → AO Holder-Processに送信
4. **リクエスト**: Requester がAO経由でアクセスを要求
5. **再暗号化**: Holder がKFragからCFragを生成
6. **復号**: Requester がCFragを結合 → シェアを復号 → 秘密を復元

## 次のステップ

- [6フェーズワークフロー](/docs/architecture/six-phase-workflow) - 詳細なプロトコルフロー
- [セキュリティ特性](/docs/architecture/security) - 暗号学的保証
