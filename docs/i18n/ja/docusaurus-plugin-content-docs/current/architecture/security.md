---
sidebar_position: 3
---

# セキュリティ特性

FORMIXは、Umbralベースの閾値プロキシ再暗号化スキームにより、強力な暗号学的保証を提供します。

## コアセキュリティ特性

### IND-CPAセキュリティ

FORMIXは**選択平文攻撃下での識別不可能性（IND-CPA）**を達成します。すなわち：

- 攻撃者は2つの異なるメッセージの暗号化を区別できません
- 暗号化オラクルへのアクセスがあっても、暗号文は平文について何も明らかにしません
- セキュリティは基盤となる楕円曲線上の判定Diffie-Hellman（DDH）問題の困難性に依拠します

### 閾値障害耐性

システムは閾値の制限まで、ビザンチン障害に耐えます：

| 設定 | 耐性 |
|--------------|-----------|
| (3, 5) | 2つの悪意ある/障害ノード |
| (5, 9) | 4つの悪意ある/障害ノード |
| (t, n) | n - t の障害 |

**特性**：
- 任意の `t` 個の正直なノードで再暗号化を完了可能
- `t` 未満のノードは秘密について何も知り得ない
- 単一障害点なし

### 共謀耐性

複数の当事者が共謀しても、以下は不可能です：

1. **プロキシ + Requester共謀**: Ownerの認可なしには復号不可
2. **プロキシ + プロキシ共謀**: 閾値未満のプロキシでは再暗号化鍵を再構築不可
3. **Owner + Requester共謀**: データは保管時も暗号化されたまま

## 暗号プリミティブ

### Umbral プロキシ再暗号化

FORMIXは**Umbral**閾値プロキシ再暗号化スキームを使用し、以下を提供します：

- Ownerの秘密鍵を明かさない閾値再暗号化
- 単方向再暗号化（Owner → Requesterのみ）
- 非対話的鍵生成（OwnerがRequesterの参加なしにKFragを生成）

### ハイブリッド暗号化

CapsuleはUmbral PREを使用して対称鍵をカプセル化します：

```
1. ランダム対称鍵 k_owner を生成
2. Capsule = PRE_Enc(pk_owner, k_owner)
3. AES-GCMで k_owner を使用してデータを暗号化
4. CapsuleとCiphertextを別々に保存
```

### Shamir秘密分散

シェアは閾値復元のためにShamir秘密分散を用いて生成されます：

```
1. 次数 t-1 のランダム多項式 f(x) を選択
2. f(0) = secret（共有する値）
3. Share_i = f(i) for i = 1, ..., n
4. 各シェアを暗号化: C_i = AES_GCM(k_owner, Share_i)
```

### 再暗号化鍵生成

KFragはUmbralの鍵フラグメントスキームを用いて生成されます：

```
1. Ownerが (sk_owner, pk_requester, t, n) からn個のKFragを生成
2. 各KFragは1つのプロキシが再暗号化を実行可能にする
3. 再暗号化Capsuleの再構成にt個のKFragが必要
4. 配布後、KFragはメモリからゼロ化される
```

## メモリ安全性

FORMIXは暗号マテリアルに対して厳格なメモリ安全性を実装しています：

| コンポーネント | 保護 |
|-----------|-----------|
| `KFrag.kfrag_data` | `Zeroize` + `ZeroizeOnDrop` |
| `CFrag.cfrag_data` | `Zeroize` + `ZeroizeOnDrop` |
| `KeyPair.secret_key` | `Zeroize` + `ZeroizeOnDrop` |
| `SecretData.secret_bytes` | `Zeroize` + `ZeroizeOnDrop` |
| `SecretRecoveryResult.recovered_secret` | `Zeroize` + `ZeroizeOnDrop` |
| `ShareBuilder.secret` | `Zeroizing<Vec<u8>>` でラップ |
| `SecretSharingRequest.secret` | `Zeroizing<Vec<u8>>` でラップ（パニック時もゼロ化） |
| コントラクトの `StoredKeyFrag` / `StoredCFrag` | `Zeroize` + `ZeroizeOnDrop`（WASMリニアメモリ） |

機密型のデバッグ出力は実際の値の代わりに `[REDACTED]` を表示します。

## 攻撃耐性

### リプレイ攻撃

- 各Capsuleと秘密は一意の識別子（UUID）を持ちます
- コントラクトへの送信は**冪等**です：すでに保存済みのkFragを再送信しても、再処理されずに受理されます
- コントラクトの状態変更は、登録済みのOwnerアドレスに制限されます（authorized-senderチェック）

### 中間者攻撃

- 本番AOトランスポート（HyperBEAM）は、RFC-9421 `rsa-pss-sha512` 署名でHTTPメッセージに署名します
- 各kFragは `VerificationData`（verifying / delegating / receiving の各公開鍵）を埋め込んでおり、再暗号化の前に検証されます
- CFragはRequesterの公開鍵に暗号学的にバインドされます

### 鍵抽出

- 秘密鍵がそれぞれのプロセスの外に出ることはありません
- 再暗号化は鍵を露出させずに行われます
- プロキシは暗号化された鍵マテリアルのみを見ます

## セキュリティ前提

FORMIXのセキュリティは以下に依存します：

1. **DDH仮定**: 基盤となる楕円曲線上でDDHが困難
2. **ランダムオラクルモデル**: ハッシュ関数がランダムオラクルとして振る舞う
3. **閾値仮定**: 侵害されるプロキシは `t` 未満
4. **AOセキュリティ**: AO Networkがプロセス分離を提供

## 脅威モデル

### 対象範囲内

| 脅威 | 緩和策 |
|--------|------------|
| 盗聴 | エンドツーエンド暗号化 |
| プロキシ侵害 (< t) | 閾値分散 |
| ストレージ侵害 | Arweave上で暗号化された保管データ |
| リプレイ攻撃 | 一意のID、冪等な送信、authorized-senderチェック |
| メモリ検査 | すべての機密データにZeroize-on-drop |

### 対象範囲外

- クライアントデバイスに対するサイドチャネル攻撃
- ソーシャルエンジニアリング攻撃
- t を超えるプロキシノードの侵害
- AO Networkのコンセンサス攻撃

## ベストプラクティス

### 閾値選択

```
推奨設定:
- 低セキュリティ:  (2, 3)  - 高速、冗長性低
- 中程度:         (3, 5)  - バランス型
- 高セキュリティ:  (5, 9)  - 最大耐性
```

実装は `2 ≤ k ≤ n ≤ 20` を強制します（[Constants & Limits](/docs/api/formix-client#constants--limits) の `MIN_THRESHOLD` / `MAX_SHARES`）。

### 鍵管理

1. **秘密鍵を決して共有しない**
2. **KFragを定期的にローテーションする**
3. **本番環境ではハードウェアセキュリティモジュールを使用する**
4. **安全な鍵バックアップ手順を維持する**

### 運用セキュリティ

1. **プロキシノードの健全性を監視する**
2. **アクセスロギングを実装する**
3. **定期的なセキュリティ監査**
4. **インシデント対応計画**

## 形式検証

暗号プリミティブは査読済みの研究に基づいています：

- Blaze et al. "Divertible Protocols and Atomic Proxy Cryptography"
- Ateniese et al. "Improved Proxy Re-Encryption Schemes"
- NuCypher "Umbral: A Threshold Proxy Re-Encryption Scheme"

## 次のステップ

- [APIリファレンス](/docs/api/actions-api) - 実装詳細
- [開発ガイド](/docs/development/project-structure) - コード構成
