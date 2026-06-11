---
sidebar_position: 0
---

# FormixClient API

:::info 現在のステータス
`FormixClient` APIは**ローカルモード**（インメモリのMock AOバックエンド、デフォルト）では安定しており、完全に機能します。**HyperBEAM**（`hyperbeam` フィーチャーフラグ）経由の本番接続は**実験的**であり、エンドツーエンド統合は進行中です。下記の[フィーチャーフラグ](#feature-flags)と、ローカルワークフローの手順については[クイックスタート](/docs/getting-started/quick-start)を参照してください。
:::

`FormixClient` はFORMIXクライアントライブラリのメインエントリーポイントであり、内部の `ActionsContainer` をラップして、ビルダーパターンによるshare/recover操作のクリーンなパブリックAPIを提供します。

## 初期化

### `new`

事前設定された値で `FormixClient` を作成します。ウォレット/プロセスのセットアップを外部で処理するシナリオ向けです。

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

:::caution ゲートウェイURLは現在無視されます
`ao_gateway_url` と `arweave_gateway_url` は構造体に保存されますが、**まだ内部の `ActionsContainer` には接続されていません** — [Issue #51](https://github.com/shodaimomiyama/FORMIX/issues/51) / #52 が解決されるまで、すべてのネットワークI/Oはデフォルトのインメモリモック実装を使用します。
:::

このクライアントは**シングルユーザー（セルフサービス）ワークフロー**向けに設計されています。すべての操作で1つの `process_id` を使用し、OwnerとRequesterで別々のプロセスIDを用意する必要はありません。

```rust
use formix::actions::client::FormixClient;

let client = FormixClient::new(
    "process-id".to_string(),
    "wallet-address".to_string(),
    "https://ao.arweave.net".to_string(),
    "https://arweave.net".to_string(),
);
```

### `init`（未実装）

JWKウォレットを読み込み、AOプロセスを検出/起動して `FormixClient` を初期化する予定のメソッドです。

```rust
pub struct InitConfig {
    /// JWKウォレットファイルへのパス
    pub wallet_path: String,
    /// AOゲートウェイURL（デフォルト: "https://ao.arweave.net"）
    pub ao_gateway_url: Option<String>,
    /// ArweaveゲートウェイURL（デフォルト: "https://arweave.net"）
    pub arweave_gateway_url: Option<String>,
}

pub fn init(config: InitConfig) -> ActionResult<Self>
```

**注意**: このメソッドは**未実装**です。現在は常に `ActionError::WorkflowFailed` を返します（JWKウォレットの読み込みとAOプロセスの起動は [Issue #60](https://github.com/shodaimomiyama/FORMIX/issues/60) で追跡されています）。現在の開発では `new()` または `with_storage()` を使用してください。

### `with_storage`

事前設定されたストレージコンポーネントで `FormixClient` を作成します。これは実行可能なサンプルで使用されているコンストラクタであり、動作するローカルクライアントをセットアップする推奨方法です。

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

```rust
use std::sync::Arc;
use formix::actions::FormixClient;
use formix::adapter::external::mock_ao::MockAOClient;
use formix::usecase::core::contract_storage::ContractStorageImpl;
use formix::usecase::core::storage::ArweaveStorageServiceImpl;

let mock_ao = Arc::new(MockAOClient::new());
let arweave = Arc::new(ArweaveStorageServiceImpl::default());
let contract = Arc::new(ContractStorageImpl::new_single_process(mock_ao));

let client = FormixClient::with_storage(
    "process_001".to_string(),
    "wallet_address_example".to_string(),
    "https://ao.arweave.net".to_string(),
    "https://arweave.net".to_string(),
    arweave,
    contract,
);
```

### プロパティアクセサ

```rust
pub fn process_id(&self) -> &str
pub fn wallet_address(&self) -> &str
pub fn ao_gateway_url(&self) -> &str
pub fn arweave_gateway_url(&self) -> &str
```

## フィーチャーフラグ {#feature-flags}

| フィーチャー | デフォルト | 説明 |
|---------|---------|-------------|
| *(なし)* | ✓ | インメモリの**Mock AOバックエンド** — Phase 1ワークフロー全体をローカルで実行、ネットワークI/Oなし |
| `hyperbeam` | | **実験的。** HyperBEAM経由の実際のAO Network接続（RFC-9421 `rsa-pss-sha512` HTTPメッセージ署名、TABMマルチパートエンコーディング）。エンドツーエンド統合は進行中 |
| `key-export` | | `SecretKey::as_bytes()` / `SecretKey::from_bytes()` / `PublicKey::from_bytes()` を公開。**テスト専用** — 本番では有効化しないでください |

```toml
[dependencies]
formix = { version = "0.1" }
tokio = { version = "1", features = ["rt", "macros"] }
```

## 定数と制限 {#constants--limits}

`formix::usecase::core::crypto::constants` で定義されています:

| 定数 | 値 | 意味 |
|----------|-------|---------|
| `MIN_THRESHOLD` | `2` | 最小閾値 `k` |
| `MAX_SHARES` | `20` | 最大総シェア数 `n` |
| `KEY_SIZE_BYTES` | `32` | 秘密鍵のサイズ |
| `PUBLIC_KEY_SIZE_BYTES` | `33` | 公開鍵のサイズ（圧縮形式） |
| `AES_GCM_NONCE_SIZE` | `12` | AES-256-GCMのnonceサイズ |
| `AES_GCM_TAG_SIZE` | `16` | AES-256-GCMのタグサイズ |
| `AES_KEY_SIZE` | `32` | AES-256の鍵サイズ |

閾値パラメータは **`2 ≤ k ≤ n ≤ 20`** を満たす必要があります。違反した場合は `ActionError::ValidationFailed` で拒否されます。

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

**戻り値**: すべての必須フィールドが初期状態で `NotSet` の `ShareBuilder`。

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
        description: Some("Example secret".to_string()),
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

共有された秘密を取得・復号するための `RecoverBuilder` を作成します。同じくType-Stateパターンを使用します。

```rust
pub fn recover(&self) -> RecoverBuilder<..., NotSet, NotSet, NotSet>
```

**戻り値**: 必須フィールドが初期状態で `NotSet` の `RecoverBuilder`。

#### RecoverBuilderメソッド

| メソッド | 種別 | 説明 |
|--------|------|-------------|
| `.secret_id(id: &SecretId)` | 必須 | 復元する秘密のID |
| `.requester_key(sk: SecretKey)` | 必須 | Requesterの秘密鍵（所有権移動） |
| `.owner_key(pk: PublicKey)` | 必須 | Ownerの公開鍵（所有権移動） |
| `.execute()` | 終端（async） | 復元操作を実行 |

```rust
let recovered = client.recover()
    .secret_id(&share_result.secret_id)
    .requester_key(requester_sk)
    .owner_key(owner_pk)
    .execute()
    .await?;

println!("Recovered: {:?}", recovered.recovered_secret);
```

#### `SecretRecoveryResult`

```rust
pub struct SecretRecoveryResult {
    pub recovered_secret: Vec<u8>,
    pub audit_tx_id: String,
}
```

**注意**: `SecretRecoveryResult` は `Zeroize` と `ZeroizeOnDrop` を実装しており、復元された秘密データはドロップ時に自動的にメモリからクリアされます（`audit_tx_id` は `#[zeroize(skip)]` により除外されます）。

## データ型

### `SecretMetadata`

共有された秘密に付加できるオプションのメタデータ:

```rust
#[derive(Debug, Clone, Default)]
pub struct SecretMetadata {
    /// 秘密の人間が読める名前
    pub name: Option<String>,
    /// 秘密の説明
    pub description: Option<String>,
    /// 有効期限タイムスタンプ（Unixエポック秒）
    pub expires_at: Option<u64>,
    /// 分類用のカスタムタグ
    pub tags: Vec<String>,
}
```

### `SecretStatus`

```rust
#[non_exhaustive]
pub enum SecretStatus {
    Created,            // Phase 1完了
    KFragsDistributed,  // Phase 2進行中
    Recovered,          // 少なくとも1回復元済み
    Revoked,            // 復元不可
}
```

ヘルパー: `can_recover()`（`Revoked` 以外はすべてtrue）、`is_active()`（`Revoked` の場合のみfalse）。

### 鍵の型

- **`SecretKey`** — ムーブ専用（`Clone` なし）。ドロップ時にゼロ化されます。`SecretKey` を受け取るビルダーメソッドは所有権を消費します。
- **`PublicKey`** — クローン可能（`pub key_data: Vec<u8>`）。同じくドロップ時にゼロ化されます。

## エラーハンドリング

すべての操作は `ActionResult<T> = Result<T, ActionError>` を返します。`ActionError` は `#[non_exhaustive]` です:

| バリアント | フィールド | 発生条件 |
|---------|--------|------|
| `ValidationFailed` | `code`, `message` | 入力バリデーションに失敗（例: `secret_empty`、`invalid_threshold`） |
| `WorkflowFailed` | `message` | ユースケースワークフローのステップが失敗（未実装の `init()` もこれを返します） |
| `ResourceNotFound` | `resource` | 参照された秘密/プロセス/cFragが存在しない |
| `CryptoError` | `message` | 暗号操作に失敗 |
| `PartialStorageFailure` | `capsule_tx_id`, `successful_share_tx_ids`, `failed_shares: Vec<(String, String)>`, `message` | Arweaveのバッチストレージが部分的に失敗。Arweaveは**イミュータブルであり、ロールバックは存在しません**。このバリアントは、呼び出し側がリトライまたはクリーンアップできるよう、成功したシェアトランザクションと失敗したものを報告します |

```rust
use formix::actions::ActionError;

match client.share()./* ... */.execute().await {
    Ok(result) => println!("Secret ID: {}", result.secret_id),
    Err(ActionError::ValidationFailed { code, message }) => {
        eprintln!("Invalid input [{code}]: {message}");
    }
    Err(ActionError::PartialStorageFailure { successful_share_tx_ids, failed_shares, .. }) => {
        eprintln!("{} shares stored, {} failed", successful_share_tx_ids.len(), failed_shares.len());
    }
    Err(e) => eprintln!("Share failed: {e}"),
}
```

## 実行可能なサンプル

完全に動作するサンプルがクレートに同梱されています:

```bash
cd client
cargo run --example basic_usage
```

このサンプルは、Mock AOバックエンドを使った `with_storage()`、鍵生成、2-of-3のシェア、そして復元をデモンストレーションします。`ContractStorageImpl::new_single_process` を使うことで、**共有 → 再暗号化 → 復元の完全なサイクルがインメモリで実行されます** — モックバックエンドがHolderの再暗号化をローカルで実行するため、サンプルは秘密の復元と監査トランザクションIDの取得で完了します。
