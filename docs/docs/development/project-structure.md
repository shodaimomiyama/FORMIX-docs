---
sidebar_position: 1
---

# Project Structure

This guide explains the organization of the FORMIX codebase.

## Directory Overview

```
FORMIX/
├── client/                    # Main Rust client library
│   ├── src/
│   │   ├── actions/           # Actions layer (public API)
│   │   ├── controller/        # Controller layer (validation, extraction)
│   │   ├── usecase/           # UseCase layer (workflow, service, core)
│   │   ├── domain/            # Domain layer (entities, value objects)
│   │   ├── repositories/      # Repository interfaces (traits)
│   │   ├── adapter/           # Adapter layer (implementations)
│   │   ├── lib.rs             # Crate root
│   │   └── di.rs              # Top-level DI configuration
│   ├── Cargo.toml
│   └── tests/
├── ao/                        # AO contract + HyperBEAM deployment (Rust → WASM)
│   ├── contracts/             # formix-ao-contract crate (used locally via native linking)
│   │   └── src/               # lib.rs, handlers.rs, message.rs, state.rs, getrandom_impl.rs
│   ├── scripts/               # Node.js deployment scripts (deploy.js, instantiate.js, …) — experimental
│   └── test/                  # Contract tests
├── ao_cwao/                   # Legacy CosmWasm-era contract (kept for reference)
├── demo/                      # CLI demo application (local + production modes)
│   ├── src/
│   │   ├── main.rs            # CLI with clap: local all/share/reencrypt/recover
│   │   ├── main_production.rs # Production-only CLI (currently non-operational)
│   │   └── key_store.rs       # Key persistence & intermediate result serialization
│   ├── Cargo.toml             # Dependencies: formix client, contract, clap, tokio
│   ├── Makefile               # demo-local, setup, deploy targets
│   ├── README.md              # Detailed usage documentation (Japanese)
│   └── .formix-demo/          # Runtime data directory (generated)
│       ├── owner/             # Owner keys + Phase 1 output
│       ├── requester/         # Requester keys
│       └── contract/          # Phase 2 output (CFrags)
├── docs/                      # Architecture and design docs (PRD.md, status.md, …)
└── .spec-workflow/            # Specification workflow files (specs, approvals, steering)
```

## Source Code Structure

### `client/src/actions/`

The public API layer that external code interacts with.

```
actions/
├── mod.rs
├── client.rs          # FormixClient - main entry point
├── builder.rs         # ShareBuilder & RecoverBuilder (type-state pattern)
├── di.rs              # ActionsContainer DI
├── error.rs           # ActionError types
└── options.rs         # ShareOptions configuration
```

### `client/src/controller/`

Input validation and DTO transformation layer.

```
controller/
├── mod.rs
├── di.rs              # ControllerContainer DI
├── validator.rs       # ShareValidator (parameter validation)
├── extractor.rs       # RecoverExtractor (DTO extraction)
└── error.rs           # ValidationError types
```

### `client/src/usecase/`

Application-specific business logic and workflows.

```
usecase/
├── mod.rs
├── dto.rs             # Data Transfer Objects (request/result types)
├── error.rs           # WorkflowError types
├── core/              # Core service trait definitions
│   ├── mod.rs
│   ├── crypto.rs      # CryptoService trait (TPRE, Shamir, AES-GCM)
│   ├── storage.rs     # ArweaveStorageService trait & impl
│   └── contract_storage.rs  # ContractStorage trait (AO Network)
├── service/           # Composite service implementations
│   ├── mod.rs
│   ├── crypto_service.rs    # ServiceCryptoServiceImpl
│   └── storage_service.rs   # StorageServiceImpl (Arweave + Contract)
└── workflow/          # Multi-step workflow orchestration
    ├── mod.rs
    ├── container.rs   # WorkflowServiceContainer DI
    ├── secret_sharing_service.rs   # Phase 1 workflow
    └── secret_recovery_service.rs  # Phase 3 workflow
```

### `client/src/domain/`

Core business logic, entities, and value objects.

```
domain/
├── mod.rs
├── errors.rs          # DomainError comprehensive error types
├── entities/
│   ├── mod.rs
│   ├── secret.rs      # Secret entity (aggregate root, state machine)
│   ├── capsule.rs     # Capsule entity (Umbral PRE capsule)
│   ├── share.rs       # ShareCollection + EncryptedShareData
│   ├── kfrag.rs       # KFrag entity (Zeroize on drop)
│   └── cfrag.rs       # CFrag entity
└── value_objects/
    ├── mod.rs
    ├── ids.rs          # Type-safe IDs (SecretId, CapsuleId, etc.)
    ├── key_pair.rs     # KeyPair (Zeroize on drop)
    ├── secret_data.rs  # SecretData (Zeroize on drop)
    └── symmetric_key.rs # SymmetricKey
```

### `client/src/repositories/`

Abstract repository interfaces (traits) for persistence.

```
repositories/
├── mod.rs
├── secret_interface.rs         # SecretRepository trait
├── capsule_interface.rs        # CapsuleRepository trait
├── share_interface.rs          # ShareCollectionRepository trait
├── kfrag_interface.rs          # KFragRepository trait
└── cfrag_interface.rs          # CFragRepository trait
```

### `client/src/adapter/`

External service integrations and repository implementations.

```
adapter/
├── mod.rs
├── errors.rs                   # AdapterError types
├── repository_impl/            # Arweave-backed repository implementations
│   ├── mod.rs
│   ├── secret_impl.rs          # ArweaveSecretRepository
│   ├── capsule_impl.rs         # ArweaveCapsuleRepository
│   ├── share_impl.rs           # ArweaveShareCollectionRepository
│   ├── kfrag_impl.rs           # ArweaveKFragRepository
│   └── cfrag_impl.rs           # ArweaveCFragRepository
└── external/                   # External service clients
    ├── mod.rs
    ├── ao/                     # AO Network client (HyperBEAM)
    │   ├── mod.rs
    │   ├── client.rs           # AOClient trait
    │   ├── hyperbeam_client.rs # HyperBEAMClient (experimental, `hyperbeam` feature)
    │   ├── signer.rs           # RFC-9421 rsa-pss-sha512 HTTP message signatures
    │   ├── tabm.rs             # TABM multipart encoder (HyperBEAM wire format)
    │   ├── wallet.rs           # JWK wallet handling
    │   ├── message.rs          # AO message types
    │   └── config.rs           # AO endpoint configuration
    ├── ao_cwao/                # Legacy CosmWasm-era AO client (reference)
    ├── arweave/                # Arweave client
    │   ├── mod.rs
    │   ├── client.rs           # ArweaveClient trait
    │   ├── config.rs           # Arweave configuration
    │   ├── transaction.rs      # Transaction types
    │   ├── wallet.rs           # Wallet management
    │   ├── deep_hash.rs        # Deep hash for signing
    │   └── merkle.rs           # Merkle tree operations
    └── mock_ao/                # Mock AO client for testing
        ├── mod.rs
        ├── client.rs           # MockAOClient (in-memory)
        └── message.rs          # Mock message handling
```

## Smart Contracts

```
ao/
├── contracts/                 # formix-ao-contract crate (Rust → WASM, HyperBEAM target)
│   └── src/
│       ├── lib.rs             # WASM entry point
│       ├── handlers.rs        # Action dispatch & handlers (DelegateKFrag, Reencrypt, …)
│       ├── message.rs         # AOMessage / AOResponse / AOS wire types
│       ├── state.rs           # ProcessState, roles, Capsule status machine
│       └── getrandom_impl.rs  # Deterministic randomness shim for WASM
├── scripts/                   # HyperBEAM deployment scripts (Node.js, experimental)
└── test/                      # Contract tests
```

See the [AO Contract API](/docs/api/ao-contract) for the handler reference.

In **local mode**, the contract code in `ao/contracts/` is linked natively as a Rust dependency by the `demo/` crate — it executes the same logic that would run on-chain, without requiring a Wasm runtime or network connectivity.

## Demo Application

```
demo/
├── src/
│   ├── main.rs                # Full CLI: local {all,share,reencrypt,recover} + production commands
│   ├── main_production.rs     # Simplified production-only CLI
│   └── key_store.rs           # Persistent key storage, share/reencrypt result serialization
├── Cargo.toml                 # Depends on the formix client + the AO contract crate
├── Makefile                   # demo-local, setup, deploy targets
└── README.md                  # Usage guide with mermaid diagrams (Japanese)
```

:::caution
The `demo` crate is **temporarily broken** on current main: its `Cargo.toml` still references the pre-migration `contract` crate name (now `formix-ao-contract`) and the removed `production-ao` feature. See [Quick Start](/docs/getting-started/quick-start) for the working alternative.
:::

## Key Files

| File | Purpose |
|------|---------|
| `client/Cargo.toml` | Dependency management |
| `client/src/lib.rs` | Crate root and public exports |
| `client/src/actions/client.rs` | FormixClient main entry point |
| `client/src/actions/di.rs` | ActionsContainer DI |
| `client/src/domain/entities/secret.rs` | Secret aggregate root |

## Module Dependencies

```
actions
    ↓
controller
    ↓
usecase (workflow → service → core)
    ↓
domain ← repositories
    ↑         ↑
    └─────────┘
         ↑ (Dependency Inversion)
    adapter
```

The dependency rule: Inner layers never depend on outer layers. The Adapter layer implements Repository traits defined in the Repositories layer, following the Dependency Inversion Principle.

## Design Patterns

| Pattern | Usage |
|---------|-------|
| Clean Architecture | Layer separation with dependency inversion |
| Type-State | Compile-time builder parameter enforcement |
| Aggregate Root | `Secret` manages related entities |
| Repository | Persistence abstraction via traits |
| Composition | StorageService composes Arweave + Contract |
| Zeroize on Drop | Secure memory clearing for crypto material |

## Next Steps

- [Development Commands](/docs/development/commands) - Available make targets
- [API Reference](/docs/api/actions-api) - Actions layer documentation
