---
sidebar_position: 1
---

# Introduction to FORMIX

**FORMIX** (Deterministic Threshold Proxy Re-Encryption System) is a decentralized access control system for encrypted data stored on Arweave. It enables secure, permissionless data sharing without revealing the original encryption key.

## What is FORMIX?

FORMIX implements **Threshold Proxy Re-Encryption (TPRE)** technology, allowing data owners to delegate decryption rights to other users through distributed proxy nodes. This creates a trustless system where:

- **No single point of failure** - Decryption requires cooperation from multiple proxy nodes
- **Owner retains control** - Access rights can be granted or revoked at any time
- **End-to-end encryption** - Data remains encrypted throughout the entire process

## Key Features

### Threshold Proxy Re-Encryption
Uses cryptographic techniques to split re-encryption capabilities across multiple independent nodes. A threshold number of nodes must cooperate to re-encrypt data, providing Byzantine fault tolerance.

### Decentralized Architecture
Built on Arweave for permanent storage and AO Network for compute, eliminating central points of control or failure.

### Multi-Role Wasm Actors
Three distinct process types (Owner, Holder, Requester) operate as WebAssembly modules on AO, each with specific responsibilities in the access control workflow.

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Storage | Arweave | Permanent, decentralized data storage |
| Compute | AO Network | Distributed process execution |
| Cryptography | Umbral TPRE (Rust/Wasm) | Threshold proxy re-encryption |
| Smart Contracts | AO Network (Lua) | Re-encryption key coordination |

## Infrastructure Migration Notice

:::caution Production Environment Migration in Progress
FORMIX is currently undergoing a **production infrastructure migration**. The system was originally built on the **AO Network** (Arweave's compute layer), but due to significant changes in the AO ecosystem, on-chain functionality is temporarily unavailable. **Only local-complete mode is currently supported.**
:::

### Background

FORMIX's contract layer was initially built using **cwao** — an experimental CosmWasm-based runtime for AO, developed approximately two years ago. However, two major factors led to a strategic pivot:

1. **AO system architecture changes** — The AO Network underwent fundamental protocol changes, breaking compatibility with the cwao runtime. Combined with CosmWasm's limited traction in the ecosystem, cwao development was discontinued.
2. **AO ecosystem direction shift** — AO's focus has shifted from smart contract infrastructure toward **HyperBEAM**, a "Verifiable Internet" OS project. With founder Sam Williams describing AO's vision as a "moonshot for a new internet," the ecosystem's direction has diverged significantly from conventional smart contract use cases, resulting in reduced developer adoption.

As a result, FORMIX is evaluating alternative production environments while maintaining full functionality in local mode.

### What This Means for Developers

| Mode | Status | Description |
|------|--------|-------------|
| **Local Mode** | Available | Full TPRE workflow runs locally without any network dependency. Cryptographic operations (Umbral PRE, Shamir SSS, AES-GCM) and contract logic execute natively. |
| **Production Mode** | Migration in Progress | AO Network / Arweave deployment is not currently operational. A new production target is under evaluation. |

The core cryptographic library and protocol logic are **fully functional and stable** — the migration only affects the infrastructure layer (storage and compute backends).

## Development Status

FORMIX core development continues actively. Current priorities:

- Production environment migration to a new backend
- CLI demo tool for local workflow verification (`demo/` directory)
- Core cryptographic library stabilization
- Additional security audits

## Next Steps

- [Installation](/docs/getting-started/installation) - Set up your development environment
- [Quick Start](/docs/getting-started/quick-start) - Run your first FORMIX example
- [Architecture Overview](/docs/architecture/overview) - Understand the system design
