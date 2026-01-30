---
sidebar_position: 1
---

# Architecture Overview

FORMIX follows a **6-Layer Clean Architecture** pattern, ensuring separation of concerns and maintainability.

## Layer Structure

```
┌─────────────────────────────────────────┐
│           Actions Layer                  │  ← External API
├─────────────────────────────────────────┤
│         Use Cases Layer                  │  ← Application Logic
├─────────────────────────────────────────┤
│          Domain Layer                    │  ← Business Rules
├─────────────────────────────────────────┤
│       Infrastructure Layer               │  ← External Services
├─────────────────────────────────────────┤
│        Interfaces Layer                  │  ← Abstractions
├─────────────────────────────────────────┤
│          Config Layer                    │  ← Configuration
└─────────────────────────────────────────┘
```

## Layer Descriptions

### Actions Layer
The entry point for all external interactions. This layer:
- Exposes the public API
- Handles input validation
- Orchestrates use case execution
- Returns formatted responses

```rust
// Example: Actions layer function
pub fn encrypt_secret(
    public_key: &PublicKey,
    data: &SecretData,
) -> Result<(Capsule, Ciphertext), ActionError>
```

### Use Cases Layer
Contains application-specific business logic:
- Implements user stories and workflows
- Coordinates domain entities
- Handles transaction boundaries

### Domain Layer
The core business logic, independent of external concerns:
- **Entities**: `Secret`, `Capsule`, `KFrag`, `CFrag`
- **Value Objects**: `KeyPair`, `SecretData`, `PublicKey`
- **Domain Services**: Cryptographic operations

### Infrastructure Layer
Implements external integrations:
- Arweave storage client
- AO Network process management
- EVM contract interactions

### Interfaces Layer
Defines abstractions for infrastructure:
- Repository interfaces
- External service contracts
- Event definitions

### Config Layer
System configuration and constants:
- Network parameters
- Cryptographic constants
- Feature flags

## Process Architecture

FORMIX operates through three distinct AO processes:

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│    Owner     │    │    Holder    │    │  Requester   │
│   Process    │    │   Process    │    │   Process    │
├──────────────┤    ├──────────────┤    ├──────────────┤
│ - Encrypt    │    │ - Store      │    │ - Request    │
│ - Gen KFrags │───▶│ - Distribute │◀───│ - Collect    │
│ - Authorize  │    │ - Re-encrypt │    │ - Decrypt    │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
        └───────────────────┴───────────────────┘
                           │
                    ┌──────────────┐
                    │   Arweave    │
                    │   Storage    │
                    └──────────────┘
```

### Owner Process
- Generates and manages encryption keys
- Creates and encrypts secrets
- Generates re-encryption key fragments (KFrags)
- Defines access policies

### Holder Process
- Stores encrypted data references
- Maintains KFrag distribution
- Performs re-encryption operations
- Manages proxy node coordination

### Requester Process
- Initiates access requests
- Collects re-encrypted fragments (CFrags)
- Performs final decryption
- Verifies data integrity

## Data Flow

1. **Encryption**: Owner encrypts data → Capsule + Ciphertext
2. **Key Generation**: Owner creates KFrags → distributed to proxies
3. **Storage**: Ciphertext stored on Arweave
4. **Request**: Requester requests access
5. **Re-encryption**: Proxies generate CFrags
6. **Decryption**: Requester combines CFrags → decrypts

## Next Steps

- [6-Phase Workflow](/docs/architecture/six-phase-workflow) - Detailed protocol flow
- [Security Properties](/docs/architecture/security) - Cryptographic guarantees
