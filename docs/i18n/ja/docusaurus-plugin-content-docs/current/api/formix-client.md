---
sidebar_position: 0
---

# DTpresClient API

`DTpresClient` はFORMIXクライアントライブラリのメインエントリーポイントであり、内部の `ActionsContainer` をラップして、ビルダーパターンによるshare/recover操作のクリーンなパブリックAPIを提供します。

## 初期化

### `new`

事前設定された値で `DTpresClient` を作成します。ウォレット/プロセスのセットアップを外部で処理するシナリオ向けです。

```rust
pub fn new(
    process_id: String,
    wallet_address: String,
    ao_gateway_url: String,
    arweave_gateway_url: String,
) -> Self
```

**パラメータ**:
- `process_id`: このクライアントのAOプロセスID
- `wallet_address`: Ownerのウォレットアドレス
- `ao_gateway_url`: AO NetworkゲートウェイURL
- `arweave_gateway_url`: ArweaveゲートウェイURL

```rust
use formix::actions::client::DTpresClient;

let client = DTpresClient::new(
    "process-id".to_string(),
    "wallet-address".to_string(),
    "https://ao.arweave.net".to_string(),
    "https://arweave.net".to_string(),
);
```

### `init`（計画中）

JWKウォレットを読み込み、AOプロセスを検出/起動して `DTpresClient` を初期化します。

```rust
pub fn init(config: InitConfig) -> ActionResult<Self>
```

**注意**: このメソッドは未実装です。現在の開発では `new()` を使用してください。

### `with_storage`

高度なユースケース向けに、事前設定されたストレージコンポーネントで `DTpresClient` を作成します。

```rust
pub fn with_storage(
    process_id: String,
    wallet_address: String,
    ao_gateway_url: String,
    arweave_gateway_url: String,
    arweave: Arc<ArweaveStorageServiceImpl>,
    contract: Arc<ContractStorageImpl<MockAOClient>>,
) -> Self
```

## 鍵管理

### `generate_keypair`

新しいUmbral PRE暗号鍵ペアを生成します。

```rust
pub fn generate_keypair(&self) -> ActionResult<(SecretKey, PublicKey)>
```

**戻り値**: `(SecretKey, PublicKey)` のタプル。

```rust
let (owner_sk, owner_pk) = client.generate_keypair()?;
```

## データ共有

### `share`

閾値パラメータで秘密を暗号化・共有するための `ShareBuilder` を作成します。必須パラメータのコンパイル時チェックに**Type-Stateパターン**を使用します。

```rust
pub fn share(&self) -> ShareBuilder<..., NotSet, NotSet, NotSet, NotSet, NotSet>
```

**戻り値**: すべての必須フィールドが `NotSet` の `ShareBuilder`。

#### ShareBuilderメソッド

| メソッド | 種別 | 説明 |
|--------|------|-------------|
| `.secret(data: Vec<u8>)` | 必須 | 暗号化する秘密データ |
| `.threshold(k: u8)` | 必須 | 復元に必要な最小フラグメント数 |
| `.total_shares(n: u8)` | 必須 | 生成するフラグメントの総数 |
| `.owner_key(sk: SecretKey)` | 必須 | Ownerの秘密鍵（所有権移動） |
| `.requester_key(pk: PublicKey)` | 必須 | Requesterの公開鍵（所有権移動） |
| `.metadata(meta: Option<SecretMetadata>)` | 任意 | 秘密のメタデータ |
| `.execute()` | 終端（async） | 共有操作を実行 |

`execute()` メソッドは**すべての必須フィールドが設定**された場合のみ呼び出し可能です（コンパイル時チェック）。

```rust
use formix::usecase::dto::SecretMetadata;

let share_result = client.share()
    .secret(b"Sensitive data".to_vec())
    .threshold(3)
    .total_shares(5)
    .owner_key(owner_sk)
    .requester_key(requester_pk)
    .metadata(Some(SecretMetadata {
        name: Some("Example".to_string()),
        description: Some("サンプル秘密".to_string()),
        expires_at: None,
        tags: vec![],
    }))
    .execute()
    .await?;

println!("Secret ID: {}", share_result.secret_id);
println!("Capsule TX: {}", share_result.capsule_tx_id);
```

#### `SecretSharingResult`

```rust
pub struct SecretSharingResult {
    pub secret_id: SecretId,
    pub capsule_tx_id: String,
    pub share_tx_ids: Vec<String>,
    pub kfrag_count: u8,
    pub owner_public_key: PublicKey,
}
```

## データ復元

### `recover`

共有された秘密を取得・復号するための `RecoverBuilder` を作成します。Type-Stateパターンを使用します。

```rust
pub fn recover(&self) -> RecoverBuilder<..., NotSet, NotSet>
```

**戻り値**: 必須フィールドが `NotSet` の `RecoverBuilder`。

#### RecoverBuilderメソッド

| メソッド | 種別 | 説明 |
|--------|------|-------------|
| `.secret_id(id: &SecretId)` | 必須 | 復元する秘密のID |
| `.requester_key(sk: SecretKey)` | 必須 | Requesterの秘密鍵（所有権移動） |
| `.execute()` | 終端（sync） | 復元操作を実行 |

```rust
let recovered = client.recover()
    .secret_id(&share_result.secret_id)
    .requester_key(requester_sk)
    .execute()?;

println!("Recovered: {:?}", recovered.recovered_secret);
```

#### `SecretRecoveryResult`

```rust
pub struct SecretRecoveryResult {
    pub recovered_secret: Vec<u8>,
    pub audit_tx_id: String,
}
```

**注意**: `SecretRecoveryResult` は `Zeroize` と `ZeroizeOnDrop` を実装しており、復元された秘密データはドロップ時に自動的にメモリからクリアされます。
