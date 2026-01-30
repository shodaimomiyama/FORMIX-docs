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

### AO CLI（オプション）

AO Networkへのデプロイには、AO CLIをインストールします：

```bash
# AO CLIをインストール
npm install -g @permaweb/ao-cli
```

## リポジトリのクローン

```bash
git clone https://github.com/shodaimomiyama/FORMIX.git
cd FORMIX
```

## 依存関係のインストール

```bash
# Rustの依存関係をインストールしてビルド
make build

# JavaScriptの依存関係をインストール
yarn install
```

## インストールの確認

テストスイートを実行して、すべてが正しく動作していることを確認します：

```bash
make test
```

すべてのテストがパスするはずです。問題が発生した場合は、[トラブルシューティング](#トラブルシューティング)セクションを確認してください。

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

ビルドが予期せず失敗する場合は、キャッシュをクリアしてみてください：

```bash
make clean
make build
```

## 次のステップ

インストールが完了したら、[クイックスタート](/docs/getting-started/quick-start)ガイドに進んで、最初のFORMIXサンプルを実行してください。
