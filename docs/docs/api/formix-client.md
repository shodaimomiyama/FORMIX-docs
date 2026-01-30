---
sidebar_position: 0
---

# FormixClient API

The `FormixClient` provides a high-level interface that abstracts away low-level cryptographic operations.

## Initialization

### `init`

Creates a new `FormixClient` instance with a builder pattern.

```rust
pub fn init(wallet_path: &str) -> FormixClientBuilder
```

**Parameters**:
- `wallet_path`: Path to the Arweave wallet JSON file

**Returns**: A `FormixClientBuilder` for configuring the client.

```rust
use d_tpres::FormixClient;

let client = FormixClient::init("./wallet.json")
    .ao_gateway("https://ao-gateway.example.com")
    .arweave_gateway("https://arweave.net")
    .build()?;
```

## Key Management

### `generate_keypair`

Generates a new cryptographic key pair.

```rust
pub fn generate_keypair(&self) -> Result<(SecretKey, PublicKey), FormixError>
```

**Returns**: A tuple of `(SecretKey, PublicKey)`.

```rust
let (owner_sk, owner_pk) = client.generate_keypair()?;
```

## Data Sharing

### `share`

Encrypts and shares a secret with threshold parameters using a builder pattern.

```rust
pub fn share(&self) -> ShareBuilder
```

**Returns**: A `ShareBuilder` for configuring the share operation.

#### ShareBuilder Methods

| Method | Description |
|--------|-------------|
| `.secret(data: &[u8])` | The secret data to encrypt |
| `.threshold(n: u8)` | Minimum fragments needed for decryption |
| `.total_shares(n: u8)` | Total number of fragments to generate |
| `.owner_key(sk: &SecretKey)` | Owner's secret key |
| `.requester_key(pk: &PublicKey)` | Requester's public key |
| `.metadata(key: &str, value: &str)` | Optional metadata |
| `.execute()` | Execute the share operation |

```rust
let share_result = client.share()
    .secret(b"Sensitive data to be shared")
    .threshold(3)
    .total_shares(5)
    .owner_key(&owner_sk)
    .requester_key(&requester_pk)
    .metadata("description", "Example secret")
    .execute()?;

println!("Secret shared with ID: {}", share_result.secret_id);
```

## Data Recovery

### `recover`

Retrieves and decrypts a shared secret using a builder pattern.

```rust
pub fn recover(&self) -> RecoverBuilder
```

**Returns**: A `RecoverBuilder` for configuring the recovery operation.

#### RecoverBuilder Methods

| Method | Description |
|--------|-------------|
| `.secret_id(id: &str)` | The ID of the secret to recover |
| `.requester_key(sk: &SecretKey)` | Requester's secret key |
| `.owner_public_key(pk: &PublicKey)` | Owner's public key |
| `.execute()` | Execute the recovery operation |

```rust
let recovered = client.recover()
    .secret_id(&share_result.secret_id)
    .requester_key(&requester_sk)
    .owner_public_key(&owner_pk)
    .execute()?;

assert_eq!(recovered.as_slice(), b"Sensitive data to be shared");
```
