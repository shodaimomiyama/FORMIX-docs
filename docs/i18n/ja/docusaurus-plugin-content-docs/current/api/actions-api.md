---
sidebar_position: 1
---

# Actions レイヤー API

:::info 現在のステータス
ActionsレイヤーAPIは完全に実装されており、安定しています。開発には `MockAOClient`（インメモリ、デフォルト）またはローカルデモCLIを使用してください。HyperBEAM経由の本番AO接続は実験的です — [FormixClientのフィーチャーフラグ](/docs/api/formix-client#feature-flags)を参照してください。
:::

Actionsレイヤーは、FORMIXとの相互作用のための主要なインターフェースを提供します。すべての外部操作は `FormixClient` または内部の `ActionsContainer` を通じて実行されます。

## 概要

```rust
use formix::actions::client::FormixClient;
use formix::actions::di::DefaultActionsContainer;
```

Actionsレイヤーが公開する主要コンポーネント：
- `FormixClient` - ビルダーパターンAPIを持つ高レベルクライアント
- `ActionsContainer` - Controller、WorkflowService、CryptoServiceを集約するDIコンテナ
- `ShareBuilder` / `RecoverBuilder` - コンパイル時安全性を備えたType-Stateビルダー

## 依存性注入

### `ActionsContainer`

Actionsレイヤーの中央DIコンテナで、すべての依存関係を集約します。

```rust
pub struct ActionsContainer<C: CoreCryptoService, ST: StorageService> {
    controller: ControllerContainer<C>,
    workflow_services: WorkflowServiceContainer<ServiceCryptoServiceImpl<C>, ST>,
    crypto_service: Arc<C>,
}
```

**デフォルト具象型**:

```rust
pub type DefaultActionsContainer =
    ActionsContainer<CoreCryptoServiceImpl, DefaultStorageService>;

pub type DefaultStorageService =
    ServiceStorageServiceImpl<ArweaveStorageServiceImpl, ContractStorageImpl<MockAOClient>>;
```

### ActionsContainerの作成

```rust
// デフォルト（インメモリのモックAOとArweaveを使用）
let container = DefaultActionsContainer::new();

// カスタムストレージを使用
let container = DefaultActionsContainer::with_storage(arweave, contract);

// 完全にカスタムの依存関係
let container = ActionsContainer::with_dependencies(
    controller, workflow_services, crypto_service
);
```

## ドメインエンティティ

### Secret（集約ルート）

秘密のライフサイクルとメタデータを管理します。実際の秘密データは保持しません。

```rust
pub struct Secret {
    id: SecretId,
    threshold_k: u8,                              // 必要な最小シェア数
    threshold_n: u8,                              // 総シェア数
    state: SecretState,                           // ステートマシン
    capsule_id: Option<CapsuleId>,                // PRE Capsule参照
    share_collection_id: Option<ShareCollectionId>, // 暗号化シェア参照
    kfrag_ids: Vec<KFragId>,                      // 配布された鍵フラグメント
    owner_public_key: Vec<u8>,                    // Ownerの PRE公開鍵
    requester_public_key: Option<Vec<u8>>,        // Requesterの PRE公開鍵
    created_at: u64,
}
```

**ステートマシン**:

```
Initialized → Split → Distributed → Recovered
```

| 状態 | 説明 |
|-------|-------------|
| `Initialized` | 作成済み、未処理 |
| `Split` | シェアとCapsuleが作成済み |
| `Distributed` | KFragがホルダーに配布済み |
| `Recovered` | Requesterが秘密を復元済み |

### Capsule

暗号化時に生成されたUmbral PRE Capsuleのシリアライズデータを保持します。OwnerからRequesterへのプロキシ再暗号化を可能にします。

```rust
pub struct Capsule {
    id: CapsuleId,
    secret_id: SecretId,
    capsule_data: Vec<u8>,           // シリアライズされたUmbral Capsule（公開）
    owner_public_key: Vec<u8>,       // Ownerの PRE公開鍵
    arweave_tx_id: Option<String>,   // Arweaveストレージ参照
    created_at: u64,
}
```

### ShareCollection

秘密のすべてのn個の暗号化Shamirシェアを保持し、単一のArweaveトランザクションにアトミックに保存されます。

```rust
pub struct ShareCollection {
    id: ShareCollectionId,
    secret_id: SecretId,
    threshold_k: u8,
    threshold_n: u8,
    shares: Vec<EncryptedShareData>,   // すべてのn個の暗号化シェア
    arweave_tx_id: Option<String>,
    created_at: u64,
}

pub struct EncryptedShareData {
    index: u8,                         // シェアインデックス (1..=n)
    encrypted_data: Vec<u8>,           // C_i = AES_GCM(k_O, f(i))
}
```

### KFrag

Holder-Processに配布される再暗号化鍵フラグメント。機密暗号データを含みます。

```rust
#[derive(Zeroize, ZeroizeOnDrop)]
pub struct KFrag {
    id: KFragId,
    secret_id: SecretId,
    holder_index: u8,                  // 1..=n（ホルダーセット内の位置）
    holder_process_id: Option<String>, // 割り当てられたホルダーのAOプロセスID
    kfrag_data: Vec<u8>,               // シリアライズされたUmbral KeyFrag（機密）
    created_at: u64,
}
```

**セキュリティ**: `Zeroize` と `ZeroizeOnDrop` を実装し、機密な `kfrag_data` をメモリからクリアします。

### CFrag

Holder-Processによって生成された再暗号化Capsuleフラグメント。機密暗号データを含みます。

```rust
#[derive(Zeroize, ZeroizeOnDrop)]
pub struct CFrag {
    id: CFragId,
    secret_id: SecretId,
    kfrag_id: KFragId,
    holder_index: u8,                  // ホルダーセット内の位置 (1..=n)
    cfrag_data: Vec<u8>,               // 再暗号化フラグメント（機密）
    created_at: u64,
}
```

**セキュリティ**: `Zeroize` と `ZeroizeOnDrop` を実装し、機密な `cfrag_data` をメモリからクリアします。

## 値オブジェクト

### 型安全なID

すべてのエンティティIDは、コンパイル時の型安全性のためにnewtypeパターンを使用します:

```rust
pub struct SecretId(String);
pub struct CapsuleId(String);
pub struct ShareCollectionId(String);
pub struct KFragId(String);
pub struct CFragId(String);
```

各IDは `new()`、`generate()`（UUID v4）、`as_str()` をサポートします。

### KeyPair

秘密鍵を自動的にゼロ化するUmbral PRE鍵ペア。

```rust
#[derive(Zeroize, ZeroizeOnDrop)]
pub struct KeyPair {
    secret_key: Vec<u8>,    // ドロップ時にゼロ化
    public_key: Vec<u8>,    // ゼロ化なし（公開情報）
}
```

秘密鍵素材の偶発的なコピーを防ぐため `Clone` を実装していません。Debug出力では秘密鍵は伏せられます。

### SecretData

Shamir分割操作中の生の秘密バイト列を扱う一時的な値オブジェクト。

```rust
#[derive(Zeroize, ZeroizeOnDrop)]
pub struct SecretData {
    secret_bytes: Vec<u8>,
}
```

## エラー型

### ActionError

```rust
pub enum ActionError {
    ValidationFailed { code: String, message: String },
    WorkflowFailed { message: String },
    ResourceNotFound { resource: String },
    CryptoError { message: String },
    PartialStorageFailure {
        capsule_tx_id: String,
        successful_share_tx_ids: Vec<String>,
        failed_shares: Vec<(String, String)>,
        message: String,
    },
}
```

### DomainError

```rust
pub enum DomainError {
    EntityValidation { entity_type, field, message },
    InvalidStateTransition { entity_type, from_state, to_state, reason },
    BusinessRuleViolation { rule, message },
    ThresholdConstraintViolation { required_threshold, available_shares, operation },
    CryptographicError { operation, details },
    NotFound { entity_type, id },
    StorageError { operation, details },
    // ... その他
}
```

## 次のステップ

- [プロジェクト構造](/docs/development/project-structure) - コード構成
- [開発コマンド](/docs/development/commands) - ビルドとテストコマンド
