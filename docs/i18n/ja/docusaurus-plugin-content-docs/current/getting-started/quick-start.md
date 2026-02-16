---
sidebar_position: 2
---

# クイックスタート

このガイドでは、`DTpresClient` 高レベルAPIを使用して秘密の共有と復元を行う方法を説明します。

## 概要

FORMIXワークフローは3つの主要なロールで構成されます：

1. **Owner** - データを暗号化し、アクセスポリシーを作成
2. **Holder** - 暗号化データを保存し、再暗号化鍵を管理
3. **Requester** - 暗号化データへのアクセスを要求

`DTpresClient` は低レベルの暗号操作（Capsule, KFrag, CFrag）を抽象化し、Type-Stateパターンによるコンパイル時安全性を備えたビルダーパターンAPIを提供します。

## 基本的な使用例

### ステップ1：クライアントの初期化

プロセスIDとゲートウェイ設定を指定して `DTpresClient` インスタンスを作成します：

```rust
use formix::actions::client::DTpresClient;

let client = DTpresClient::new(
    "your-ao-process-id".to_string(),
    "your-wallet-address".to_string(),
    "https://ao.arweave.net".to_string(),
    "https://arweave.net".to_string(),
);
```

### ステップ2：鍵ペアの生成

OwnerとRequesterの鍵ペアを生成します：

```rust
let (owner_sk, owner_pk) = client.generate_keypair()?;
let (requester_sk, requester_pk) = client.generate_keypair()?;
```

### ステップ3：秘密の共有（Owner）

ビルダーパターンを使用して、閾値パラメータで秘密を暗号化・共有します：

```rust
let share_result = client.share()
    .secret(b"Sensitive data to be shared".to_vec())
    .threshold(3)
    .total_shares(5)
    .owner_key(owner_sk)
    .requester_key(requester_pk)
    .execute()
    .await?;

println!("Secret shared with ID: {}", share_result.secret_id);
println!("Capsule stored at: {}", share_result.capsule_tx_id);
println!("KFrags distributed: {}", share_result.kfrag_count);
```

`share` は暗号化、Shamir秘密分散、Arweaveストレージ、KFrag生成、AOホルダープロセスへの配布を自動的に処理します。

### ステップ4：秘密の復元（Requester）

復元ビルダーを使用して、共有された秘密を取得・復号します：

```rust
let recovered = client.recover()
    .secret_id(&share_result.secret_id)
    .requester_key(requester_sk)
    .execute()?;

assert_eq!(recovered.recovered_secret, b"Sensitive data to be shared");
```

`recover` は再暗号化リクエスト、CFrag収集、復号を自動的に処理します。

## 次のステップ

- [アーキテクチャ](/docs/architecture/overview)を学んでFORMIXの内部動作を理解する
- [6フェーズワークフロー](/docs/architecture/six-phase-workflow)でプロトコルの詳細を確認
- [APIリファレンス](/docs/api/actions-api)で完全なAPIドキュメントを確認
