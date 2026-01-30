---
sidebar_position: 1
---

# Project Structure

This guide explains the organization of the FORMIX codebase.

## Directory Overview

```
FORMIX/
├── src/
│   ├── actions/           # Actions layer (external API)
│   ├── use_cases/         # Use cases layer (application logic)
│   ├── domain/            # Domain layer (business rules)
│   │   ├── entities/      # Domain entities
│   │   └── value_objects/ # Value objects
│   ├── infrastructure/    # Infrastructure layer
│   ├── interfaces/        # Interface definitions
│   └── config/            # Configuration
├── processes/
│   ├── owner/             # Owner AO process
│   ├── holder/            # Holder AO process
│   └── requester/         # Requester AO process
├── crypto/                # Cryptographic primitives
├── tests/
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── e2e/               # End-to-end tests
├── examples/              # Example code
├── docs/                  # Documentation (this site)
└── scripts/               # Build and deployment scripts
```

## Source Code Structure

### `src/actions/`

The public API layer that external code interacts with.

```
actions/
├── mod.rs
├── encryption.rs      # Encryption/decryption actions
├── key_management.rs  # Key generation actions
├── reencryption.rs    # Re-encryption actions
└── errors.rs          # Action error types
```

### `src/use_cases/`

Application-specific business logic and workflows.

```
use_cases/
├── mod.rs
├── encrypt_secret.rs
├── grant_access.rs
├── request_access.rs
└── decrypt_secret.rs
```

### `src/domain/`

Core business logic, entities, and value objects.

```
domain/
├── mod.rs
├── entities/
│   ├── mod.rs
│   ├── secret.rs      # Secret entity
│   ├── capsule.rs     # Capsule entity
│   ├── kfrag.rs       # KFrag entity
│   └── cfrag.rs       # CFrag entity
└── value_objects/
    ├── mod.rs
    ├── keypair.rs     # KeyPair value object
    ├── secret_data.rs # SecretData value object
    └── public_key.rs  # PublicKey value object
```

### `src/infrastructure/`

External service integrations.

```
infrastructure/
├── mod.rs
├── arweave/
│   ├── client.rs      # Arweave client
│   └── storage.rs     # Storage operations
├── ao/
│   ├── process.rs     # AO process management
│   └── message.rs     # AO messaging
└── evm/
    └── contracts.rs   # EVM contract interactions
```

### `src/interfaces/`

Abstract interfaces and repository definitions.

```
interfaces/
├── mod.rs
├── repositories/
│   ├── secret_repository.rs
│   └── kfrag_repository.rs
└── services/
    ├── storage_service.rs
    └── crypto_service.rs
```

## Process Structure

### Owner Process

```
processes/owner/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   ├── handlers/      # Message handlers
│   ├── state.rs       # Process state
│   └── wasm.rs        # Wasm entry point
└── build.sh
```

### Holder Process

```
processes/holder/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   ├── handlers/
│   ├── state.rs
│   ├── proxy/         # Proxy node logic
│   └── wasm.rs
└── build.sh
```

### Requester Process

```
processes/requester/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   ├── handlers/
│   ├── state.rs
│   └── wasm.rs
└── build.sh
```

## Cryptographic Library

```
crypto/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   ├── curve.rs       # Elliptic curve operations
│   ├── keys.rs        # Key generation
│   ├── encryption.rs  # Encryption primitives
│   ├── pre.rs         # Proxy re-encryption
│   └── threshold.rs   # Threshold operations
└── benches/
    └── crypto_bench.rs
```

## Configuration Files

```
FORMIX/
├── Cargo.toml         # Rust workspace configuration
├── Makefile           # Build commands
├── rust-toolchain.toml # Rust version specification
├── .github/
│   └── workflows/     # CI/CD pipelines
└── config/
    ├── default.toml   # Default configuration
    └── test.toml      # Test configuration
```

## Key Files

| File | Purpose |
|------|---------|
| `Cargo.toml` | Workspace and dependency management |
| `Makefile` | Build, test, and deploy commands |
| `rust-toolchain.toml` | Rust version pinning |
| `.env.example` | Environment variable template |

## Module Dependencies

```
actions
    ↓
use_cases
    ↓
domain ← interfaces
    ↓
infrastructure
    ↓
config
```

The dependency rule: Inner layers never depend on outer layers.

## Next Steps

- [Development Commands](/docs/development/commands) - Available make targets
- [API Reference](/docs/api/actions-api) - Actions layer documentation
