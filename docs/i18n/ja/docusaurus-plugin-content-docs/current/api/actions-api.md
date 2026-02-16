---
sidebar_position: 1
---

# Actions レイヤー API

Actionsレイヤーは、FORMIXとの相互作用のための主要なインターフェースを提供します。すべての外部操作は `DTpresClient` または内部の `ActionsContainer` を通じて実行されます。

## 概要

```rust
use formix::actions::client::DTpresClient;
use formix::actions::di::DefaultActionsContainer;
```

Actionsレイヤーが公開する主要コンポーネント：
- `DTpresClient` - ビルダーパターンAPIを持つ高レベルクライアント
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
    StorageServiceImpl<ArweaveStorageServiceImpl, ContractStorageImpl<MockAOClient>>;
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

暗号化時に生成されたUmbral PRE Capsuleのシリアライズデータを保持します。

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

秘密のすべてのn個の暗号化Shamirシェアを保持します。

```rust
pub struct ShareCollection {
    id: ShareCollectionId,
    secret_id: SecretId,
    threshold_k: u8,
    threshold_n: u8,
    shares: Vec<EncryptedShareData>,
    arweave_tx_id: Option<String>,
    created_at: u64,
}

pub struct EncryptedShareData {
    index: u8,                         // シェアインデックス (1..=n)
    encrypted_data: Vec<u8>,           // C_i = AES_GCM(k_O, f(i))
}
```

### KFrag

Holder-Processに配布される再暗号化鍵フラグメント。

```rust
#[derive(Zeroize, ZeroizeOnDrop)]
pub struct KFrag {
    id: KFragId,
    secret_id: SecretId,
    holder_index: u8,
    holder_process_id: Option<String>,
    kfrag_data: Vec<u8>,               // シリアライズされたUmbral KeyFrag（機密）
    created_at: u64,
}
```

### CFrag

Holder-Processによって生成された再暗号化Capsuleフラグメント。

```rust
pub struct CFrag {
    id: CFragId,
    secret_id: SecretId,
    kfrag_id: KFragId,
    cfrag_data: Vec<u8>,
    holder_process_id: String,
}
```

## 値オブジェクト

### 型安全なID

```rust
pub struct SecretId(String);
pub struct CapsuleId(String);
pub struct ShareCollectionId(String);
pub struct KFragId(String);
pub struct CFragId(String);
```

### KeyPair

```rust
#[derive(Zeroize, ZeroizeOnDrop)]
pub struct KeyPair {
    secret_key: Vec<u8>,
    public_key: Vec<u8>,
}
```

### SecretData

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

## 次のステップ

- [プロジェクト構造](/docs/development/project-structure) - コード構成
- [開発コマンド](/docs/development/commands) - ビルドとテストコマンド
