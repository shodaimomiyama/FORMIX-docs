---
sidebar_position: 2
---

# AO Contract API

:::info Current Status
The AO contract targets **HyperBEAM** and is **experimental** — end-to-end integration with the AO Network is in progress. The same handler logic runs locally via the demo CLI and `MockAOClient`.
:::

FORMIX's on-chain layer is a single **Rust → WASM** module (`formix-ao-contract`). The same module is deployed as multiple AO processes; each process is assigned a **role** at initialization that gates which actions it accepts. State lives in WASM linear memory and is persisted automatically via HyperBEAM memory snapshots.

## Process Roles

```rust
pub enum ProcessRole {
    Owner,      // Distributes kFrags and Capsules to Holders
    Holder,     // Stores kFrags, performs proxy re-encryption
    Requester,  // Queries cFrags for recovery
    Combined,   // Single-process mode: Owner + Holder actions
}
```

All processes load the **same logic** — behavior differs only by the role requested at `Init`. `Combined` enables single-process setups (used by the local workflow).

## Message Format

Messages follow the AO convention: the action name is carried as an AO **Tag** (`{"name": "Action", "value": "..."}`), and the payload is JSON in `Data`.

```json
{
  "Id": "msg-123",
  "From": "wallet-abc",
  "Tags": [
    { "name": "Action", "value": "Init" },
    { "name": "Data-Protocol", "value": "ao" }
  ],
  "Data": "{\"role\":\"Owner\"}"
}
```

Responses are returned in AOS-compatible format (`ok` / `response.Output.data` / `response.Messages` / `error`). Outgoing messages to other AO processes (e.g. Owner → Holder kFrag delivery) are listed in `Messages` and routed by HyperBEAM.

## Handlers

| Action | Allowed roles | Purpose |
|--------|---------------|---------|
| `Init` | *(uninitialized process)* | Assign the process role (`Owner` / `Holder` / `Requester` / `Combined`) and record the authorized owner address |
| `DelegateKFrag` | Owner, Combined | Store a kFrag on the Owner-Process and forward it to a Holder-Process |
| `DelegateCapsule` | Owner, Combined | Push a Capsule from the Owner-Process to a Holder-Process |
| `SubmitKFrag` | Holder, Combined | Receive and store a kFrag on the Holder-Process |
| `SubmitCapsule` | Holder, Combined | Receive a Capsule on the Holder-Process (entry to the re-encryption flow) |
| `Reencrypt` | Holder, Combined | Perform proxy re-encryption: `cFrag = PRE_ReEnc(kFrag, Capsule)` |
| `GetCFrag` | any initialized role | Query a stored cFrag |
| `ListCapsules` | any initialized role | List capsule IDs associated with a kFrag |

Every action except `Init` requires the process to be initialized first.

## Capsule State Machine

Each Capsule tracked by a process moves through:

```
Received ──▶ ReencInProgress ──▶ CFragReady
                   │
                   └──▶ Error(String)
```

| Status | Meaning |
|--------|---------|
| `Received` | Capsule stored via `SubmitCapsule` / `DelegateCapsule` |
| `ReencInProgress` | `Reencrypt` started |
| `CFragReady` | cFrag generated and stored — retrievable via `GetCFrag` |
| `Error(String)` | Re-encryption failed; reason recorded |

## State Layout

```rust
pub struct ProcessState {
    pub role: Option<ProcessRole>,
    pub owner_id: Option<String>,                      // authorized sender
    pub owner_kfrags: HashMap<String, Vec<u8>>,        // kfrag_id → bytes
    pub owner_capsules: HashMap<String, OwnerCapsuleData>, // (kfrag_id, capsule_id) → data
    pub holder_cfrags: HashMap<String, Vec<u8>>,       // (kfrag_id, capsule_id) → bytes
    pub kfrag_holders: HashMap<String, String>,        // kfrag_id → holder process ID
    pub kfrag_to_caps: HashMap<String, Vec<String>>,   // kfrag_id → [capsule_ids]
}
```

## Errors

| Condition | Response |
|-----------|----------|
| Action sent before `Init` | `"Process not initialized — send Init first"` |
| Action not allowed for the process role | `"Action '<action>' not permitted for role <Role>"` |
| Submit from a non-registered sender | `"Unauthorized: only the registered owner can submit …"` |
| Malformed kFrag payload | `"Invalid kFrag payload: …"` (validated before persisting to prevent bricked state) |
| Handler-specific failures | `ok: false` with an `error` message |

Submissions are **idempotent**: re-submitting an already-stored kFrag returns success with `"idempotent": true` instead of an error.

## Memory Safety

Deserialized key material (`StoredKeyFrag`, `StoredCFrag`) implements `Zeroize` / `ZeroizeOnDrop`, so fragment bytes are wiped from WASM linear memory after use. Each `StoredKeyFrag` embeds `VerificationData` (verifying / delegating / receiving public keys) used to cryptographically verify the kFrag during re-encryption.

## Next Steps

- [6-Phase Workflow](/docs/architecture/six-phase-workflow) - Where each handler fits in the protocol
- [FormixClient API](/docs/api/formix-client) - Client-side entry point
