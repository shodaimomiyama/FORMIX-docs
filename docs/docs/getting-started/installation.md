---
sidebar_position: 1
---

# Installation

This guide walks you through setting up your development environment for FORMIX.

## Prerequisites

Before you begin, ensure you have the following installed:

### Rust

FORMIX requires **Rust 1.86.0** or later with the WebAssembly target.

```bash
# Install Rust using rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add the wasm32 target
rustup target add wasm32-unknown-unknown

# Verify installation
rustc --version
```

### Node.js

**Node.js 20.0** or later is required for tooling and testing.

```bash
# Verify Node.js version
node --version
```

### Yarn

Yarn is used for JavaScript dependency management.

```bash
# Install Yarn globally
npm install -g yarn

# Verify installation
yarn --version
```

:::note AO deployment tooling is not required for local mode
Contract deployment to the AO Network (experimental, via HyperBEAM) uses the Node.js scripts in `ao/` (`@permaweb/aoconnect`) — installed with `cd ao && npm install --ignore-scripts`. You do **not** need any of this for local mode. See [Current Status](/docs/intro#current-status).
:::

## Clone the Repository

```bash
git clone https://github.com/shodaimomiyama/FORMIX.git
cd FORMIX
```

## Build

FORMIX is organized as independent Cargo crates — build the one you need:

```bash
# Core client library
cd client
make check        # cargo check

# Demo CLI
cd ../demo
make build        # cargo build --release
```

## Verify Installation

Run the client test suite to verify everything is working:

```bash
cd client
make test
```

You should see all tests passing. If you encounter any issues, check the [troubleshooting section](#troubleshooting).

## Try the Local Demo

The quickest way to verify your setup is the runnable library example — it executes the full TPRE cycle (share → re-encrypt → recover) entirely on your machine:

```bash
cd client
cargo run --example basic_usage
```

:::caution
The demo CLI (`cd demo && cargo run --release -- local all`) is **temporarily broken** on current main after the contract ABI migration (stale `contract` dependency name and `production-ao` feature in `demo/Cargo.toml`). See [Quick Start](/docs/getting-started/quick-start) for details.
:::

## Troubleshooting

### Rust Compilation Errors

If you see errors related to Rust compilation:

1. Ensure you have the correct Rust version:
   ```bash
   rustup update
   rustup default stable
   ```

2. Verify the wasm32 target is installed:
   ```bash
   rustup target list --installed | grep wasm32
   ```

### Node.js Version Issues

If you encounter Node.js compatibility issues:

1. Use a version manager like `nvm`:
   ```bash
   nvm install 20
   nvm use 20
   ```

### Build Cache Issues

If builds fail unexpectedly, try cleaning the cache (inside `client/` or `demo/`):

```bash
cargo clean
cargo build
```

## Next Steps

Once installation is complete, proceed to the [Quick Start](/docs/getting-started/quick-start) guide to run your first FORMIX example.
