---
sidebar_position: 1
---

# Architecture Overview

:::info Current Status
The architecture described below is fully implemented and functional in **local mode**. In the Adapter layer, production AO Network connectivity via **HyperBEAM** is experimental (E2E integration in progress). See [Current Status](/docs/intro#current-status) for details.
:::

FORMIX follows a **Clean Architecture** pattern with clear separation of concerns and dependency inversion.

## Layer Structure

```
┌─────────────────────────────────────────┐
│           Actions Layer                  │  ← Public API (FormixClient, Builders)
├─────────────────────────────────────────┤
│         Controller Layer                 │  ← Input Validation & DTO Extraction
├─────────────────────────────────────────┤
│          UseCase Layer                   │  ← Workflow, Service, Core
│  ┌─────────┬──────────┬──────────┐      │
│  │Workflow  │ Service  │  Core    │      │
│  │(Sharing, │(Crypto,  │(Storage, │      │
│  │Recovery) │ Storage) │ Contract)│      │
│  └─────────┴──────────┴──────────┘      │
├─────────────────────────────────────────┤
│          Domain Layer                    │  ← Entities, Value Objects, Errors
├─────────────────────────────────────────┤
│       Repositories Layer                 │  ← Persistence Abstractions (Traits)
├─────────────────────────────────────────┤
│         Adapter Layer                    │  ← External Integrations
│  ┌──────────────┬────────────────┐      │
│  │RepositoryImpl│   External     │      │
│  │(Arweave CRUD)│(AO, Arweave,  │      │
│  │              │ MockAO)        │      │
│  └──────────────┴────────────────┘      │
└─────────────────────────────────────────┘
```

## Layer Descriptions

### Actions Layer
The entry point for all external interactions. This layer:
- Provides `FormixClient` as the main public API
- Uses type-state `ShareBuilder` / `RecoverBuilder` for compile-time safety
- Contains `ActionsContainer` for dependency injection
- Delegates input validation to the Controller layer

```rust
// Example: Actions layer usage
let result = client.share()
    .secret(data.to_vec())
    .threshold(3)
    .total_shares(5)
    .owner_key(owner_sk)
    .requester_key(requester_pk)
    .execute()
    .await?;
```

### Controller Layer
Handles input validation and DTO transformation:
- `ShareValidator` - Validates share operation parameters
- `RecoverExtractor` - Extracts and transforms recovery parameters into DTOs
- `ControllerContainer` - DI container for controller dependencies

### UseCase Layer
Contains application-specific business logic, organized into three sub-layers:

- **Workflow** - `SecretSharingService` (Phase 1) and `SecretRecoveryService` (Phase 3) orchestrate multi-step operations
- **Service** - `CryptoService` (Umbral TPRE, Shamir, AES-GCM) and `StorageService` (composite Arweave + AO) provide reusable capabilities
- **Core** - `ArweaveStorageService`, `ContractStorage`, and `CryptoService` define core trait abstractions

### Domain Layer
The core business logic, independent of external concerns:
- **Entities**: `Secret` (aggregate root), `Capsule`, `ShareCollection`, `KFrag`, `CFrag`
- **Value Objects**: `SecretId`, `CapsuleId`, `ShareCollectionId`, `KFragId`, `CFragId`, `KeyPair`, `SecretData`, `SymmetricKey`
- **Errors**: `DomainError` with comprehensive error variants
- **State Machine**: `SecretState` (Initialized → Split → Distributed → Recovered)

### Repositories Layer
Defines persistence abstractions using traits with dependency inversion:
- `SecretRepository` - CRUD for Secret aggregate root
- `CapsuleRepository` - CRUD + find by secret ID
- `ShareCollectionRepository` - CRUD + find by secret ID
- `KFragRepository` - CRUD + find by secret ID, holder index
- `CFragRepository` - CRUD for re-encrypted fragments

### Adapter Layer
Implements external integrations:
- **RepositoryImpl** - Arweave-backed implementations of all repository traits
- **External/AO** - `AOClient` trait and `HyperBEAMClient` (experimental, `hyperbeam` feature): RFC-9421 `rsa-pss-sha512` HTTP message signatures, TABM multipart encoding, JWK wallet handling
- **External/AO-CWAO** - Legacy CosmWasm-era client (`ao_cwao/`), kept for reference during the HyperBEAM transition
- **External/Arweave** - `ArweaveClient` trait, transaction handling, deep hash, wallet management
- **External/MockAO** - In-memory AO client for testing (the default backend)

:::note
The Adapter layer is the only layer affected by the backend transition. Thanks to dependency inversion, the AO/Arweave adapters can be swapped without changes to the core business logic, domain, or use case layers. In local mode, the contract logic from `ao/contracts/` is linked natively (not via Wasm/AO), providing identical cryptographic behavior.
:::

## Storage Architecture

FORMIX uses a composite storage pattern separating immutable data storage from contract communication:

```
┌──────────────────────────────────────────────┐
│              StorageService                   │
│  (Composite: Arweave + Contract)             │
├──────────────────────┬───────────────────────┤
│ ArweaveStorageService│   ContractStorage     │
│ (Immutable data)     │   (AO Network)        │
│ - store_data()       │   - send_kfrags()     │
│ - retrieve_data()    │   - delegate_capsule()│
│ - query_by_tags()    │   - retrieve_cfrags() │
│ - batch_store()      │   - retrieve_threshold│
└──────────────────────┴───────────────────────┘
```

### Tag-Based Storage

All entities stored on Arweave use a consistent tagging strategy for discoverability:

| Tag | Description |
|-----|-------------|
| `App-Name` | Always `"FORMIX"` |
| `Entity-Type` | `Secret`, `ShareCollection`, `Capsule`, `KFrag`, `CFrag` |
| `Entity-Id` | Entity-specific UUID |
| `Secret-Id` | Parent secret UUID (for child entities) |
| `Holder-Index` | Position in holder set (for KFrags) |
| `Deleted` | Soft delete flag |

## Process Architecture

FORMIX operates through three roles for re-encryption coordination. In production mode (AO Network via HyperBEAM, experimental), Holder runs as an on-chain process. In local mode, Holder contract logic is executed natively.

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│    Owner     │    │    Holder    │    │  Requester   │
│  (Client)    │    │  (Contract)  │    │  (Client)    │
├──────────────┤    ├──────────────┤    ├──────────────┤
│ - Encrypt    │    │ - Store      │    │ - Request    │
│ - Gen KFrags │───▶│ - Re-encrypt │◀───│ - Collect    │
│ - Authorize  │    │ - Distribute │    │ - Decrypt    │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
        └───────────────────┴───────────────────┘
                           │
                ┌─────────────────────┐
                │  Storage Backend    │
                │  (Local / Arweave)  │
                └─────────────────────┘
```

The current `FormixClient` is designed for **single-user (self-service) workflows** where the caller acts as both data owner and requester. In local mode, all three roles execute within a single process.

## Data Flow

1. **Encryption**: Owner encrypts data → Capsule + Encrypted Shares
2. **Storage**: Capsule and ShareCollection stored on Arweave
3. **Distribution**: Owner generates KFrags → sent to AO Holder-Process
4. **Request**: Requester requests access via AO
5. **Re-encryption**: Holder generates CFrags from KFrags
6. **Decryption**: Requester combines CFrags → decrypts shares → recovers secret

## Next Steps

- [6-Phase Workflow](/docs/architecture/six-phase-workflow) - Detailed protocol flow
- [Security Properties](/docs/architecture/security) - Cryptographic guarantees
