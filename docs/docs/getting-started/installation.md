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

### AO CLI (Currently Not Required)

:::note
AO CLI was previously used for deploying contracts to the AO Network. Due to the ongoing [infrastructure migration](/docs/intro#infrastructure-migration-notice), AO deployment is not currently operational. You do **not** need to install this for local mode.
:::

```bash
# Install AO CLI (only needed when production deployment resumes)
npm install -g @permaweb/ao-cli
```

## Clone the Repository

```bash
git clone https://github.com/shodaimomiyama/FORMIX.git
cd FORMIX
```

## Install Dependencies

```bash
# Install Rust dependencies and build
make build

# Install JavaScript dependencies (for tooling)
yarn install
```

## Verify Installation

Run the test suite to verify everything is working:

```bash
make test
```

You should see all tests passing. If you encounter any issues, check the [troubleshooting section](#troubleshooting).

## Try the Local Demo

The quickest way to verify your setup is to run the local demo:

```bash
cd demo
cargo run --release -- local all
```

This runs the full TPRE workflow (encrypt → re-encrypt → decrypt) entirely on your machine. See the [Quick Start](/docs/getting-started/quick-start) guide for details.

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

If builds fail unexpectedly, try cleaning the cache:

```bash
make clean
make build
```

## Next Steps

Once installation is complete, proceed to the [Quick Start](/docs/getting-started/quick-start) guide to run your first FORMIX example.
