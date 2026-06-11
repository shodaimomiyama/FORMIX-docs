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
| Smart Contracts | AO Network (Rust → WASM) | Re-encryption key coordination |

## Current Status

:::info Current Status (June 2026)
FORMIX runs fully in **local mode** (in-memory Mock AO backend) — this is the supported path today.
Production connectivity to the AO Network via **HyperBEAM** (`hyperbeam` feature flag: RFC-9421 HTTP
message signatures, TABM encoding) is **experimental**; end-to-end integration is in progress.
See [FormixClient API](/docs/api/formix-client) for feature-flag details.
:::

### Background

FORMIX's contract layer was initially built using **cwao** — an experimental CosmWasm-based runtime for AO. The AO Network underwent fundamental protocol changes that broke compatibility with cwao, and the AO ecosystem's focus shifted toward **HyperBEAM**, its "Verifiable Internet" OS. FORMIX has since pivoted with the ecosystem: the contract is now a plain **Rust → WASM** module targeting HyperBEAM, and the client gained an experimental **HyperBEAM transport** (`hyperbeam` feature: RFC-9421 `rsa-pss-sha512` HTTP message signatures, TABM multipart encoding).

### What This Means for Developers

| Mode | Status | Description |
|------|--------|-------------|
| **Local Mode** (default) | Available | Full TPRE workflow runs locally without any network dependency. Cryptographic operations (Umbral PRE, Shamir SSS, AES-GCM) and contract logic execute natively against an in-memory Mock AO backend. |
| **Production Mode** (`hyperbeam` feature) | Experimental | HyperBEAM client (HTTP signatures, TABM encoding) is implemented; end-to-end integration with the AO Network is in progress. Not yet recommended for real workloads. |

The core cryptographic library and protocol logic are **fully functional and stable** — ongoing work only affects the infrastructure layer (storage and compute backends).

## Development Status

FORMIX core development continues actively. Current priorities:

- HyperBEAM end-to-end integration (production AO Network connectivity)
- CLI demo tool for local workflow verification (`demo/` directory)
- Core cryptographic library stabilization
- Additional security audits

## Next Steps

- [Installation](/docs/getting-started/installation) - Set up your development environment
- [Quick Start](/docs/getting-started/quick-start) - Run your first FORMIX example
- [Architecture Overview](/docs/architecture/overview) - Understand the system design
