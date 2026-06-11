---
sidebar_position: 2
---

# Development Commands

FORMIX is organized as independent Cargo crates (`client/`, `demo/`, `ao/contracts/`) — there is **no workspace-level Makefile**. Each directory has its own commands.

## Client Library (`client/`)

The core library uses `make` as a thin wrapper around Cargo:

| Command | Description |
|---------|-------------|
| `make check` | `cargo check` — fast type check |
| `make fmt` | `cargo fmt --all` — format code |
| `make clippy` | Clippy with the project's strict lint set (pedantic + nursery, `unwrap`/`expect`/`panic` denied) |
| `make clippy-strict` | Even stricter Clippy (restriction + cargo lints) for production/security audits |
| `make lint` | `fmt` + `clippy` |
| `make test` | `cargo test` — run the test suite |
| `make all` | `check` + `lint` + `test` |

```bash
cd client
make all
```

### Cargo directly

```bash
cd client

# Run the test suite
cargo test

# Run a single test
cargo test test_name

# Run the runnable example
cargo run --example basic_usage

# Build with the experimental HyperBEAM backend
cargo build --features hyperbeam
```

## Demo CLI (`demo/`)

:::caution Temporarily broken on main
The `demo` crate currently fails to build after the contract ABI migration — `demo/Cargo.toml` still references the renamed `contract` crate (now `formix-ao-contract`) and the removed `production-ao` feature. The targets below apply once that is fixed; meanwhile use `cd client && cargo run --example basic_usage`.
:::

| Command | Description |
|---------|-------------|
| `make help` | List all targets with descriptions |
| `make build` | Build the demo binary (release) |
| `make demo-local` | Run all local phases: keygen → share → reencrypt → recover (alias for `demo-local-all`) |
| `make demo-local-share REQUESTER_PUBKEY=<hex>` | Local Phase 1 only |
| `make demo-local-reencrypt SECRET_ID=<id>` | Local Phase 2 only |
| `make demo-local-recover SECRET_ID=<id>` | Local Phase 3 only |
| `make demo-keygen ROLE=owner\|requester` | Generate a key pair for a role |

```bash
cd demo
make demo-local
```

Equivalent to: `cargo run --release -- local all`

You can pass a custom secret:

```bash
make demo-local PLAINTEXT="my secret message"
```

### Individual phase commands (Cargo)

```bash
cd demo

# Phase 1: Owner splits & encrypts the secret
cargo run --release -- local share --requester-pubkey <hex>

# Phase 2: Holder performs proxy re-encryption
cargo run --release -- local reencrypt --secret-id <id>

# Phase 3: Requester recovers the secret
cargo run --release -- local recover --secret-id <id>
```

## AO Contract (`ao/`)

:::caution Experimental
Deployment targets the AO Network via HyperBEAM and is **experimental** — end-to-end integration is in progress, and parts of the deployment tooling are still being wired up. Local mode does not require any of this.
:::

```bash
# Build the contract WASM
cd ao
npm install --ignore-scripts
npm run build     # cargo build --target wasm32-unknown-unknown --release

# Deploy the module to Arweave (requires a funded wallet)
npm run deploy -- --wallet /path/to/arweave-keyfile.json
```

From `demo/`, the same flow is wrapped as `make setup` / `make deploy` (see `make help`).

## Environment Variables

| File | Variable | Description |
|------|----------|-------------|
| `demo/.env` (from `demo/.env.example`) | `ARWEAVE_WALLET_PATH` | Path to the Arweave JWK wallet used by deployment targets |

`RUST_LOG` controls log verbosity for all Rust binaries (e.g. `RUST_LOG=debug`).

## Contributing

Before submitting a PR, run from `client/`:

```bash
make all
```

This runs the same checks as CI (format, strict Clippy, tests).

## Next Steps

- [Project Structure](/docs/development/project-structure) - Code organization
- [API Reference](/docs/api/actions-api) - Actions layer documentation
