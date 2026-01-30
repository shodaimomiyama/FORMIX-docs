---
sidebar_position: 2
---

# 6フェーズワークフロー

FORMIXプロトコルは6つの異なるフェーズを通じて動作し、それぞれが特定の暗号操作を実行します。

## フェーズ概要

```
フェーズ1      フェーズ2      フェーズ3      フェーズ4      フェーズ5      フェーズ6
┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐
│セット │──────│暗号化 │─────│ 配布  │─────│ 要求  │─────│再暗号 │──────│ 復号  │
│ アップ│      │      │      │      │      │      │      │ 化    │      │      │
└──────┘      └──────┘      └──────┘      └──────┘      └──────┘      └──────┘
  Owner        Owner         Owner          Requester     Proxies      Requester
```

## フェーズ1：セットアップ

**アクター**: Owner

Ownerが暗号鍵ペアを生成し、システムを初期化します。

```rust
// Ownerの鍵ペアを生成
let owner_keypair = KeyPair::generate();

// AO上でOwnerプロセスを初期化
let owner_process = OwnerProcess::new(owner_keypair)?;
```

**出力**:
- Owner公開/秘密鍵ペア
- 初期化されたOwnerプロセス

## フェーズ2：暗号化

**アクター**: Owner

Ownerが公開鍵を使用して機密データを暗号化します。

```rust
// 暗号化するデータを準備
let secret_data = SecretData::new(sensitive_bytes);

// データを暗号化
let (capsule, ciphertext) = owner_process.encrypt(&secret_data)?;

// 暗号文をArweaveに保存
let arweave_tx = storage.upload(&ciphertext).await?;
```

**出力**:
- `Capsule` - 暗号化された対称鍵を含む
- `Ciphertext` - 暗号化データ
- ArweaveトランザクションID

### Capsule構造

```
Capsule {
    point_e: G1Point,      // E = r * G
    point_v: G1Point,      // V = r * pk_owner
    signature: Signature,   // 正しい形成の証明
}
```

## フェーズ3：配布

**アクター**: Owner → Holder

Ownerが再暗号化鍵フラグメントを生成し、プロキシノードに配布します。

```rust
// 閾値パラメータを定義
let threshold = 3;  // 必要最小数
let n_shares = 5;   // 総シェア数

// Requester用の鍵フラグメントを生成
let kfrags = owner_process.generate_kfrags(
    &requester_public_key,
    threshold,
    n_shares
)?;

// Holder/プロキシに配布
for (proxy_id, kfrag) in proxy_ids.iter().zip(kfrags.iter()) {
    holder_process.store_kfrag(proxy_id, kfrag)?;
}
```

**出力**:
- プロキシ間に配布された`n_shares`個のKFrag
- 各プロキシは正確に1つのKFragを保持

### KFrag構造

```
KFrag {
    id: FragmentId,
    key: G2Point,           // 再暗号化鍵コンポーネント
    precursor: G1Point,     // 検証データ
    proof: KFragProof,      // 正しさの証明
}
```

## フェーズ4：アクセス要求

**アクター**: Requester

Requesterが公開鍵を提示してアクセス要求を開始します。

```rust
// アクセス要求を作成
let request = AccessRequest::new(
    &requester_keypair.public_key(),
    &capsule_id,
)?;

// Holderに要求を送信
let request_id = holder_process.submit_request(request)?;
```

**出力**:
- アクセス要求ID
- Holderプロセスに記録された要求

## フェーズ5：再暗号化

**アクター**: プロキシノード（Holder経由）

各プロキシノードがKFragを使用してカプセルを独立して再暗号化します。

```rust
// 各プロキシが再暗号化を実行
// （Holderプロセスによって調整）
let cfrags: Vec<CFrag> = holder_process
    .process_reencryption(request_id)
    .await?;

// 閾値が満たされていることを確認
assert!(cfrags.len() >= threshold);
```

**出力**:
- `threshold`以上のCFrag
- 各CFragは独立して検証可能

### CFrag構造

```
CFrag {
    point_e1: G1Point,      // 再暗号化されたE
    point_v1: G1Point,      // 再暗号化されたV
    kfrag_id: FragmentId,   // ソースKFrag ID
    proof: CFraProof,       // 再暗号化証明
}
```

## フェーズ6：復号

**アクター**: Requester

RequesterがCFragを結合してデータを復号します。

```rust
// cfragを収集（少なくとも閾値以上）
let cfrags = requester_process.collect_cfrags(request_id)?;

// cfragを検証して結合
let combined = requester_process.combine_cfrags(
    &capsule,
    &owner_public_key,
    &cfrags
)?;

// 最終復号
let plaintext = requester_process.decrypt(
    &combined,
    &ciphertext
)?;
```

**出力**:
- 復号された平文データ

## 完全フロー図

```
    Owner                    Holder/Proxies              Requester
      │                           │                          │
      │ フェーズ1: セットアップ   │                          │
      ├──────────────────────────▶│                          │
      │                           │                          │
      │ フェーズ2: 暗号化         │                          │
      ├──(capsule, ciphertext)───▶│                          │
      │                           │                          │
      │ フェーズ3: 配布           │                          │
      ├──────(kfrags)────────────▶│                          │
      │                           │                          │
      │                           │◀─── フェーズ4: 要求 ─────┤
      │                           │                          │
      │                           │──── フェーズ5: 再暗号 ──▶│
      │                           │      (cfrags)            │
      │                           │                          │
      │                           │      フェーズ6: 復号     │
      │                           │                     ─────┤
      │                           │                          │
```

## エラー処理

各フェーズには検証ステップが含まれています：

| フェーズ | 検証 |
|-------|-------------|
| セットアップ | 鍵の有効性チェック |
| 暗号化 | カプセル形成証明 |
| 配布 | KFrag正しさ証明 |
| 要求 | 認可チェック |
| 再暗号化 | CFrag有効性証明 |
| 復号 | 整合性検証 |

## 次のステップ

- [セキュリティ特性](/docs/architecture/security) - 暗号保証
- [APIリファレンス](/docs/api/actions-api) - 実装詳細
