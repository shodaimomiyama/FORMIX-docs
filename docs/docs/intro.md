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
| Cryptography | TPRE (Rust/Wasm) | Threshold proxy re-encryption |
| Smart Contracts | EVM Compatible | Access control policies |

## Development Status

FORMIX is currently in active development. The core cryptographic primitives and AO process architecture are implemented, with ongoing work on:

- Enhanced key management
- Gas optimization for EVM integration
- Additional security audits
- Developer tooling and SDKs

## Next Steps

- [Installation](/docs/getting-started/installation) - Set up your development environment
- [Quick Start](/docs/getting-started/quick-start) - Run your first FORMIX example
- [Architecture Overview](/docs/architecture/overview) - Understand the system design
