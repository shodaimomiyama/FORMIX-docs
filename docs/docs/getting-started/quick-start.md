---
sidebar_position: 2
---

# Quick Start

This guide demonstrates how to share and recover secrets using the `DTpresClient` high-level API.

## Overview

The FORMIX workflow consists of three main roles:

1. **Owner** - Encrypts data and creates access policies
2. **Holder** - Stores encrypted data and manages re-encryption keys
3. **Requester** - Requests access to encrypted data

The `DTpresClient` abstracts away low-level cryptographic operations (Capsule, KFrag, CFrag) and provides a simple builder-pattern API with compile-time safety via the type-state pattern.

## Basic Usage Example

### Step 1: Initialize the Client

Create a `DTpresClient` instance with your process and gateway configuration:

```rust
use formix::actions::client::DTpresClient;

let client = DTpresClient::new(
    "your-ao-process-id".to_string(),
    "your-wallet-address".to_string(),
    "https://ao.arweave.net".to_string(),
    "https://arweave.net".to_string(),
);
```

### Step 2: Generate Key Pairs

Generate key pairs for the Owner and Requester:

```rust
let (owner_sk, owner_pk) = client.generate_keypair()?;
let (requester_sk, requester_pk) = client.generate_keypair()?;
```

### Step 3: Share a Secret (Owner)

Use the builder pattern to encrypt and share a secret with threshold parameters:

```rust
let share_result = client.share()
    .secret(b"Sensitive data to be shared".to_vec())
    .threshold(3)
    .total_shares(5)
    .owner_key(owner_sk)
    .requester_key(requester_pk)
    .execute()
    .await?;

println!("Secret shared with ID: {}", share_result.secret_id);
println!("Capsule stored at: {}", share_result.capsule_tx_id);
println!("KFrags distributed: {}", share_result.kfrag_count);
```

The `share` handles encryption, Shamir secret splitting, Arweave storage, KFrag generation, and distribution to the AO holder process automatically.

### Step 4: Recover the Secret (Requester)

Use the recovery builder to retrieve and decrypt the shared secret:

```rust
let recovered = client.recover()
    .secret_id(&share_result.secret_id)
    .requester_key(requester_sk)
    .execute()?;

assert_eq!(recovered.recovered_secret, b"Sensitive data to be shared");
```

The `recover` handles re-encryption requests, CFrag collection, and decryption automatically.

## Next Steps

- Learn about the [Architecture](/docs/architecture/overview) to understand how FORMIX works internally
- Explore the [6-Phase Workflow](/docs/architecture/six-phase-workflow) for detailed protocol explanation
- Check the [API Reference](/docs/api/actions-api) for complete API documentation
