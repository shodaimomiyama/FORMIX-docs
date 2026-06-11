---
sidebar_position: 2
---

# 6フェーズワークフロー

:::info ローカルモード
完全な6フェーズワークフローは現在**ローカルモードのみ**で利用可能で、すべてのフェーズがネットワーク依存なしにお使いのマシン上で実行されます。プロトコルロジックは同一であり、実行環境のみが異なります。完全なワークフローを実行するには、CLIデモ（`cargo run --release -- local all`）を使用してください。詳細は[クイックスタート](/docs/getting-started/quick-start)を参照してください。
:::

FORMIXプロトコルは、それぞれ特定の暗号操作を実行する6つの異なるフェーズで動作します。

## PRDの3フェーズモデルとの関係

FORMIXのPRDはプロトコルを**3フェーズ**として定義しています。本ページでは説明のために、同じプロトコルをより細かい6つのステップに分解しています。対応関係：

| PRDフェーズ | 本ページ |
|-----------|-----------|
| **PHASE 1** — 秘密の分割と初期配布（クライアント側、ステップ 1-1…1-9） | フェーズ1（セットアップ）、フェーズ2（暗号化）、フェーズ3（配布: kFrag生成と送信） |
| **PHASE 2** — 分散鍵フラグメント管理（AO Network、ステップ 2-1…2-6） | Holder側でのkFragの受信/保存（フェーズ3の最後）、フェーズ5（再暗号化） |
| **PHASE 3** — 秘密の復元（クライアント側、ステップ 3-1…3-8） | フェーズ4（アクセス要求）、フェーズ6（復号） |

## フェーズ概要

```
Phase 1        Phase 2        Phase 3        Phase 4        Phase 5        Phase 6
┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐
│Setup │──────│Encrypt│─────│Distrib│─────│Request│─────│Re-Enc│──────│Decrypt│
└──────┘      └──────┘      └──────┘      └──────┘      └──────┘      └──────┘
  Owner        Owner         Owner          Requester     Holders      Requester
```

## フェーズ1: セットアップ

**アクター**: Owner

OwnerがUmbral PRE暗号鍵ペアを生成し、クライアントを初期化します。

```rust
use formix::actions::client::FormixClient;

// クライアントを初期化
let client = FormixClient::new(
    "owner-process-id".to_string(),
    "wallet-address".to_string(),
    "https://ao.arweave.net".to_string(),
    "https://arweave.net".to_string(),
);

// 鍵ペアを生成
let (owner_sk, owner_pk) = client.generate_keypair()?;
let (requester_sk, requester_pk) = client.generate_keypair()?;
```

**出力**：
- Ownerの公開鍵/秘密鍵ペア（Umbral PRE）
- Requesterの公開鍵/秘密鍵ペア（Umbral PRE）

## フェーズ2: 暗号化

**アクター**: Owner

OwnerがUmbral PREを使用してデータを暗号化し、Shamirシェアを作成します。内部的には、`share()` ビルダーが以下をオーケストレーションします：

1. **秘密** `f(0)` のShamir秘密分散 → シェア `f(1)…f(n)`
2. 各シェアをOwnerの対称鍵 `k_owner` でAES-GCM暗号化 → **ShareCollection** を生成
3. `k_owner` をOwnerの公開鍵でPRE暗号化 → **Capsule** を生成

```rust
// これは share() ビルダーが内部的に処理します
// Capsule = PRE_Enc(pk_owner, k_owner)
// ShareCollection = { C_i = AES_GCM(k_owner, f(i)) } for i = 1..n
```

**出力**：
- `Capsule` - シリアライズされたUmbralカプセル（カプセル化された対称鍵）
- `ShareCollection` - n個の暗号化Shamirシェア
- 両者のArweaveトランザクションID

### Capsule構造

```rust
Capsule {
    id: CapsuleId,                // 一意の識別子
    secret_id: SecretId,          // 親秘密への参照
    capsule_data: Vec<u8>,        // シリアライズされたUmbral Capsuleバイト
    owner_public_key: Vec<u8>,    // OwnerのPRE公開鍵
    arweave_tx_id: Option<String>, // Arweaveストレージ参照
    created_at: u64,
}
```

## フェーズ3: 配布

**アクター**: Owner → Holder

OwnerがUmbral再暗号化鍵フラグメント（KFrag）を生成し、AO Holder-Processに配布します。

```rust
// share() ビルダーが内部的に処理します:
// 1. Requesterの公開鍵に対してn個のKFragを生成
// 2. ContractStorage経由で各KFragをAO Holder-Processに送信
```

**出力**：
- `n` 個のKFragがHolder-Processに配布される
- 各KFragに `holder_index`（1..=n）が割り当てられる

### KFrag構造

```rust
#[derive(Zeroize, ZeroizeOnDrop)]
KFrag {
    id: KFragId,                        // 一意の識別子
    secret_id: SecretId,                // 親秘密への参照
    holder_index: u8,                   // ホルダーセット内の位置 (1..=n)
    holder_process_id: Option<String>,  // AOプロセスID
    kfrag_data: Vec<u8>,                // シリアライズされたUmbral KeyFrag（機密）
    created_at: u64,
}
```

**セキュリティ**: KFragのデータはドロップ時に自動的にメモリからゼロ化されます。

## フェーズ4: アクセス要求

**アクター**: Requester

Requesterが秘密の復元を開始します。`recover()` ビルダーがアクセス要求を内部的に処理します。

```rust
let recovered = client.recover()
    .secret_id(&share_result.secret_id)
    .requester_key(requester_sk)
    .owner_key(owner_pk)
    .execute()
    .await?;
```

**出力**：
- 復元要求がワークフローサービスに送信される
- 秘密のメタデータと閾値パラメータが取得される

## フェーズ5: 再暗号化

**アクター**: Holder-Process (AO)

各ホルダーが独立して自身のKFragを使用してCapsuleを再暗号化し、CFragを生成します。これはAO Holder-Processによって調整されます。

```
CFrag_i = PRE_ReEnc(KFrag_i, Capsule)
```

復元を成功させるには、少なくとも `threshold`（k）個のCFragを収集する必要があります。

### CFrag構造

```rust
#[derive(Zeroize, ZeroizeOnDrop)]
CFrag {
    id: CFragId,                   // 一意の識別子
    secret_id: SecretId,           // 親秘密への参照
    kfrag_id: KFragId,             // 元のKFrag ID
    holder_index: u8,              // ホルダーセット内の位置 (1..=n)
    cfrag_data: Vec<u8>,           // 再暗号化Capsuleフラグメント（機密）
    created_at: u64,
}
```

## フェーズ6: 復号

**アクター**: Requester

Requesterが閾値個のCFragをCapsuleと結合して対称鍵を復元し、シェアを復号します。

```
1. k個のCFrag + Capsuleを結合 → 対称鍵 k_owner を復元
2. ShareCollectionのシェアを復号: f(i) = AES_GCM_Dec(k_owner, C_i)
3. Shamir再構成: secret = f(0) from k shares
```

**出力**：
- 復号された平文データ（`SecretRecoveryResult` のドロップ時に自動的にゼロ化）

## 完全なフロー図

```
    Owner                    Holder (AO)                Requester
      │                           │                          │
      │ Phase 1: Setup            │                          │
      ├──(generate keypairs)──────│                          │
      │                           │                          │
      │ Phase 2: Encrypt          │                          │
      ├──(capsule + shares)──────▶│ Arweave                  │
      │                           │                          │
      │ Phase 3: Distribute       │                          │
      ├──────(kfrags)────────────▶│                          │
      │                           │                          │
      │  Secret.state:            │                          │
      │  Initialized→Split→       │                          │
      │  Distributed              │                          │
      │                           │                          │
      │                           │◀─── Phase 4: Request ────┤
      │                           │                          │
      │                           │──── Phase 5: Re-Enc ────▶│
      │                           │      (cfrags)            │
      │                           │                          │
      │                           │      Phase 6: Decrypt    │
      │                           │                     ─────┤
      │                           │                          │
      │                           │  Secret.state:           │
      │                           │  →Recovered              │
```

## エラーハンドリング

各フェーズには検証ステップが含まれます：

| フェーズ | 検証内容 |
|-------|-------------|
| セットアップ | 鍵ペアの有効性チェック |
| 暗号化 | Capsuleの形成、シェア数のバリデーション |
| 配布 | KFrag数がthreshold_nと一致、ホルダーインデックスの範囲 |
| 要求 | 秘密の状態がDistributedであること |
| 再暗号化 | CFragの有効性、閾値の充足 |
| 復号 | 整合性検証、Shamir再構成チェック |

## 状態遷移

`Secret` エンティティはステートマシンで進行状況を追跡します：

```
Initialized ──split()──▶ Split ──distribute()──▶ Distributed ──mark_recovered()──▶ Recovered
```

各遷移はバリデーションされ、無効な遷移（例: Initialized状態からの配布）は `DomainError::InvalidStateTransition` を返します。

## 次のステップ

- [セキュリティ特性](/docs/architecture/security) - 暗号学的保証
- [APIリファレンス](/docs/api/actions-api) - 実装詳細
