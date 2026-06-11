---
sidebar_position: 2
---

# AO Contract API

:::info 現在のステータス
AOコントラクトは**HyperBEAM**をターゲットとしており、**実験的**です — AO Networkとのエンドツーエンド統合は進行中です。同じハンドラロジックは、デモCLIと `MockAOClient` を介してローカルでも実行されます。
:::

FORMIXのオンチェーンレイヤーは、単一の**Rust → WASM**モジュール（`formix-ao-contract`）です。同じモジュールが複数のAOプロセスとしてデプロイされ、各プロセスには初期化時に**ロール**が割り当てられ、どのアクションを受け付けるかが制御されます。状態はWASMリニアメモリ上に存在し、HyperBEAMのメモリスナップショットを介して自動的に永続化されます。

## プロセスロール

```rust
pub enum ProcessRole {
    Owner,      // kFragとCapsuleをHolderに配布
    Holder,     // kFragを保存し、プロキシ再暗号化を実行
    Requester,  // 復元のためにcFragを照会
    Combined,   // シングルプロセスモード: Owner + Holderのアクション
}
```

すべてのプロセスは**同じロジック**をロードします — 動作は `Init` でリクエストされたロールによってのみ異なります。`Combined` はシングルプロセス構成を可能にします（ローカルワークフローで使用）。

## メッセージフォーマット

メッセージはAOの慣例に従います。アクション名はAOの**Tag**（`{"name": "Action", "value": "..."}`）として渡され、ペイロードは `Data` 内のJSONです。

```json
{
  "Id": "msg-123",
  "From": "wallet-abc",
  "Tags": [
    { "name": "Action", "value": "Init" },
    { "name": "Data-Protocol", "value": "ao" }
  ],
  "Data": "{\"role\":\"Owner\"}"
}
```

レスポンスはAOS互換フォーマット（`ok` / `response.Output.data` / `response.Messages` / `error`）で返されます。他のAOプロセスへの送信メッセージ（例: Owner → HolderへのkFrag配送）は `Messages` にリストされ、HyperBEAMによってルーティングされます。

## ハンドラ

| アクション | 許可されるロール | 目的 |
|--------|---------------|---------|
| `Init` | *(未初期化プロセス)* | プロセスロール（`Owner` / `Holder` / `Requester` / `Combined`）を割り当て、認可されたOwnerアドレスを記録 |
| `DelegateKFrag` | Owner, Combined | Owner-ProcessにkFragを保存し、Holder-Processに転送 |
| `DelegateCapsule` | Owner, Combined | Owner-ProcessからHolder-ProcessにCapsuleをプッシュ |
| `SubmitKFrag` | Holder, Combined | Holder-ProcessでkFragを受信して保存 |
| `SubmitCapsule` | Holder, Combined | Holder-ProcessでCapsuleを受信（再暗号化フローの入り口） |
| `Reencrypt` | Holder, Combined | プロキシ再暗号化を実行: `cFrag = PRE_ReEnc(kFrag, Capsule)` |
| `GetCFrag` | 初期化済みの任意のロール | 保存されたcFragを照会 |
| `ListCapsules` | 初期化済みの任意のロール | kFragに関連付けられたCapsule IDの一覧を取得 |

`Init` を除くすべてのアクションは、プロセスが事前に初期化されている必要があります。

## Capsuleステートマシン

プロセスが追跡する各Capsuleは、次のように遷移します:

```
Received ──▶ ReencInProgress ──▶ CFragReady
                   │
                   └──▶ Error(String)
```

| ステータス | 意味 |
|--------|---------|
| `Received` | `SubmitCapsule` / `DelegateCapsule` 経由でCapsuleが保存済み |
| `ReencInProgress` | `Reencrypt` が開始済み |
| `CFragReady` | cFragが生成・保存済み — `GetCFrag` で取得可能 |
| `Error(String)` | 再暗号化に失敗。理由が記録される |

## 状態レイアウト

```rust
pub struct ProcessState {
    pub role: Option<ProcessRole>,
    pub owner_id: Option<String>,                      // 認可された送信者
    pub owner_kfrags: HashMap<String, Vec<u8>>,        // kfrag_id → バイト列
    pub owner_capsules: HashMap<String, OwnerCapsuleData>, // (kfrag_id, capsule_id) → データ
    pub holder_cfrags: HashMap<String, Vec<u8>>,       // (kfrag_id, capsule_id) → バイト列
    pub kfrag_holders: HashMap<String, String>,        // kfrag_id → ホルダープロセスID
    pub kfrag_to_caps: HashMap<String, Vec<String>>,   // kfrag_id → [capsule_ids]
}
```

## エラー

| 条件 | レスポンス |
|-----------|----------|
| `Init` 前にアクションを送信 | `"Process not initialized — send Init first"` |
| プロセスロールで許可されていないアクション | `"Action '<action>' not permitted for role <Role>"` |
| 未登録の送信者からのSubmit | `"Unauthorized: only the registered owner can submit …"` |
| 不正な形式のkFragペイロード | `"Invalid kFrag payload: …"`（状態の破損を防ぐため、永続化前に検証） |
| ハンドラ固有の失敗 | `ok: false` と `error` メッセージ |

Submitは**冪等**です: すでに保存済みのkFragを再送信すると、エラーではなく `"idempotent": true` 付きの成功が返されます。

## メモリ安全性

デシリアライズされた鍵素材（`StoredKeyFrag`、`StoredCFrag`）は `Zeroize` / `ZeroizeOnDrop` を実装しており、フラグメントのバイト列は使用後にWASMリニアメモリから消去されます。各 `StoredKeyFrag` は、再暗号化時にkFragを暗号学的に検証するために使用される `VerificationData`（verifying / delegating / receivingの各公開鍵）を内包しています。

## 次のステップ

- [6フェーズワークフロー](/docs/architecture/six-phase-workflow) - 各ハンドラがプロトコルのどこに位置するか
- [FormixClient API](/docs/api/formix-client) - クライアント側のエントリーポイント
