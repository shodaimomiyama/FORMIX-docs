---
sidebar_position: 0
---

# DTpresClient API

The `DTpresClient` provides the main entry point for the FORMIX client library, wrapping the internal `ActionsContainer` and providing a clean public API with builder-pattern share/recover operations.

## Initialization

### `new`

Creates a `DTpresClient` with pre-configured values. Intended for scenarios where wallet/process setup is handled externally.

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

```rust
use formix::actions::client::DTpresClient;

let client = DTpresClient::new(
    "process-id".to_string(),
    "wallet-address".to_string(),
    "https://ao.arweave.net".to_string(),
    "https://arweave.net".to_string(),
);
```

### `init` (Planned)

Initializes a `DTpresClient` by loading a JWK wallet and detecting/spawning an AO Process.

```rust
pub fn init(config: InitConfig) -> ActionResult<Self>
```

**Note**: This method is not yet implemented. Use `new()` for current development.

### `with_storage`

Creates a `DTpresClient` with pre-configured storage components for advanced use cases.

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
pub fn recover(&self) -> RecoverBuilder<..., NotSet, NotSet>
```

**Returns**: A `RecoverBuilder` with required fields initially `NotSet`.

#### RecoverBuilder Methods

| Method | Type | Description |
|--------|------|-------------|
| `.secret_id(id: &SecretId)` | Required | The ID of the secret to recover |
| `.requester_key(sk: SecretKey)` | Required | Requester's secret key (owned) |
| `.execute()` | Terminal (sync) | Execute the recovery operation |

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

**Note**: `SecretRecoveryResult` implements `Zeroize` and `ZeroizeOnDrop` - recovered secret data is automatically cleared from memory when dropped.
