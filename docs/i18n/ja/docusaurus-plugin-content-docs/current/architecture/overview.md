---
sidebar_position: 1
---

# アーキテクチャ概要

FORMIXは、関心の分離と依存性逆転を備えた**クリーンアーキテクチャ**パターンに従います。

## レイヤー構造

```
┌─────────────────────────────────────────┐
│           Actions レイヤー                │  ← パブリックAPI (DTpresClient, Builders)
├─────────────────────────────────────────┤
│         Controller レイヤー               │  ← 入力バリデーション & DTO変換
├─────────────────────────────────────────┤
│          UseCase レイヤー                 │  ← Workflow, Service, Core
│  ┌─────────┬──────────┬──────────┐      │
│  │Workflow  │ Service  │  Core    │      │
│  │(Sharing, │(Crypto,  │(Storage, │      │
│  │Recovery) │ Storage) │ Contract)│      │
│  └─────────┴──────────┴──────────┘      │
├─────────────────────────────────────────┤
│          Domain レイヤー                  │  ← エンティティ, 値オブジェクト, エラー
├─────────────────────────────────────────┤
│       Repositories レイヤー               │  ← 永続化抽象 (Traits)
├─────────────────────────────────────────┤
│         Adapter レイヤー                  │  ← 外部統合
│  ┌──────────────┬────────────────┐      │
│  │RepositoryImpl│   External     │      │
│  │(Arweave CRUD)│(AO, Arweave,  │      │
│  │              │ MockAO)        │      │
│  └──────────────┴────────────────┘      │
└─────────────────────────────────────────┘
```

## レイヤー説明

### Actions レイヤー
すべての外部インタラクションのエントリーポイント：
- `DTpresClient` をメインパブリックAPIとして提供
- Type-State `ShareBuilder` / `RecoverBuilder` でコンパイル時安全性を確保
- `ActionsContainer` で依存性注入を管理
- 入力バリデーションをControllerレイヤーに委譲

### Controller レイヤー
入力バリデーションとDTO変換を担当：
- `ShareValidator` - 共有操作パラメータのバリデーション
- `RecoverExtractor` - 復元パラメータの抽出とDTO変換
- `ControllerContainer` - コントローラ依存関係のDIコンテナ

### UseCase レイヤー
アプリケーション固有のビジネスロジック：
- **Workflow** - `SecretSharingService`（フェーズ1）と `SecretRecoveryService`（フェーズ3）
- **Service** - `CryptoService`（Umbral TPRE, Shamir, AES-GCM）と `StorageService`（Arweave + AO複合）
- **Core** - `ArweaveStorageService`、`ContractStorage`、`CryptoService` のコアトレイト定義

### Domain レイヤー
外部懸念事項から独立したコアビジネスロジック：
- **エンティティ**: `Secret`（集約ルート）, `Capsule`, `ShareCollection`, `KFrag`, `CFrag`
- **値オブジェクト**: `SecretId`, `CapsuleId`, `ShareCollectionId`, `KFragId`, `CFragId`, `KeyPair`, `SecretData`, `SymmetricKey`
- **ステートマシン**: `SecretState` (Initialized → Split → Distributed → Recovered)

### Repositories レイヤー
依存性逆転によるトレイトベースの永続化抽象：
- `SecretRepository`, `CapsuleRepository`, `ShareCollectionRepository`, `KFragRepository`, `CFragRepository`

### Adapter レイヤー
外部統合の実装：
- **RepositoryImpl** - Arweaveバックのリポジトリ実装
- **External/AO** - `AOClient` トレイト、`ProductionAOClient`、メッセージ型
- **External/Arweave** - `ArweaveClient` トレイト、トランザクション処理
- **External/MockAO** - テスト用インメモリAOクライアント

## ストレージアーキテクチャ

不変データストレージとコントラクト通信を分離する複合ストレージパターン：

```
┌──────────────────────────────────────────────┐
│              StorageService                   │
│  (複合: Arweave + Contract)                   │
├──────────────────────┬───────────────────────┤
│ ArweaveStorageService│   ContractStorage     │
│ (不変データ)          │   (AO Network)        │
│ - store_data()       │   - send_kfrags()     │
│ - retrieve_data()    │   - delegate_capsule()│
│ - query_by_tags()    │   - retrieve_cfrags() │
└──────────────────────┴───────────────────────┘
```

### タグベースストレージ

| タグ | 説明 |
|-----|-------------|
| `App-Name` | 常に `"FORMIX"` |
| `Entity-Type` | `Secret`, `ShareCollection`, `Capsule`, `KFrag`, `CFrag` |
| `Entity-Id` | エンティティ固有のUUID |
| `Secret-Id` | 親秘密のUUID（子エンティティ用） |
| `Holder-Index` | ホルダーセット内の位置（KFrag用） |
| `Deleted` | ソフト削除フラグ |

## プロセスアーキテクチャ

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│    Owner     │    │    Holder    │    │  Requester   │
│  (Client)    │    │  (AO Proc)  │    │  (Client)    │
├──────────────┤    ├──────────────┤    ├──────────────┤
│ - 暗号化     │    │ - 保存       │    │ - リクエスト   │
│ - KFrag生成  │───▶│ - 再暗号化    │◀───│ - 収集       │
│ - 認可       │    │ - 配布       │    │ - 復号       │
└──────────────┘    └──────────────┘    └──────────────┘
```

現在の `DTpresClient` は、呼び出し元が1つのAOプロセスコンテキスト内でデータ所有者とリクエスターの両方の役割を果たす**セルフサービスワークフロー**向けに設計されています。

## データフロー

1. **暗号化**: Owner がデータを暗号化 → Capsule + 暗号化シェア
2. **保存**: CapsuleとShareCollectionをArweaveに保存
3. **配布**: Owner がKFragを生成 → AO Holder-Processに送信
4. **リクエスト**: Requester がAO経由でアクセスを要求
5. **再暗号化**: Holder がKFragからCFragを生成
6. **復号**: Requester がCFragを結合 → シェアを復号 → 秘密を復元

## 次のステップ

- [6フェーズワークフロー](/docs/architecture/six-phase-workflow) - 詳細なプロトコルフロー
- [セキュリティ特性](/docs/architecture/security) - 暗号学的保証
