---
sidebar_position: 2
---

# Development Commands

FORMIX uses `make` for build automation. This guide covers all available commands.

## Quick Reference

| Command | Description |
|---------|-------------|
| `make build` | Build all components |
| `make test` | Run all tests |
| `make clean` | Clean build artifacts |
| `make fmt` | Format code |
| `make lint` | Run linter |

## Build Commands

### `make build`

Builds all Rust components including Wasm modules.

```bash
make build
```

This command:
1. Compiles the core library
2. Builds all AO process Wasm modules
3. Generates TypeScript bindings (if applicable)

### `make build-release`

Creates optimized production builds.

```bash
make build-release
```

### `make build-wasm`

Builds only the WebAssembly modules.

```bash
make build-wasm
```

### `make clean`

Removes all build artifacts.

```bash
make clean
```

## Testing Commands

### `make test`

Runs the complete test suite.

```bash
make test
```

### `make test-unit`

Runs only unit tests.

```bash
make test-unit
```

### `make test-integration`

Runs integration tests.

```bash
make test-integration
```

### `make test-e2e`

Runs end-to-end tests (requires local AO environment).

```bash
make test-e2e
```

### `make test-coverage`

Generates test coverage report.

```bash
make test-coverage
```

Coverage reports are generated in `target/coverage/`.

## Code Quality Commands

### `make fmt`

Formats all Rust code using `rustfmt`.

```bash
make fmt
```

### `make fmt-check`

Checks formatting without modifying files.

```bash
make fmt-check
```

### `make lint`

Runs Clippy linter.

```bash
make lint
```

### `make lint-fix`

Runs Clippy and applies automatic fixes.

```bash
make lint-fix
```

## Development Commands

### `make dev`

Starts development environment with hot reloading.

```bash
make dev
```

### `make run-example`

Runs the basic example workflow.

```bash
make run-example
```

### `make bench`

Runs performance benchmarks.

```bash
make bench
```

Benchmark results are displayed in the terminal and saved to `target/criterion/`.

## Documentation Commands

### `make docs`

Generates Rust documentation.

```bash
make docs
```

### `make docs-open`

Generates and opens documentation in browser.

```bash
make docs-open
```

### `make docs-site`

Starts the Docusaurus documentation site.

```bash
make docs-site
```

## Deployment Commands

### `make deploy-local`

Deploys to local AO development environment.

```bash
make deploy-local
```

### `make deploy-testnet`

Deploys to AO testnet.

```bash
make deploy-testnet
```

**Note**: Requires proper configuration in `.env` file.

## Utility Commands

### `make check`

Runs all checks (format, lint, test) without building.

```bash
make check
```

### `make ci`

Runs the full CI pipeline locally.

```bash
make ci
```

This is equivalent to what runs in GitHub Actions.

### `make setup`

Sets up the development environment.

```bash
make setup
```

This installs:
- Required Rust targets
- Development dependencies
- Git hooks

## Environment Variables

Create a `.env` file from the template:

```bash
cp .env.example .env
```

Key environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `RUST_LOG` | Log level | `info` |
| `AO_GATEWAY` | AO gateway URL | `https://ao.arweave.dev` |
| `ARWEAVE_GATEWAY` | Arweave gateway | `https://arweave.net` |

## Cargo Commands

You can also use Cargo directly:

```bash
# Build
cargo build

# Test
cargo test

# Run specific test
cargo test test_encryption

# Build specific package
cargo build -p formix-crypto

# Run with features
cargo build --features "debug-mode"
```

## Troubleshooting

### Build Fails with Missing Target

```bash
rustup target add wasm32-unknown-unknown
```

### Lint Errors

```bash
# See all lint issues
make lint

# Auto-fix what's possible
make lint-fix
```

### Test Timeouts

For slow tests, increase the timeout:

```bash
RUST_TEST_TIME_UNIT=60000 make test
```

## Contributing

Before submitting a PR, run:

```bash
make ci
```

This ensures your code passes all checks.

## Next Steps

- [Project Structure](/docs/development/project-structure) - Code organization
- [API Reference](/docs/api/actions-api) - Actions layer documentation
