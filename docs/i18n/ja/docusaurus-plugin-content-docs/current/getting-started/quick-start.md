---
sidebar_position: 2
---

# クイックスタート

このガイドでは、`FormixClient` 高レベルAPIを使用して秘密の共有と復元を行う方法を説明します。

## 概要

FORMIXワークフローは3つの主要なロールで構成されます：

1. **Owner** - データを暗号化し、アクセスポリシーを作成
2. **Holder** - 暗号化データを保存し、再暗号化鍵を管理
3. **Requester** - 暗号化データへのアクセスを要求

`FormixClient` は低レベルの暗号操作（Capsule, KFrag, CFrag）を抽象化し、シンプルなビルダーパターンAPIを提供します。

## 基本的な使用例

### ステップ1：クライアントの初期化

ウォレットパスを指定して `FormixClient` インスタンスを作成します：

```rust
use d_tpres::FormixClient;

let client = FormixClient::init("./wallet.json")
    .ao_gateway("https://ao-gateway.example.com")
    .arweave_gateway("https://arweave.net")
    .build()?;
```

### ステップ2：鍵ペアの生成

OwnerとRequester用の鍵ペアを生成します：

```rust
let (owner_sk, owner_pk) = client.generate_keypair()?;
let (requester_sk, requester_pk) = client.generate_keypair()?;
```

### ステップ3：秘密の共有（Owner）

ビルダーパターンを使用して、閾値パラメータ付きで秘密を暗号化・共有します：

```rust
let share_result = client.share()
    .secret(b"共有する機密データ")
    .threshold(3)
    .total_shares(5)
    .owner_key(&owner_sk)
    .requester_key(&requester_pk)
    .metadata("description", "サンプルの秘密")
    .execute()?;

println!("秘密を共有しました。ID: {}", share_result.secret_id);
```

`share` は暗号化、鍵フラグメントの生成、Holderノードへの配布を自動的に処理します。

### ステップ4：秘密の復元（Requester）

復元ビルダーを使用して、共有された秘密を取得・復号します：

```rust
let recovered = client.recover()
    .secret_id(&share_result.secret_id)
    .requester_key(&requester_sk)
    .owner_public_key(&owner_pk)
    .execute()?;

assert_eq!(recovered.as_slice(), b"共有する機密データ");
```

`recover` は再暗号化のリクエスト、フラグメントの収集、復号を自動的に処理します。

## 次のステップ

- FORMIXの内部動作を理解するために[アーキテクチャ](/docs/architecture/overview)を学ぶ
- 詳細なプロトコル説明のために[6フェーズワークフロー](/docs/architecture/six-phase-workflow)を探索
- 完全なAPIドキュメントは[APIリファレンス](/docs/api/actions-api)を確認
