# D-TPRES-docs Accuracy & DX Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make D-TPRES-docs factually accurate against the FORMIX implementation and more useful for developers (spec: `docs/superpowers/specs/2026-06-11-docs-accuracy-dx-design.md`).

**Architecture:** Docs-only changes in a Docusaurus site. English docs under `docs/docs/`, Japanese mirror under `docs/i18n/ja/docusaurus-plugin-content-docs/current/`. Every factual claim is synced to verified FORMIX sources (Ground Truth below). Verification = grep checks + `yarn build`.

**Tech Stack:** Docusaurus 3 (TypeScript config), Markdown/MDX, Rust code samples.

---

## Ground Truth (verified 2026-06-11 against FORMIX sources)

All facts below were read directly from FORMIX source files. Do NOT invent beyond these; if a doc claims something not listed here, verify against the cited file before keeping it.

### G1. Crate / toolchain (`client/Cargo.toml`)
- Crate name `formix`, version `0.1.0`, edition `2021`.
- Features: `hyperbeam = ["dep:reqwest", "dep:rsa", "dep:sha2"]` (real AO via HyperBEAM, EXPERIMENTAL — E2E integration in progress), `key-export = []` (exposes `SecretKey::as_bytes()`/`from_bytes()`, `PublicKey::from_bytes()`; testing only). Default (no features) = in-memory Mock AO backend.

### G2. `FormixClient` (`client/src/actions/client.rs:31-153`)
```rust
pub struct InitConfig {
    pub wallet_path: String,                  // Path to JWK wallet file
    pub ao_gateway_url: Option<String>,       // default "https://ao.arweave.net"
    pub arweave_gateway_url: Option<String>,  // default "https://arweave.net"
}

impl FormixClient {
    pub fn init(_config: InitConfig) -> ActionResult<Self>  // NOT IMPLEMENTED: always Err(WorkflowFailed), Issue #60
    pub fn new(process_id: String, wallet_address: String,
               ao_gateway_url: String, arweave_gateway_url: String) -> Self
    // NOTE: gateway URLs are stored but NOT wired (Issues #51/#52); all I/O uses mock defaults
    pub fn with_storage(process_id: String, wallet_address: String,
               ao_gateway_url: String, arweave_gateway_url: String,
               arweave: Arc<ArweaveStorageServiceImpl>,
               contract: Arc<ContractStorageImpl<MockAOClient>>) -> Self
    pub fn process_id(&self) -> &str
    pub fn wallet_address(&self) -> &str
    pub fn ao_gateway_url(&self) -> &str
    pub fn arweave_gateway_url(&self) -> &str
    pub fn share(&self) -> ShareBuilder<..., NotSet x5>
    pub fn recover(&self) -> RecoverBuilder<..., NotSet x3>
    pub fn generate_keypair(&self) -> ActionResult<(SecretKey, PublicKey)>
}
```
Doc comment: client is designed for single-user (self-service) workflows; one `process_id` for all operations.

### G3. Builders (verified via `client/examples/basic_usage.rs`)
Share: `.secret(Vec<u8>)` `.threshold(u8)` `.total_shares(u8)` `.owner_key(SecretKey)` (move) `.requester_key(PublicKey)` `.metadata(Option<SecretMetadata>)` (optional) `.execute().await -> ActionResult<SecretSharingResult>`.
Recover: `.secret_id(&SecretId)` `.requester_key(SecretKey)` (move) `.owner_key(PublicKey)` `.execute().await -> ActionResult<SecretRecoveryResult>`.

### G4. DTOs (`client/src/usecase/dto.rs`)
```rust
pub struct SecretMetadata { pub name: Option<String>, pub description: Option<String>,
    pub expires_at: Option<u64> /* Unix epoch secs */, pub tags: Vec<String> }
pub struct SecretSharingResult { pub secret_id: SecretId, pub capsule_tx_id: String,
    pub share_tx_ids: Vec<String>, pub kfrag_count: u8, pub owner_public_key: PublicKey }
#[derive(Zeroize, ZeroizeOnDrop)]
pub struct SecretRecoveryResult { pub recovered_secret: Vec<u8>,
    #[zeroize(skip)] pub audit_tx_id: String }  // audit_tx_id EXISTS — keep it in docs
pub enum SecretStatus { Created, KFragsDistributed, Recovered, Revoked }
```

### G5. Errors (`client/src/actions/error.rs`)
`ActionError` (non_exhaustive): `ValidationFailed { code, message }`, `WorkflowFailed { message }`, `ResourceNotFound { resource }`, `CryptoError { message }`, `PartialStorageFailure { capsule_tx_id, successful_share_tx_ids, failed_shares: Vec<(String, String)>, message }` (Arweave batch storage partially failed; immutable storage, no rollback). `type ActionResult<T> = Result<T, ActionError>`.

### G6. Crypto constants (`client/src/usecase/core/crypto.rs:52-77`, module `constants`)
`MIN_THRESHOLD: u8 = 2`, `MAX_SHARES: u8 = 20`, `KEY_SIZE_BYTES = 32`, `PUBLIC_KEY_SIZE_BYTES = 33`, `CAPSULE_POINT_SIZE = 33`, `CAPSULE_SIGNATURE_SIZE = 64`, `AES_GCM_NONCE_SIZE = 12`, `AES_GCM_TAG_SIZE = 16`, `AES_KEY_SIZE = 32`.
Key types: `SecretKey` (move-only, Zeroize+ZeroizeOnDrop), `PublicKey { pub key_data: Vec<u8> }` (Clone, also ZeroizeOnDrop), `Capsule { capsule_bytes }`, `ShamirShare { index, share_data }`.

### G7. AO contract (`ao/contracts/src/` — Rust → WASM; there is NO Lua in FORMIX)
Dispatch (`handlers.rs:21-58`), role-gated:

| Action | Allowed roles | Handler purpose |
|---|---|---|
| `Init` | (uninitialized) | Set role (`Owner`/`Holder`/`Requester`/`Combined`) and owner_id |
| `DelegateKFrag` | Owner, Combined | Owner stores/forwards kFrag to a Holder |
| `DelegateCapsule` | Owner, Combined | Owner pushes Capsule to Holder |
| `SubmitKFrag` | Holder, Combined | Holder receives & stores kFrag |
| `SubmitCapsule` | Holder, Combined | Holder receives Capsule, triggers re-encryption flow |
| `Reencrypt` | Holder, Combined | `cFrag = PRE_ReEnc(kFrag, Capsule)` |
| `GetCFrag` | any initialized | Query a stored cFrag |
| `ListCapsules` | any initialized | List capsule IDs for a kFrag (NOT "ListCapsulesByKFrag") |

State (`state.rs`): `ProcessRole { Owner, Holder, Requester, Combined }`; `CapsuleStatus { Received, ReencInProgress, CFragReady, Error(String) }`; WASM-memory state persisted via HyperBEAM memory snapshots; `StoredKeyFrag`/`StoredCFrag` are ZeroizeOnDrop.
Messages (`message.rs`): `AOMessage { action, from, id, data }`; responses `AOResponse { ok, data, error, messages: Vec<OutgoingMessage> }`; Action is carried as AO Tag `{"name":"Action","value":...}`; uninitialized process → error "Process not initialized — send Init first"; unauthorized action → "Action '…' not permitted for role …".

### G8. PRD canonical workflow (`FORMIX/docs/PRD.md`) — 3 phases
- PHASE 1 秘密の分割と初期配布 (O-Browser, steps 1-1..1-9): keygen → Shamir split f(0)→f(1..n) → AES-GCM encrypt shares → `Capsule = PRE_Enc(pk_o, k_o)` → receive requester pk → `rekey = PRE_ReKey(sk_o → pk_A)` → kFrag split → send kFrags to Owner-Process → store Capsule + shares on Arweave.
- PHASE 2 キーフラグメントの分散管理 (Owner/Holder-Process on AO, 2-1..2-6): select Holders (RandAO) → distribute kFrags → Holder verifies & stores (WASM snapshot) → `DelegateCapsule` push → `cFrag = PRE_ReEnc(kFrag, Capsule)` → store cFrag.
- PHASE 3 秘密の復元 (R-Browser, 3-1..3-8): request → collect ≥k cFrags → `Capsule' = PRE_Combine` → `k_o = PRE_Dec(sk_A, Capsule')` → fetch shares from Arweave by tags → AES-decrypt k shares → Shamir interpolation → f(0).
- Actors: O-Browser / Owner-Process / Holder-Process / Requester-Process / R-Browser. All processes load the SAME logic; behavior differs by role.

### G9. Working example (`client/examples/basic_usage.rs`, run: `cargo run --example basic_usage`)
Uses `FormixClient::with_storage` + `MockAOClient::new()` + `ArweaveStorageServiceImpl::default()` + `ContractStorageImpl::new_single_process(mock_ao)`; threshold 2-of-3; recovery with MockStorage is EXPECTED to fail with `ResourceNotFound` (no cFrag data without AO Network) — docs must not present mock recovery as succeeding.

### G10. Production status framing (user decision)
HyperBEAM client merged (PRs #92/#93: RFC-9421 rsa-pss-sha512 HTTP signatures, TABM multipart encoding, `hyperbeam` feature replacing `production-ao`). E2E integration in progress. Docs language: 「HyperBEAM 経由の本番 AO Network 接続は実験的（experimental）であり、E2E 統合作業中」— replaces flat "currently unavailable / migration in progress" notices. Local/Mock mode remains the supported path.

---

## File Map

| File (EN under `docs/docs/`, JA mirror under `docs/i18n/ja/docusaurus-plugin-content-docs/current/`) | Action |
|---|---|
| `intro.md` | Fix Lua→Rust/WASM; centralized status banner (G10) |
| `architecture/six-phase-workflow.md` | Add PRD 3-phase mapping table; verify steps vs G8 |
| `api/formix-client.md` | Expand per G1-G6, G9 |
| `api/actions-api.md` | Sync DTO/error surface vs G4/G5 |
| `api/ao-contract.md` | NEW page per G7 |
| `getting-started/quick-start.md` | Add library usage path (G9); status note (G10) |
| `getting-started/installation.md`, `development/commands.md`, `architecture/overview.md`, `architecture/security.md`, `development/project-structure.md` | Accuracy sweep; replace stale migration notices with G10 framing |
| `docs/blog/*` (4 template posts) | Delete; disable blog in `docs/docusaurus.config.ts`; remove navbar/footer links |

All commits on branch `docs/accuracy-dx-pass` (create from main in Task 0).

---

### Task 0: Branch

- [ ] **Step 1:** `cd /Users/momiyamashodai/Develop/MyProject/D-TPRES/D-TPRES-docs && git checkout -b docs/accuracy-dx-pass`

### Task 1: intro.md — Lua fix + status banner (EN)

**Files:** Modify `docs/docs/intro.md`

- [ ] **Step 1:** Read the file. Replace the tech-stack row claiming `AO Network (Lua)` with `| Smart Contracts | AO Network (Rust → WASM) | Re-encryption key coordination |` (keep table formatting of the file).
- [ ] **Step 2:** Replace the existing infrastructure-migration admonition with a single canonical status banner (Docusaurus `:::info` block):

```markdown
:::info Current Status (June 2026)
FORMIX runs fully in **local mode** (in-memory Mock AO backend) — this is the supported path today.
Production connectivity to the AO Network via **HyperBEAM** (`hyperbeam` feature flag: RFC-9421 HTTP
message signatures, TABM encoding) is **experimental**; end-to-end integration is in progress.
See [FormixClient API](./api/formix-client.md) for feature-flag details.
:::
```

- [ ] **Step 3:** Verify no other `Lua` mention remains: `grep -ri lua docs/docs/` → empty.
- [ ] **Step 4:** Commit: `git commit -am "docs(intro): fix contract language (Rust/WASM, not Lua), add canonical status banner"`

### Task 2: six-phase-workflow.md — PRD mapping + step verification (EN)

**Files:** Modify `docs/docs/architecture/six-phase-workflow.md`

- [ ] **Step 1:** Read the file fully. Add after the intro a mapping table:

```markdown
## Relation to the PRD's 3-Phase Model

FORMIX's PRD defines the protocol as **3 phases**; this page breaks the same protocol
into 6 finer-grained steps for explanation. The mapping:

| PRD Phase | This page |
|---|---|
| PHASE 1 — Secret splitting & initial distribution (client-side) | Phases 1–3 (Setup, Encrypt, Distribute) |
| PHASE 2 — Distributed key-fragment management (AO Network) | Phases 4–5 (Access Request, Re-Encrypt) |
| PHASE 3 — Secret recovery (client-side) | Phase 6 (Decrypt) |
```
  (Adjust the right-hand column to match this page's actual phase names/boundaries after reading — Setup/Encrypt/Distribute/Access Request/Re-Encrypt/Decrypt; phase boundaries must align with G8 actors: 1-1..1-9 client-side, 2-1..2-6 AO, 3-1..3-8 client-side.)
- [ ] **Step 2:** Verify every cryptographic formula/step in the page against G8 (PRD steps) and G6 (constants). Fix anything that contradicts: e.g. shares are AES-GCM-encrypted with owner symmetric key `k_o`; capsule is `PRE_Enc(pk_o, k_o)` (encapsulates the symmetric key, NOT the secret); kFrags come from splitting the re-encryption key; recovery needs ≥k cFrags + Shamir interpolation. Holder re-encryption is triggered by `DelegateCapsule`/`SubmitCapsule` + `Reencrypt` (G7), not by an access-request handshake, if the page claims otherwise.
- [ ] **Step 3:** Commit: `git commit -am "docs(workflow): map 6-phase explanation to PRD 3-phase model, sync steps with implementation"`

### Task 3: formix-client.md — API reference expansion (EN)

**Files:** Modify `docs/docs/api/formix-client.md`

- [ ] **Step 1:** Read the file. Ensure the three constructors are documented exactly per G2, including:
  - `new()` with an `:::caution` noting gateway URLs are stored but not yet wired (Issues #51/#52) — all network I/O uses the in-memory mock.
  - `with_storage()` with the G9 example imports (`MockAOClient`, `ArweaveStorageServiceImpl`, `ContractStorageImpl::new_single_process`).
  - `init()` marked NOT implemented (always returns `WorkflowFailed`, Issue #60), with `InitConfig` fields.
- [ ] **Step 2:** Add a **Feature Flags** section (G1): default = Mock backend; `hyperbeam` = experimental production AO; `key-export` = test-only byte access to keys.
- [ ] **Step 3:** Add a **Constants & Limits** section (G6): at minimum `MIN_THRESHOLD = 2`, `MAX_SHARES = 20`, key sizes, AES-GCM nonce/tag sizes. Note `threshold`/`total_shares` must satisfy `2 ≤ k ≤ n ≤ 20`.
- [ ] **Step 4:** Add/normalize **Error Handling** section with all 5 `ActionError` variants (G5), incl. `PartialStorageFailure` semantics (Arweave is immutable — no rollback; lists succeeded/failed share TXs).
- [ ] **Step 5:** Add **DTO** definitions per G4 (`SecretMetadata`, `SecretSharingResult`, `SecretRecoveryResult` with Zeroize-on-drop note, `SecretStatus`).
- [ ] **Step 6:** Add a **Runnable Example** section pointing to `cargo run --example basic_usage` with a condensed version of G9 code; explicitly note mock recovery returns `ResourceNotFound` (expected without AO Network).
- [ ] **Step 7:** Verify builder method lists match G3 exactly (names, required/optional, move semantics of `SecretKey`).
- [ ] **Step 8:** Commit: `git commit -am "docs(api): expand FormixClient reference — constructors, features, constants, errors, DTOs, runnable example"`

### Task 4: actions-api.md — surface sync (EN)

**Files:** Modify `docs/docs/api/actions-api.md`

- [ ] **Step 1:** Read the file. Cross-check every struct/enum it documents against G4/G5/G6. Fix field mismatches (e.g. `SecretRecoveryResult` MUST show both `recovered_secret` and `audit_tx_id`). Remove/flag anything not present in the implementation.
- [ ] **Step 2:** Commit: `git commit -am "docs(api): sync actions/domain API surface with implementation"`

### Task 5: NEW ao-contract.md (EN)

**Files:** Create `docs/docs/api/ao-contract.md`

- [ ] **Step 1:** Write the page from G7 only. Structure:
  - Frontmatter: `sidebar_position` after existing api pages; title "AO Contract API".
  - Intro: single Rust→WASM module (`formix-ao-contract`), instantiated as multiple AO processes; role assigned at `Init`; state lives in WASM memory, persisted via HyperBEAM memory snapshots. Status: experimental (G10).
  - **Message format**: `Action` carried as AO Tag; `Data` = JSON payload; example incoming message (use the `Init` test fixture shape from message.rs tests).
  - **Handlers table**: exactly the 8 actions from G7 with roles and purpose.
  - **Capsule state machine**: `Received → ReencInProgress → CFragReady` (+ `Error(String)`), tied to `SubmitCapsule`/`Reencrypt`.
  - **Errors**: uninitialized → "Process not initialized — send Init first"; role violation → "Action '…' not permitted for role …".
  - **Memory safety**: `StoredKeyFrag`/`StoredCFrag` zeroized on drop.
- [ ] **Step 2:** `grep -n "ListCapsulesByKFrag" docs/docs/` → must be empty (correct name is `ListCapsules`).
- [ ] **Step 3:** Commit: `git commit -am "docs(api): add AO contract API page (handlers, roles, capsule state machine)"`

### Task 6: quick-start.md — library path + status (EN)

**Files:** Modify `docs/docs/getting-started/quick-start.md`

- [ ] **Step 1:** Read the file. Keep the demo-CLI flow (`cargo run --release -- local all` etc. — verify these commands still exist in `FORMIX/demo/` / Makefile before keeping; adjust if changed).
- [ ] **Step 2:** Add a "Use FORMIX as a library" section based on G9 (with_storage + Mock, 2-of-3 share, expected `ResourceNotFound` on mock recovery), ending with `cargo run --example basic_usage`.
- [ ] **Step 3:** Replace the "Production Mode (Currently Unavailable)" block: keep the `FormixClient::new` reference snippet but reframe per G10 (experimental HyperBEAM; gateway URLs not yet wired, Issues #51/#52).
- [ ] **Step 4:** Commit: `git commit -am "docs(quick-start): add library usage path, update production-mode framing"`

### Task 7: Accuracy sweep — remaining EN pages

**Files:** Modify `docs/docs/getting-started/installation.md`, `docs/docs/development/commands.md`, `docs/docs/architecture/overview.md`, `docs/docs/architecture/security.md`, `docs/docs/development/project-structure.md`

- [ ] **Step 1:** For each file: read it; replace stale "migration in progress / unavailable / cwao deprecated" notices with one short line linking to intro's status banner + "HyperBEAM connectivity is experimental". Keep local-mode instructions as the supported path.
- [ ] **Step 2:** `project-structure.md`: ensure tree shows `ao/contracts/src/{lib.rs,message.rs,handlers.rs,state.rs,getrandom_impl.rs}` (Rust, NOT CosmWasm — verify what the page currently claims; the contract no longer uses CosmWasm, G7/message.rs says "replaces CosmWasm SubMsg").
- [ ] **Step 3:** `commands.md`: verify each make target exists in `FORMIX/Makefile` (`grep -E '^[a-z-]+:' FORMIX/Makefile`); fix/remove dead ones; update deployment-command notes per G10.
- [ ] **Step 4:** `security.md`: verify claims against G6 (AES-256-GCM, key sizes) and G7 (Zeroize in contract); `overview.md`: ensure crate name `formix` (not `formix-client`), storage description matches composite Arweave + ContractStorage.
- [ ] **Step 5:** Commit: `git commit -am "docs: accuracy sweep — status framing, contract stack, commands, naming"`

### Task 8: Blog removal

**Files:** Delete `docs/blog/` contents; Modify `docs/docusaurus.config.ts`

- [ ] **Step 1:** `git rm -r docs/blog`
- [ ] **Step 2:** In `docs/docusaurus.config.ts`: set `blog: false` in the classic preset; remove the navbar item `{to: '/blog', label: 'Blog', position: 'left'}` and the footer "Blog" link (read file first; exact shapes may differ).
- [ ] **Step 3:** Commit: `git commit -am "docs: remove placeholder blog (Docusaurus template content)"`

### Task 9: Japanese parity

**Files:** Modify/create all counterparts under `docs/i18n/ja/docusaurus-plugin-content-docs/current/` (incl. NEW `api/ao-contract.md`)

- [ ] **Step 1:** For each EN file changed in Tasks 1–7, apply the same changes to the JA counterpart in natural Japanese (not machine-literal). JA pages currently LACK the migration/status notices entirely — add the G10 status banner to JA intro and the short status lines elsewhere.
- [ ] **Step 2:** JA intro: also remove the outdated 開発状況 items (EVM統合・強力な鍵管理) that don't exist in EN/implementation.
- [ ] **Step 3:** Create JA `api/ao-contract.md` translating Task 5 content.
- [ ] **Step 4:** Parity check: `for f in $(cd docs/docs && find . -name '*.md'); do [ -f "docs/i18n/ja/docusaurus-plugin-content-docs/current/$f" ] || echo "MISSING JA: $f"; done` → empty.
- [ ] **Step 5:** Commit: `git commit -am "docs(ja): full parity with English docs incl. status notices and AO contract page"`

### Task 10: Build verification & wrap-up

- [ ] **Step 1:** `cd docs && yarn install --frozen-lockfile && yarn build` → must succeed; fix any broken links/MDX errors (Docusaurus fails build on broken links).
- [ ] **Step 2:** Spot-check: `grep -rn "currently unavailable\|Lua\|ListCapsulesByKFrag\|formix-client\b" docs/docs docs/i18n` → only intentional hits.
- [ ] **Step 3:** Update `docs/.claude/plans/docs-factual-accuracy-fix.md` Decisions/Next Steps sections (record the 4 user decisions) or delete it as superseded by this plan.
- [ ] **Step 4:** Final commit + summary of changes for the user.
