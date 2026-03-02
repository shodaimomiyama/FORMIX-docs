---
sidebar_position: 2
---

# Quick Start

This guide demonstrates how to run the FORMIX TPRE workflow using the CLI demo tool.

:::caution
FORMIX is currently in **infrastructure migration**. Production mode (AO Network / Arweave) is not operational at this time. This guide covers **local mode** only, which executes the full cryptographic workflow without any network dependency.
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
2. Encrypts data with a symmetric key, producing a **Capsule**
3. Splits the symmetric key via **Shamir Secret Sharing** (2-of-3)
4. Encrypts each share with **AES-GCM**
5. Generates **KFrags** (re-encryption key fragments)

Output is saved to `.formix-demo/owner/{secret_id}.local-share.json`.

#### Phase 2: Re-Encrypt (Holder performs proxy re-encryption)

```bash
cargo run --release -- local reencrypt
```

This phase:
1. Instantiates contract Holder processes locally (native execution of CosmWasm contract logic)
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

## Production Mode (Currently Unavailable)

:::danger Not Currently Operational
Production mode requires connectivity to the AO Network and Arweave, which is not available during the infrastructure migration. The following is preserved as reference for when the new production backend is ready.
:::

FORMIX was originally designed to operate on Arweave (storage) + AO Network (compute). The `FormixClient` high-level API provided a builder-pattern interface for production workflows:

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

This API handled encryption, Shamir secret splitting, Arweave storage, KFrag distribution to AO Holder processes, and CFrag collection automatically. It will be updated to target the new production backend once migration is complete.

## Next Steps

- Learn about the [Architecture](/docs/architecture/overview) to understand how FORMIX works internally
- Explore the [6-Phase Workflow](/docs/architecture/six-phase-workflow) for detailed protocol explanation
- Check the [API Reference](/docs/api/actions-api) for complete API documentation
