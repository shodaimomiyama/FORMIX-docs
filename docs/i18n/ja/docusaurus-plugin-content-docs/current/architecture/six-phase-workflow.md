---
sidebar_position: 2
---

# 6フェーズワークフロー

FORMIXプロトコルは、それぞれ特定の暗号操作を実行する6つの異なるフェーズで動作します。

## フェーズ概要

```
フェーズ1       フェーズ2       フェーズ3       フェーズ4       フェーズ5       フェーズ6
┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐
│Setup │──────│暗号化 │─────│配布   │─────│要求   │─────│再暗号 │──────│復号   │
└──────┘      └──────┘      └──────┘      └──────┘      └──────┘      └──────┘
  Owner        Owner         Owner          Requester     Holders      Requester
```

## フェーズ1: セットアップ

**アクター**: Owner

Umbral PRE暗号鍵ペアを生成し、クライアントを初期化します。

```rust
use formix::actions::client::DTpresClient;

let client = DTpresClient::new(
    "owner-process-id".to_string(),
    "wallet-address".to_string(),
    "https://ao.arweave.net".to_string(),
    "https://arweave.net".to_string(),
);

let (owner_sk, owner_pk) = client.generate_keypair()?;
let (requester_sk, requester_pk) = client.generate_keypair()?;
```

## フェーズ2: 暗号化

**アクター**: Owner

Umbral PREを使用してデータを暗号化し、Shamirシェアを作成します：

1. Ownerの公開鍵でPRE暗号化 → **Capsule** を生成
2. 対称鍵のShamir秘密分散 → **ShareCollection** を生成
3. 各シェアをOwnerの対称鍵でAES-GCM暗号化

### Capsule構造

```rust
Capsule {
    id: CapsuleId,
    secret_id: SecretId,
    capsule_data: Vec<u8>,        // シリアライズされたUmbral Capsuleバイト
    owner_public_key: Vec<u8>,
    arweave_tx_id: Option<String>,
}
```

## フェーズ3: 配布

**アクター**: Owner → Holder

Umbral再暗号化鍵フラグメント（KFrag）を生成し、AO Holder-Processに配布します。

### KFrag構造

```rust
#[derive(Zeroize, ZeroizeOnDrop)]
KFrag {
    id: KFragId,
    secret_id: SecretId,
    holder_index: u8,                   // ホルダーセット内の位置 (1..=n)
    holder_process_id: Option<String>,
    kfrag_data: Vec<u8>,                // シリアライズされたUmbral KeyFrag（機密）
}
```

## フェーズ4: アクセス要求

**アクター**: Requester

```rust
let recovered = client.recover()
    .secret_id(&share_result.secret_id)
    .requester_key(requester_sk)
    .execute()?;
```

## フェーズ5: 再暗号化

**アクター**: Holder-Process (AO)

各ホルダーが独立してKFragを使用してCapsuleを再暗号化し、CFragを生成します。

```
CFrag_i = PRE_ReEnc(KFrag_i, Capsule)
```

### CFrag構造

```rust
CFrag {
    id: CFragId,
    secret_id: SecretId,
    kfrag_id: KFragId,
    cfrag_data: Vec<u8>,
    holder_process_id: String,
}
```

## フェーズ6: 復号

**アクター**: Requester

```
1. k個のCFrag + Capsuleを結合 → 対称鍵 k_owner を復元
2. ShareCollectionのシェアを復号: f(i) = AES_GCM_Dec(k_owner, C_i)
3. Shamir再構成: secret = f(0) from k shares
```

## 状態遷移

`Secret` エンティティはステートマシンで進行状況を追跡します：

```
Initialized ──split()──▶ Split ──distribute()──▶ Distributed ──mark_recovered()──▶ Recovered
```

各遷移はバリデーションされ、無効な遷移は `DomainError::InvalidStateTransition` を返します。

## 次のステップ

- [セキュリティ特性](/docs/architecture/security) - 暗号学的保証
- [APIリファレンス](/docs/api/actions-api) - 実装詳細
