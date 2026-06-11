---
sidebar_position: 2
---

# Quick Start

This guide demonstrates how to run the FORMIX TPRE workflow using the CLI demo tool.

:::info Current Status
**Local mode** is the supported path today — it executes the full cryptographic workflow without any network dependency. Production mode (AO Network via HyperBEAM) is **experimental**; see [Current Status](/docs/intro#current-status).
:::

## Overview

The FORMIX workflow consists of three main roles:

1. **Owner** - Encrypts data and creates access policies
2. **Holder** - Stores re-encryption keys and performs proxy re-encryption
3. **Requester** - Requests access to encrypted data

In local mode, all three roles run on your machine — the Holder contract logic executes natively instead of on-chain.

## Local Demo (CLI)

The `demo/` directory provides a CLI tool that runs the complete TPRE workflow locally in three phases.

### Run All Phases at Once

```bash
cd demo
cargo run --release -- local all
```

Or using Make:

```bash
cd demo
make demo-local
```

This executes the full workflow: key generation → encryption & share → re-encryption → recovery & decryption.

### Run Phase by Phase

#### Phase 1: Share (Owner encrypts and splits secret)

```bash
cargo run --release -- local share
```

This phase:
1. Generates Umbral PRE key pairs for Owner and Requester
2. Splits the **secret** via **Shamir Secret Sharing** (2-of-3)
3. Encrypts each share with **AES-GCM** using the owner's symmetric key
4. Encapsulates the symmetric key with Umbral PRE, producing a **Capsule**
5. Generates **KFrags** (re-encryption key fragments)

Output is saved to `.formix-demo/owner/{secret_id}.local-share.json`.

#### Phase 2: Re-Encrypt (Holder performs proxy re-encryption)

```bash
cargo run --release -- local reencrypt
```

This phase:
1. Instantiates contract Holder processes locally (native execution of the Rust contract logic)
2. Submits KFrags and Capsule to each Holder
3. Each Holder independently generates a **CFrag** (re-encrypted capsule fragment)

Output is saved to `.formix-demo/contract/{secret_id}.local-reencrypt.json`.

#### Phase 3: Recover (Requester decrypts the secret)

```bash
cargo run --release -- local recover
```

This phase:
1. Collects threshold CFrags
2. Combines CFrags with the Capsule to recover the symmetric key via **Umbral PRE decapsulation**
3. Decrypts the encrypted shares with the recovered key
4. Reconstructs the original secret via **Shamir interpolation**

### Data Directory Structure

```
.formix-demo/
├── owner/
│   ├── owner.json                          # Owner key pair (hex)
│   └── {secret_id}.local-share.json        # Phase 1 output
├── requester/
│   └── requester.json                      # Requester key pair (hex)
└── contract/
    └── {secret_id}.local-reencrypt.json    # Phase 2 output (CFrags)
```

## Use FORMIX as a Library

You can drive the same workflow from your own Rust code using `FormixClient` with the in-memory Mock AO backend:

```rust
use std::sync::Arc;
use formix::actions::FormixClient;
use formix::adapter::external::mock_ao::MockAOClient;
use formix::usecase::core::contract_storage::ContractStorageImpl;
use formix::usecase::core::storage::ArweaveStorageServiceImpl;

#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Client with in-memory Mock AO backend
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

    // Generate key pairs
    let (owner_sk, _owner_pk) = client.generate_keypair()?;
    let (_requester_sk, requester_pk) = client.generate_keypair()?;

    // Share a secret with a 2-of-3 threshold (Phase 1)
    let result = client.share()
        .secret(b"Hello, FORMIX!".to_vec())
        .threshold(2)
        .total_shares(3)
        .owner_key(owner_sk)
        .requester_key(requester_pk)
        .execute()
        .await?;

    println!("Secret ID:   {}", result.secret_id);
    println!("Capsule TX:  {}", result.capsule_tx_id);
    println!("kFrag count: {}", result.kfrag_count);
    Ok(())
}
```

The complete version (including a recovery attempt) ships with the crate:

```bash
cd client
cargo run --example basic_usage
```

:::note
With the Mock backend, **recovery fails with `ResourceNotFound`** — there are no Holder processes producing cFrags. This is expected; use the demo CLI above for the full share → reencrypt → recover cycle. See the [FormixClient API](/docs/api/formix-client) for details.
:::

## Production Mode (Experimental)

:::caution Experimental
Production connectivity to the AO Network via **HyperBEAM** (`hyperbeam` feature flag) is implemented but end-to-end integration is still in progress. Additionally, the gateway URL parameters of `FormixClient::new()` are currently stored but not wired into the network layer ([Issue #51](https://github.com/shodaimomiyama/FORMIX/issues/51)/#52). The following is a reference for the production workflow:
:::

FORMIX is designed to operate on Arweave (storage) + AO Network (compute). The `FormixClient` high-level API provides a builder-pattern interface for production workflows:

```rust
use formix::actions::client::FormixClient;

// Production client initialization (requires AO process + Arweave gateway)
let client = FormixClient::new(
    "your-ao-process-id".to_string(),
    "your-wallet-address".to_string(),
    "https://ao.arweave.net".to_string(),
    "https://arweave.net".to_string(),
);

let (owner_sk, owner_pk) = client.generate_keypair()?;
let (requester_sk, requester_pk) = client.generate_keypair()?;

// Share a secret
let share_result = client.share()
    .secret(b"Sensitive data to be shared".to_vec())
    .threshold(3)
    .total_shares(5)
    .owner_key(owner_sk)
    .requester_key(requester_pk)
    .execute()
    .await?;

// Recover a secret
let recovered = client.recover()
    .secret_id(&share_result.secret_id)
    .requester_key(requester_sk)
    .owner_key(owner_pk)
    .execute()
    .await?;
```

This API handles encryption, Shamir secret splitting, Arweave storage, KFrag distribution to AO Holder processes, and CFrag collection automatically. It becomes fully operational once HyperBEAM end-to-end integration lands.

## Next Steps

- Learn about the [Architecture](/docs/architecture/overview) to understand how FORMIX works internally
- Explore the [6-Phase Workflow](/docs/architecture/six-phase-workflow) for detailed protocol explanation
- Check the [API Reference](/docs/api/actions-api) for complete API documentation
