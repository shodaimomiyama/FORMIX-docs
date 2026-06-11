---
sidebar_position: 1
---

# インストール

このガイドでは、FORMIXの開発環境のセットアップ方法を説明します。

## 前提条件

開始する前に、以下がインストールされていることを確認してください：

### Rust

FORMIXには**Rust 1.86.0**以降とWebAssemblyターゲットが必要です。

```bash
# rustupを使用してRustをインストール
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# wasm32ターゲットを追加
rustup target add wasm32-unknown-unknown

# インストールを確認
rustc --version
```

### Node.js

ツールとテストには**Node.js 20.0**以降が必要です。

```bash
# Node.jsのバージョンを確認
node --version
```

### Yarn

JavaScriptの依存関係管理にYarnを使用します。

```bash
# Yarnをグローバルにインストール
npm install -g yarn

# インストールを確認
yarn --version
```

:::note ローカルモードではAOデプロイツールは不要です
AO Networkへのコントラクトデプロイ（実験的、HyperBEAM経由）には、`ao/` 内のNode.jsスクリプト（`@permaweb/aoconnect`）を使用します。これらは `cd ao && npm install --ignore-scripts` でインストールできます。ローカルモードではこれらは一切**不要**です。[現在のステータス](/docs/intro#current-status)を参照してください。
:::

## リポジトリのクローン

```bash
git clone https://github.com/shodaimomiyama/FORMIX.git
cd FORMIX
```

## ビルド

FORMIXは独立したCargoクレートとして構成されています。必要なものをビルドしてください：

```bash
# コアクライアントライブラリ
cd client
make check        # cargo check

# デモCLI
cd ../demo
make build        # cargo build --release
```

## インストールの確認

クライアントのテストスイートを実行して、すべてが正しく動作していることを確認します：

```bash
cd client
make test
```

すべてのテストがパスするはずです。問題が発生した場合は、[トラブルシューティング](#トラブルシューティング)セクションを確認してください。

## ローカルデモを試す

セットアップを確認する最も手早い方法は、実行可能なライブラリサンプルです。完全なTPREサイクル（共有 → 再暗号化 → 復元）をすべてあなたのマシン上で実行します：

```bash
cd client
cargo run --example basic_usage
```

:::caution
デモCLI（`cd demo && cargo run --release -- local all`）は、コントラクトABI移行後の現在のmainブランチでは**一時的に動作しません**（`demo/Cargo.toml` の古い `contract` 依存名と `production-ao` フィーチャーが原因です）。詳細は[クイックスタート](/docs/getting-started/quick-start)を参照してください。
:::

## トラブルシューティング

### Rustコンパイルエラー

Rustのコンパイルに関連するエラーが表示された場合：

1. 正しいRustバージョンがあることを確認：
   ```bash
   rustup update
   rustup default stable
   ```

2. wasm32ターゲットがインストールされていることを確認：
   ```bash
   rustup target list --installed | grep wasm32
   ```

### Node.jsバージョンの問題

Node.jsの互換性の問題が発生した場合：

1. `nvm`のようなバージョンマネージャーを使用：
   ```bash
   nvm install 20
   nvm use 20
   ```

### ビルドキャッシュの問題

ビルドが予期せず失敗する場合は、キャッシュをクリアしてみてください（`client/` または `demo/` 内で実行）：

```bash
cargo clean
cargo build
```

## 次のステップ

インストールが完了したら、[クイックスタート](/docs/getting-started/quick-start)ガイドに進んで、最初のFORMIXサンプルを実行してください。
