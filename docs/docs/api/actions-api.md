---
sidebar_position: 1
---

# Actions Layer API

The Actions layer provides the primary interface for interacting with FORMIX. All external operations are performed through this layer.

## Overview

```rust
use formix::actions::*;
```

The Actions layer exposes functions for:
- Key generation and management
- Data encryption and decryption
- Re-encryption key distribution
- Access request handling

## Key Management

### `generate_keypair`

Generates a new cryptographic key pair.

```rust
pub fn generate_keypair() -> Result<KeyPair, ActionError>
```

**Returns**: A new `KeyPair` containing public and private keys.

**Example**:
```rust
let keypair = generate_keypair()?;
println!("Public key: {:?}", keypair.public_key());
```

### `derive_public_key`

Derives a public key from a private key.

```rust
pub fn derive_public_key(private_key: &PrivateKey) -> PublicKey
```

## Encryption Operations

### `encrypt_data`

Encrypts data using a public key.

```rust
pub fn encrypt_data(
    public_key: &PublicKey,
    data: &SecretData,
) -> Result<(Capsule, Ciphertext), ActionError>
```

**Parameters**:
- `public_key`: The owner's public key
- `data`: Data to encrypt

**Returns**: A tuple of `(Capsule, Ciphertext)`

**Example**:
```rust
let data = SecretData::new(b"sensitive information".to_vec());
let (capsule, ciphertext) = encrypt_data(&owner_pk, &data)?;
```

### `decrypt_data`

Decrypts data using the owner's private key (direct decryption).

```rust
pub fn decrypt_data(
    private_key: &PrivateKey,
    capsule: &Capsule,
    ciphertext: &Ciphertext,
) -> Result<SecretData, ActionError>
```

## Re-Encryption Key Generation

### `generate_kfrags`

Generates re-encryption key fragments for a requester.

```rust
pub fn generate_kfrags(
    owner_keypair: &KeyPair,
    requester_public_key: &PublicKey,
    threshold: u8,
    shares: u8,
) -> Result<Vec<KFrag>, ActionError>
```

**Parameters**:
- `owner_keypair`: Owner's key pair
- `requester_public_key`: Intended recipient's public key
- `threshold`: Minimum fragments needed for decryption
- `shares`: Total number of fragments to generate

**Returns**: Vector of `KFrag` objects

**Example**:
```rust
let kfrags = generate_kfrags(
    &owner_keypair,
    &requester_pk,
    3,  // threshold
    5,  // total shares
)?;
```

### `verify_kfrag`

Verifies the correctness of a KFrag.

```rust
pub fn verify_kfrag(
    kfrag: &KFrag,
    owner_public_key: &PublicKey,
    requester_public_key: &PublicKey,
) -> Result<bool, ActionError>
```

## Re-Encryption Operations

### `reencrypt`

Performs re-encryption using a KFrag.

```rust
pub fn reencrypt(
    capsule: &Capsule,
    kfrag: &KFrag,
) -> Result<CFrag, ActionError>
```

**Parameters**:
- `capsule`: The original capsule from encryption
- `kfrag`: A re-encryption key fragment

**Returns**: A `CFrag` (re-encrypted capsule fragment)

### `verify_cfrag`

Verifies the correctness of a CFrag.

```rust
pub fn verify_cfrag(
    cfrag: &CFrag,
    capsule: &Capsule,
    owner_public_key: &PublicKey,
    requester_public_key: &PublicKey,
) -> Result<bool, ActionError>
```

## Decryption with Re-Encryption

### `decrypt_reencrypted`

Decrypts data using re-encrypted fragments.

```rust
pub fn decrypt_reencrypted(
    requester_keypair: &KeyPair,
    owner_public_key: &PublicKey,
    capsule: &Capsule,
    cfrags: &[CFrag],
    ciphertext: &Ciphertext,
) -> Result<SecretData, ActionError>
```

**Parameters**:
- `requester_keypair`: Requester's key pair
- `owner_public_key`: Original owner's public key
- `capsule`: Original capsule
- `cfrags`: Collection of re-encrypted fragments (>= threshold)
- `ciphertext`: Encrypted data

**Returns**: Decrypted `SecretData`

**Example**:
```rust
let plaintext = decrypt_reencrypted(
    &requester_keypair,
    &owner_pk,
    &capsule,
    &cfrags,
    &ciphertext,
)?;
```

## Domain Entities

### Secret

Represents encrypted data with its metadata.

```rust
pub struct Secret {
    pub id: SecretId,
    pub capsule: Capsule,
    pub ciphertext_ref: ArweaveRef,
    pub owner: PublicKey,
    pub created_at: Timestamp,
}
```

### Capsule

Contains the encapsulated symmetric key.

```rust
pub struct Capsule {
    pub point_e: G1Point,
    pub point_v: G1Point,
    pub signature: Signature,
}
```

### KFrag

A re-encryption key fragment.

```rust
pub struct KFrag {
    pub id: FragmentId,
    pub key: G2Point,
    pub precursor: G1Point,
    pub proof: KFragProof,
}
```

### CFrag

A re-encrypted capsule fragment.

```rust
pub struct CFrag {
    pub point_e1: G1Point,
    pub point_v1: G1Point,
    pub kfrag_id: FragmentId,
    pub proof: CFragProof,
}
```

## Value Objects

### KeyPair

```rust
pub struct KeyPair {
    private_key: PrivateKey,
    public_key: PublicKey,
}

impl KeyPair {
    pub fn generate() -> Self;
    pub fn public_key(&self) -> &PublicKey;
    pub fn private_key(&self) -> &PrivateKey;
}
```

### SecretData

```rust
pub struct SecretData(Vec<u8>);

impl SecretData {
    pub fn new(data: Vec<u8>) -> Self;
    pub fn as_bytes(&self) -> &[u8];
}
```

## Error Types

```rust
pub enum ActionError {
    InvalidKey(String),
    EncryptionFailed(String),
    DecryptionFailed(String),
    InvalidThreshold { threshold: u8, shares: u8 },
    InsufficientFragments { required: u8, provided: u8 },
    VerificationFailed(String),
    StorageError(String),
}
```

## Next Steps

- [Project Structure](/docs/development/project-structure) - Code organization
- [Development Commands](/docs/development/commands) - Build and test commands
