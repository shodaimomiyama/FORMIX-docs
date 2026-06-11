---
sidebar_position: 2
---

# クイックスタート

このガイドでは、CLIデモツールを使用してFORMIXのTPREワークフローを実行する方法を説明します。

:::info 現在のステータス
**ローカルモード**が現在サポートされている方法です。ネットワークに一切依存せず、完全な暗号ワークフローを実行できます。プロダクションモード（HyperBEAM経由のAO Network）は**実験的**です。[現在のステータス](/docs/intro#current-status)を参照してください。
:::

## 概要

FORMIXワークフローは3つの主要なロールで構成されます：

1. **Owner** - データを暗号化し、アクセスポリシーを作成
2. **Holder** - 再暗号化鍵を保存し、プロキシ再暗号化を実行
3. **Requester** - 暗号化データへのアクセスを要求

ローカルモードでは、3つのロールすべてがあなたのマシン上で動作します。Holderコントラクトロジックはオンチェーンではなくネイティブに実行されます。

## ローカルデモ（CLI）

`demo/` ディレクトリは、完全なTPREワークフローを3つのフェーズに分けてローカル実行するCLIツールを提供します。

:::caution デモCLIはmainブランチで一時的に動作しません
コントラクトABI移行後、`demo` クレートは現在ビルドに失敗します。`contract` パス依存が `formix-ao-contract` にリネームされ、削除済みの `production-ao` フィーチャーフラグ（`hyperbeam` に置き換え）を要求しているためです。`demo/Cargo.toml` が更新されるまでは、[以下のライブラリの方法](#formixをライブラリとして使用する)を使用してください。`cargo run --example basic_usage` は完全なサイクルを実行し、動作確認済みです。
:::

### すべてのフェーズを一括実行

```bash
cd demo
cargo run --release -- local all
```

または、Makeを使用：

```bash
cd demo
make demo-local
```

これにより、完全なワークフロー（鍵生成 → 暗号化＆共有 → 再暗号化 → 復元＆復号）が実行されます。

### フェーズごとに実行

#### フェーズ1：Share（Ownerが秘密を暗号化・分割）

```bash
cargo run --release -- local share
```

このフェーズでは：
1. OwnerとRequesterのUmbral PRE鍵ペアを生成
2. **Shamir秘密分散**（2-of-3）で**秘密**を分割
3. 各シェアをOwnerの対称鍵を使用して**AES-GCM**で暗号化
4. 対称鍵をUmbral PREでカプセル化し、**Capsule**を生成
5. **KFrag**（再暗号化鍵フラグメント）を生成

出力は `.formix-demo/owner/{secret_id}.local-share.json` に保存されます。

#### フェーズ2：Re-Encrypt（Holderがプロキシ再暗号化を実行）

```bash
cargo run --release -- local reencrypt
```

このフェーズでは：
1. コントラクトのHolderプロセスをローカルにインスタンス化（Rustコントラクトロジックのネイティブ実行）
2. 各HolderにKFragとCapsuleを送信
3. 各Holderが独立して**CFrag**（再暗号化されたカプセルフラグメント）を生成

出力は `.formix-demo/contract/{secret_id}.local-reencrypt.json` に保存されます。

#### フェーズ3：Recover（Requesterが秘密を復号）

```bash
cargo run --release -- local recover
```

このフェーズでは：
1. 閾値分のCFragを収集
2. CFragとCapsuleを組み合わせ、**Umbral PREデカプセル化**で対称鍵を復元
3. 復元した鍵で暗号化されたシェアを復号
4. **Shamir補間**により元の秘密を再構築

### データディレクトリ構造

```
.formix-demo/
├── owner/
│   ├── owner.json                          # Owner鍵ペア（hex）
│   └── {secret_id}.local-share.json        # フェーズ1の出力
├── requester/
│   └── requester.json                      # Requester鍵ペア（hex）
└── contract/
    └── {secret_id}.local-reencrypt.json    # フェーズ2の出力（CFrag）
```

## FORMIXをライブラリとして使用する

インメモリのMock AOバックエンドを使用する `FormixClient` により、同じワークフローを自分のRustコードから実行できます：

```rust
use std::sync::Arc;
use formix::actions::FormixClient;
use formix::adapter::external::mock_ao::MockAOClient;
use formix::usecase::core::contract_storage::ContractStorageImpl;
use formix::usecase::core::storage::ArweaveStorageServiceImpl;

#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // インメモリMock AOバックエンドを使用するクライアント
    let mock_ao = Arc::new(MockAOClient::new());
    let arweave = Arc::new(ArweaveStorageServiceImpl::default());
    let contract = Arc::new(ContractStorageImpl::new_single_process(mock_ao));

    let client = FormixClient::with_storage(
        "process_001".to_string(),
        "wallet_address_example".to_string(),
        "https://ao.arweave.net".to_string(),
        "https://arweave.net".to_string(),
        arweave,
        contract,
    );

    // 鍵ペアの生成
    let (owner_sk, _owner_pk) = client.generate_keypair()?;
    let (_requester_sk, requester_pk) = client.generate_keypair()?;

    // 2-of-3の閾値で秘密を共有（フェーズ1）
    let result = client.share()
        .secret(b"Hello, FORMIX!".to_vec())
        .threshold(2)
        .total_shares(3)
        .owner_key(owner_sk)
        .requester_key(requester_pk)
        .execute()
        .await?;

    println!("Secret ID:   {}", result.secret_id);
    println!("Capsule TX:  {}", result.capsule_tx_id);
    println!("kFrag count: {}", result.kfrag_count);
    Ok(())
}
```

秘密の復元まで含む完全版はクレートに同梱されています：

```bash
cd client
cargo run --example basic_usage
```

`ContractStorageImpl::new_single_process` を使用すると、**共有 → 再暗号化 → 復元の完全なサイクルがインメモリで実行されます**。サンプルは復元された平文（`"Hello, FORMIX!"`）と監査トランザクションIDを出力します。詳細は [FormixClient API](/docs/api/formix-client) を参照してください。

## プロダクションモード（実験的）

:::caution 実験的
**HyperBEAM**（`hyperbeam` フィーチャーフラグ）経由のAO Networkへのプロダクション接続は実装済みですが、エンドツーエンドの統合はまだ進行中です。さらに、`FormixClient::new()` のゲートウェイURLパラメータは現在保存されるだけで、ネットワークレイヤーには接続されていません（[Issue #51](https://github.com/shodaimomiyama/FORMIX/issues/51)/#52）。以下はプロダクションワークフローのリファレンスです：
:::

FORMIXはArweave（ストレージ）+ AO Network（コンピュート）上で動作するよう設計されています。`FormixClient` 高レベルAPIは、プロダクションワークフロー向けのビルダーパターンインターフェースを提供します：

```rust
use formix::actions::client::FormixClient;

// プロダクションクライアントの初期化（AOプロセス + Arweaveゲートウェイが必要）
let client = FormixClient::new(
    "your-ao-process-id".to_string(),
    "your-wallet-address".to_string(),
    "https://ao.arweave.net".to_string(),
    "https://arweave.net".to_string(),
);

let (owner_sk, owner_pk) = client.generate_keypair()?;
let (requester_sk, requester_pk) = client.generate_keypair()?;

// 秘密の共有
let share_result = client.share()
    .secret(b"Sensitive data to be shared".to_vec())
    .threshold(3)
    .total_shares(5)
    .owner_key(owner_sk)
    .requester_key(requester_pk)
    .execute()
    .await?;

// 秘密の復元
let recovered = client.recover()
    .secret_id(&share_result.secret_id)
    .requester_key(requester_sk)
    .owner_key(owner_pk)
    .execute()
    .await?;
```

このAPIは、暗号化、Shamir秘密分散、Arweaveストレージ、AO HolderプロセスへのKFrag配布、CFrag収集を自動的に処理します。HyperBEAMのエンドツーエンド統合が完了次第、完全に動作するようになります。

## 次のステップ

- [アーキテクチャ](/docs/architecture/overview)を学んでFORMIXの内部動作を理解する
- [6フェーズワークフロー](/docs/architecture/six-phase-workflow)でプロトコルの詳細を確認
- [APIリファレンス](/docs/api/actions-api)で完全なAPIドキュメントを確認
