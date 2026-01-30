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
  Owner        Owner         Owner          Requester     Proxies      Requester
```

## Phase 1: Setup

**Actor**: Owner

The owner generates cryptographic key pairs and initializes the system.

```rust
// Generate owner's key pair
let owner_keypair = KeyPair::generate();

// Initialize owner process on AO
let owner_process = OwnerProcess::new(owner_keypair)?;
```

**Outputs**:
- Owner public/private key pair
- Initialized Owner process

## Phase 2: Encryption

**Actor**: Owner

The owner encrypts sensitive data using their public key.

```rust
// Prepare data for encryption
let secret_data = SecretData::new(sensitive_bytes);

// Encrypt data
let (capsule, ciphertext) = owner_process.encrypt(&secret_data)?;

// Store ciphertext on Arweave
let arweave_tx = storage.upload(&ciphertext).await?;
```

**Outputs**:
- `Capsule` - Contains encrypted symmetric key
- `Ciphertext` - Encrypted data
- Arweave transaction ID

### Capsule Structure

```
Capsule {
    point_e: G1Point,      // E = r * G
    point_v: G1Point,      // V = r * pk_owner
    signature: Signature,   // Proof of correct formation
}
```

## Phase 3: Distribution

**Actor**: Owner → Holder

The owner generates re-encryption key fragments and distributes them to proxy nodes.

```rust
// Define threshold parameters
let threshold = 3;  // Minimum required
let n_shares = 5;   // Total shares

// Generate key fragments for requester
let kfrags = owner_process.generate_kfrags(
    &requester_public_key,
    threshold,
    n_shares
)?;

// Distribute to holder/proxies
for (proxy_id, kfrag) in proxy_ids.iter().zip(kfrags.iter()) {
    holder_process.store_kfrag(proxy_id, kfrag)?;
}
```

**Outputs**:
- `n_shares` KFrags distributed across proxies
- Each proxy holds exactly one KFrag

### KFrag Structure

```
KFrag {
    id: FragmentId,
    key: G2Point,           // Re-encryption key component
    precursor: G1Point,     // Verification data
    proof: KFragProof,      // Correctness proof
}
```

## Phase 4: Access Request

**Actor**: Requester

The requester initiates an access request by presenting their public key.

```rust
// Create access request
let request = AccessRequest::new(
    &requester_keypair.public_key(),
    &capsule_id,
)?;

// Submit request to holder
let request_id = holder_process.submit_request(request)?;
```

**Outputs**:
- Access request ID
- Request recorded in holder process

## Phase 5: Re-Encryption

**Actor**: Proxy Nodes (via Holder)

Each proxy node independently re-encrypts the capsule using their KFrag.

```rust
// Each proxy performs re-encryption
// (Coordinated by holder process)
let cfrags: Vec<CFrag> = holder_process
    .process_reencryption(request_id)
    .await?;

// Verify threshold is met
assert!(cfrags.len() >= threshold);
```

**Outputs**:
- `threshold` or more CFrags
- Each CFrag is independently verifiable

### CFrag Structure

```
CFrag {
    point_e1: G1Point,      // Re-encrypted E
    point_v1: G1Point,      // Re-encrypted V
    kfrag_id: FragmentId,   // Source KFrag ID
    proof: CFraProof,       // Re-encryption proof
}
```

## Phase 6: Decryption

**Actor**: Requester

The requester combines CFrags and decrypts the data.

```rust
// Collect cfrags (at least threshold)
let cfrags = requester_process.collect_cfrags(request_id)?;

// Verify and combine cfrags
let combined = requester_process.combine_cfrags(
    &capsule,
    &owner_public_key,
    &cfrags
)?;

// Final decryption
let plaintext = requester_process.decrypt(
    &combined,
    &ciphertext
)?;
```

**Outputs**:
- Decrypted plaintext data

## Complete Flow Diagram

```
    Owner                    Holder/Proxies              Requester
      │                           │                          │
      │ Phase 1: Setup            │                          │
      ├──────────────────────────▶│                          │
      │                           │                          │
      │ Phase 2: Encrypt          │                          │
      ├──(capsule, ciphertext)───▶│                          │
      │                           │                          │
      │ Phase 3: Distribute       │                          │
      ├──────(kfrags)────────────▶│                          │
      │                           │                          │
      │                           │◀─── Phase 4: Request ────┤
      │                           │                          │
      │                           │──── Phase 5: Re-Enc ────▶│
      │                           │      (cfrags)            │
      │                           │                          │
      │                           │      Phase 6: Decrypt    │
      │                           │                     ─────┤
      │                           │                          │
```

## Error Handling

Each phase includes verification steps:

| Phase | Verification |
|-------|-------------|
| Setup | Key validity check |
| Encrypt | Capsule formation proof |
| Distribute | KFrag correctness proof |
| Request | Authorization check |
| Re-Encrypt | CFrag validity proof |
| Decrypt | Integrity verification |

## Next Steps

- [Security Properties](/docs/architecture/security) - Cryptographic guarantees
- [API Reference](/docs/api/actions-api) - Implementation details
