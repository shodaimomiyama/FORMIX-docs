---
sidebar_position: 2
---

# 6-Phase Workflow

The FORMIX protocol operates through six distinct phases, each performing specific cryptographic operations.

## Phase Overview

```
Phase 1        Phase 2        Phase 3        Phase 4        Phase 5        Phase 6
┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐
│Setup │──────│Encrypt│─────│Distrib│─────│Request│─────│Re-Enc│──────│Decrypt│
└──────┘      └──────┘      └──────┘      └──────┘      └──────┘      └──────┘
  Owner        Owner         Owner          Requester     Holders      Requester
```

## Phase 1: Setup

**Actor**: Owner

The owner generates Umbral PRE cryptographic key pairs and initializes the client.

```rust
use formix::actions::client::DTpresClient;

// Initialize client
let client = DTpresClient::new(
    "owner-process-id".to_string(),
    "wallet-address".to_string(),
    "https://ao.arweave.net".to_string(),
    "https://arweave.net".to_string(),
);

// Generate key pairs
let (owner_sk, owner_pk) = client.generate_keypair()?;
let (requester_sk, requester_pk) = client.generate_keypair()?;
```

**Outputs**:
- Owner public/private key pair (Umbral PRE)
- Requester public/private key pair (Umbral PRE)

## Phase 2: Encryption

**Actor**: Owner

The owner encrypts data using Umbral PRE and creates Shamir shares. Internally, the `share()` builder orchestrates:

1. PRE encryption with owner's public key → produces **Capsule**
2. Shamir Secret Sharing of the symmetric key → produces **ShareCollection**
3. AES-GCM encryption of each share with the owner's symmetric key

```rust
// This is handled internally by the share() builder
// Capsule = PRE_Enc(pk_owner, k_owner)
// ShareCollection = { C_i = AES_GCM(k_owner, f(i)) } for i = 1..n
```

**Outputs**:
- `Capsule` - Serialized Umbral capsule (encapsulated symmetric key)
- `ShareCollection` - n encrypted Shamir shares
- Arweave transaction IDs for both

### Capsule Structure

```rust
Capsule {
    id: CapsuleId,                // Unique identifier
    secret_id: SecretId,          // Parent secret reference
    capsule_data: Vec<u8>,        // Serialized Umbral Capsule bytes
    owner_public_key: Vec<u8>,    // Owner's PRE public key
    arweave_tx_id: Option<String>, // Arweave storage reference
}
```

## Phase 3: Distribution

**Actor**: Owner → Holder

The owner generates Umbral re-encryption key fragments (KFrags) and distributes them to the AO Holder-Process.

```rust
// Handled internally by share() builder:
// 1. Generate n KFrags for the requester's public key
// 2. Send each KFrag to the AO Holder-Process via ContractStorage
```

**Outputs**:
- `n` KFrags distributed to the Holder-Process
- Each KFrag assigned a `holder_index` (1..=n)

### KFrag Structure

```rust
#[derive(Zeroize, ZeroizeOnDrop)]
KFrag {
    id: KFragId,                        // Unique identifier
    secret_id: SecretId,                // Parent secret reference
    holder_index: u8,                   // Position in holder set (1..=n)
    holder_process_id: Option<String>,  // AO process ID
    kfrag_data: Vec<u8>,                // Serialized Umbral KeyFrag (SENSITIVE)
}
```

**Security**: KFrag data is automatically zeroized from memory when dropped.

## Phase 4: Access Request

**Actor**: Requester

The requester initiates secret recovery. The `recover()` builder handles the access request internally.

```rust
let recovered = client.recover()
    .secret_id(&share_result.secret_id)
    .requester_key(requester_sk)
    .execute()?;
```

**Outputs**:
- Recovery request submitted to the workflow service
- Secret metadata and threshold parameters retrieved

## Phase 5: Re-Encryption

**Actor**: Holder-Process (AO)

Each holder independently re-encrypts the capsule using their KFrag to produce a CFrag. This is coordinated by the AO Holder-Process.

```
CFrag_i = PRE_ReEnc(KFrag_i, Capsule)
```

At least `threshold` (k) CFrags must be collected for successful recovery.

### CFrag Structure

```rust
CFrag {
    id: CFragId,                   // Unique identifier
    secret_id: SecretId,           // Parent secret reference
    kfrag_id: KFragId,             // Source KFrag ID
    cfrag_data: Vec<u8>,           // Re-encrypted capsule fragment
    holder_process_id: String,     // Source holder
}
```

## Phase 6: Decryption

**Actor**: Requester

The requester combines threshold CFrags with the capsule to recover the symmetric key, then decrypts the shares.

```
1. Combine k CFrags + Capsule → Recover symmetric key k_owner
2. Decrypt ShareCollection shares: f(i) = AES_GCM_Dec(k_owner, C_i)
3. Shamir reconstruction: secret = f(0) from k shares
```

**Outputs**:
- Decrypted plaintext data (automatically zeroized when `SecretRecoveryResult` is dropped)

## Complete Flow Diagram

```
    Owner                    Holder (AO)                Requester
      │                           │                          │
      │ Phase 1: Setup            │                          │
      ├──(generate keypairs)──────│                          │
      │                           │                          │
      │ Phase 2: Encrypt          │                          │
      ├──(capsule + shares)──────▶│ Arweave                  │
      │                           │                          │
      │ Phase 3: Distribute       │                          │
      ├──────(kfrags)────────────▶│                          │
      │                           │                          │
      │  Secret.state:            │                          │
      │  Initialized→Split→       │                          │
      │  Distributed              │                          │
      │                           │                          │
      │                           │◀─── Phase 4: Request ────┤
      │                           │                          │
      │                           │──── Phase 5: Re-Enc ────▶│
      │                           │      (cfrags)            │
      │                           │                          │
      │                           │      Phase 6: Decrypt    │
      │                           │                     ─────┤
      │                           │                          │
      │                           │  Secret.state:           │
      │                           │  →Recovered              │
```

## Error Handling

Each phase includes verification steps:

| Phase | Verification |
|-------|-------------|
| Setup | Key pair validity check |
| Encrypt | Capsule formation, share count validation |
| Distribute | KFrag count matches threshold_n, holder index range |
| Request | Secret state must be Distributed |
| Re-Encrypt | CFrag validity, threshold met |
| Decrypt | Integrity verification, Shamir reconstruction check |

## State Transitions

The `Secret` entity tracks progress through a state machine:

```
Initialized ──split()──▶ Split ──distribute()──▶ Distributed ──mark_recovered()──▶ Recovered
```

Each transition is validated - invalid transitions (e.g., distributing from Initialized state) return `DomainError::InvalidStateTransition`.

## Next Steps

- [Security Properties](/docs/architecture/security) - Cryptographic guarantees
- [API Reference](/docs/api/actions-api) - Implementation details
