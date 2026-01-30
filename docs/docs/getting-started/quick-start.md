---
sidebar_position: 2
---

# Quick Start

This guide demonstrates how to share and recover secrets using the `FormixClient` high-level API.

## Overview

The FORMIX workflow consists of three main roles:

1. **Owner** - Encrypts data and creates access policies
2. **Holder** - Stores encrypted data and manages re-encryption keys
3. **Requester** - Requests access to encrypted data

The `FormixClient` abstracts away low-level cryptographic operations (Capsule, KFrag, CFrag) and provides a simple builder-pattern API.

## Basic Usage Example

### Step 1: Initialize the Client

Create a `FormixClient` instance with your wallet path:

```rust
use d_tpres::FormixClient;

let client = FormixClient::init("./wallet.json")
    .ao_gateway("https://ao-gateway.example.com")
    .arweave_gateway("https://arweave.net")
    .build()?;
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
    .secret(b"Sensitive data to be shared")
    .threshold(3)
    .total_shares(5)
    .owner_key(&owner_sk)
    .requester_key(&requester_pk)
    .metadata("description", "Example secret")
    .execute()?;

println!("Secret shared with ID: {}", share_result.secret_id);
```

The `share` handles encryption, key fragment generation, and distribution to holder nodes automatically.

### Step 4: Recover the Secret (Requester)

Use the recovery builder to retrieve and decrypt the shared secret:

```rust
let recovered = client.recover()
    .secret_id(&share_result.secret_id)
    .requester_key(&requester_sk)
    .owner_public_key(&owner_pk)
    .execute()?;

assert_eq!(recovered.as_slice(), b"Sensitive data to be shared");
```

The `recover` handles re-encryption requests, fragment collection, and decryption automatically.

## Next Steps

- Learn about the [Architecture](/docs/architecture/overview) to understand how FORMIX works internally
- Explore the [6-Phase Workflow](/docs/architecture/six-phase-workflow) for detailed protocol explanation
- Check the [API Reference](/docs/api/actions-api) for complete API documentation
