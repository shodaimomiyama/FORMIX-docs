---
sidebar_position: 0
---

# FormixClient API

:::info Current Status
The `FormixClient` API is stable and fully functional in **local mode** (in-memory Mock AO backend, the default). Production connectivity via **HyperBEAM** (`hyperbeam` feature flag) is **experimental** — end-to-end integration is in progress. See [Feature Flags](#feature-flags) below and [Quick Start](/docs/getting-started/quick-start) for local workflow instructions.
:::

The `FormixClient` provides the main entry point for the FORMIX client library, wrapping the internal `ActionsContainer` and providing a clean public API with builder-pattern share/recover operations.

## Initialization

### `new`

Creates a `FormixClient` with pre-configured values. Intended for scenarios where wallet/process setup is handled externally.

```rust
pub fn new(
    process_id: String,
    wallet_address: String,
    ao_gateway_url: String,
    arweave_gateway_url: String,
) -> Self
```

**Parameters**:
- `process_id`: AO process ID for this client
- `wallet_address`: Owner's wallet address
- `ao_gateway_url`: AO Network gateway URL
- `arweave_gateway_url`: Arweave gateway URL

:::caution Gateway URLs are currently ignored
`ao_gateway_url` and `arweave_gateway_url` are stored on the struct but **not yet wired into the internal `ActionsContainer`** — all network I/O uses the default in-memory mock implementations until [Issue #51](https://github.com/shodaimomiyama/FORMIX/issues/51) / #52 are resolved.
:::

The client is designed for **single-user (self-service) workflows**: one `process_id` is used for all operations; separate owner/requester process IDs are not needed.

```rust
use formix::actions::client::FormixClient;

let client = FormixClient::new(
    "process-id".to_string(),
    "wallet-address".to_string(),
    "https://ao.arweave.net".to_string(),
    "https://arweave.net".to_string(),
);
```

### `init` (Not Implemented)

Will initialize a `FormixClient` by loading a JWK wallet and detecting/spawning an AO Process.

```rust
pub struct InitConfig {
    /// Path to JWK wallet file
    pub wallet_path: String,
    /// AO gateway URL (default: "https://ao.arweave.net")
    pub ao_gateway_url: Option<String>,
    /// Arweave gateway URL (default: "https://arweave.net")
    pub arweave_gateway_url: Option<String>,
}

pub fn init(config: InitConfig) -> ActionResult<Self>
```

**Note**: This method is **not yet implemented** — it currently always returns `ActionError::WorkflowFailed` (JWK wallet loading and AO process spawning are tracked in [Issue #60](https://github.com/shodaimomiyama/FORMIX/issues/60)). Use `new()` or `with_storage()` for current development.

### `with_storage`

Creates a `FormixClient` with pre-configured storage components. This is the constructor used by the runnable example and the recommended way to set up a working local client.

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

### Property Accessors

```rust
pub fn process_id(&self) -> &str
pub fn wallet_address(&self) -> &str
pub fn ao_gateway_url(&self) -> &str
pub fn arweave_gateway_url(&self) -> &str
```

## Feature Flags

| Feature | Default | Description |
|---------|---------|-------------|
| *(none)* | ✓ | In-memory **Mock AO backend** — full Phase 1 workflow locally, no network I/O |
| `hyperbeam` | | **Experimental.** Real AO Network connectivity via HyperBEAM (RFC-9421 `rsa-pss-sha512` HTTP message signatures, TABM multipart encoding). End-to-end integration is in progress |
| `key-export` | | Exposes `SecretKey::as_bytes()` / `SecretKey::from_bytes()` / `PublicKey::from_bytes()`. **Testing only** — do not enable in production |

```toml
[dependencies]
formix = { version = "0.1" }
tokio = { version = "1", features = ["rt", "macros"] }
```

## Constants & Limits

Defined in `formix::usecase::core::crypto::constants`:

| Constant | Value | Meaning |
|----------|-------|---------|
| `MIN_THRESHOLD` | `2` | Minimum threshold `k` |
| `MAX_SHARES` | `20` | Maximum total shares `n` |
| `KEY_SIZE_BYTES` | `32` | Secret key size |
| `PUBLIC_KEY_SIZE_BYTES` | `33` | Public key size (compressed) |
| `AES_GCM_NONCE_SIZE` | `12` | AES-256-GCM nonce size |
| `AES_GCM_TAG_SIZE` | `16` | AES-256-GCM tag size |
| `AES_KEY_SIZE` | `32` | AES-256 key size |

Threshold parameters must satisfy **`2 ≤ k ≤ n ≤ 20`**; violations are rejected with `ActionError::ValidationFailed`.

## Key Management

### `generate_keypair`

Generates a new Umbral PRE cryptographic key pair.

```rust
pub fn generate_keypair(&self) -> ActionResult<(SecretKey, PublicKey)>
```

**Returns**: A tuple of `(SecretKey, PublicKey)`.

```rust
let (owner_sk, owner_pk) = client.generate_keypair()?;
```

## Data Sharing

### `share`

Creates a `ShareBuilder` for encrypting and sharing a secret with threshold parameters. Uses the **type-state pattern** for compile-time enforcement of required parameters.

```rust
pub fn share(&self) -> ShareBuilder<..., NotSet, NotSet, NotSet, NotSet, NotSet>
```

**Returns**: A `ShareBuilder` with all required fields initially `NotSet`.

#### ShareBuilder Methods

| Method | Type | Description |
|--------|------|-------------|
| `.secret(data: Vec<u8>)` | Required | The secret data to encrypt |
| `.threshold(k: u8)` | Required | Minimum fragments needed for recovery |
| `.total_shares(n: u8)` | Required | Total number of fragments to generate |
| `.owner_key(sk: SecretKey)` | Required | Owner's secret key (owned) |
| `.requester_key(pk: PublicKey)` | Required | Requester's public key (owned) |
| `.metadata(meta: Option<SecretMetadata>)` | Optional | Secret metadata |
| `.execute()` | Terminal (async) | Execute the share operation |

The `execute()` method is only callable when **all required fields** have been set (compile-time check).

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

## Data Recovery

### `recover`

Creates a `RecoverBuilder` for retrieving and decrypting a shared secret. Also uses the type-state pattern.

```rust
pub fn recover(&self) -> RecoverBuilder<..., NotSet, NotSet, NotSet>
```

**Returns**: A `RecoverBuilder` with required fields initially `NotSet`.

#### RecoverBuilder Methods

| Method | Type | Description |
|--------|------|-------------|
| `.secret_id(id: &SecretId)` | Required | The ID of the secret to recover |
| `.requester_key(sk: SecretKey)` | Required | Requester's secret key (owned) |
| `.owner_key(pk: PublicKey)` | Required | Owner's public key (owned) |
| `.execute()` | Terminal (async) | Execute the recovery operation |

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

**Note**: `SecretRecoveryResult` implements `Zeroize` and `ZeroizeOnDrop` - recovered secret data is automatically cleared from memory when dropped (`audit_tx_id` is excluded via `#[zeroize(skip)]`).

## Data Types

### `SecretMetadata`

Optional metadata attached to a shared secret:

```rust
#[derive(Debug, Clone, Default)]
pub struct SecretMetadata {
    /// Human-readable name for the secret
    pub name: Option<String>,
    /// Description of the secret
    pub description: Option<String>,
    /// Expiration timestamp (Unix epoch seconds)
    pub expires_at: Option<u64>,
    /// Custom tags for categorization
    pub tags: Vec<String>,
}
```

### `SecretStatus`

```rust
#[non_exhaustive]
pub enum SecretStatus {
    Created,            // Phase 1 completed
    KFragsDistributed,  // Phase 2 in progress
    Recovered,          // Recovered at least once
    Revoked,            // Can no longer be recovered
}
```

Helpers: `can_recover()` (true for all but `Revoked`), `is_active()` (false only for `Revoked`).

### Key Types

- **`SecretKey`** — move-only (no `Clone`); zeroized on drop. Builder methods that take a `SecretKey` consume it.
- **`PublicKey`** — cloneable (`pub key_data: Vec<u8>`); also zeroized on drop.

## Error Handling

All operations return `ActionResult<T> = Result<T, ActionError>`. `ActionError` is `#[non_exhaustive]`:

| Variant | Fields | When |
|---------|--------|------|
| `ValidationFailed` | `code`, `message` | Input validation failed (e.g. `secret_empty`, `invalid_threshold`) |
| `WorkflowFailed` | `message` | A use-case workflow step failed (also returned by the unimplemented `init()`) |
| `ResourceNotFound` | `resource` | Referenced secret/process/cFrag does not exist |
| `CryptoError` | `message` | Cryptographic operation failed |
| `PartialStorageFailure` | `capsule_tx_id`, `successful_share_tx_ids`, `failed_shares: Vec<(String, String)>`, `message` | Arweave batch storage partially failed. Arweave is **immutable — there is no rollback**; the variant reports which share transactions succeeded and which failed so the caller can retry or clean up |

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

## Runnable Example

A complete, working example ships with the crate:

```bash
cd client
cargo run --example basic_usage
```

It demonstrates `with_storage()` with the Mock AO backend, key generation, a 2-of-3 share, and a recovery attempt.

:::note Expected behavior with the Mock backend
Recovery with `MockAOClient` fails with `ActionError::ResourceNotFound` — the mock has no Holder processes producing cFrags. This is expected; full recovery requires AO Network connectivity (Phase 2 re-encryption). Use the [demo CLI](/docs/getting-started/quick-start) to run the complete share → reencrypt → recover workflow locally.
:::
