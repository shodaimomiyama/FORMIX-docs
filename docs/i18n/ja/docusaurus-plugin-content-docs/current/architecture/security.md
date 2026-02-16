---
sidebar_position: 3
---

# セキュリティ特性

FORMIXは、Umbralベースの閾値プロキシ再暗号化スキームにより、強力な暗号学的保証を提供します。

## コアセキュリティ特性

### IND-CPAセキュリティ

FORMIXは**選択平文攻撃下での識別不可能性（IND-CPA）**を達成します：

- 攻撃者は2つの異なるメッセージの暗号化を区別できません
- 暗号化オラクルへのアクセスがあっても、暗号文は平文について何も明らかにしません
- セキュリティは基盤となる楕円曲線上の判定Diffie-Hellman（DDH）問題の困難性に依拠

### 閾値障害耐性

| 設定 | 耐性 |
|--------------|-----------|
| (3, 5) | 2つの悪意ある/障害ノード |
| (5, 9) | 4つの悪意ある/障害ノード |
| (t, n) | n - t の障害 |

### 共謀耐性

1. **プロキシ + Requester共謀**: Owner の認可なしには復号不可
2. **プロキシ + プロキシ共謀**: 閾値未満のプロキシでは再暗号化鍵を再構築不可
3. **Owner + Requester共謀**: データは保管時も暗号化されたまま

## 暗号プリミティブ

### Umbral プロキシ再暗号化

FORMIXは**Umbral**閾値プロキシ再暗号化スキームを使用：

- Ownerの秘密鍵を明かさない閾値再暗号化
- 単方向再暗号化（Owner → Requesterのみ）
- 非対話的鍵生成（OwnerがRequesterの参加なしにKFragを生成）

### ハイブリッド暗号化

```
1. ランダム対称鍵 k_owner を生成
2. Capsule = PRE_Enc(pk_owner, k_owner)
3. AES-GCMで k_owner を使用してデータを暗号化
4. CapsuleとCiphertextを別々に保存
```

### Shamir秘密分散

```
1. 次数 t-1 のランダム多項式 f(x) を選択
2. f(0) = secret（共有する値）
3. Share_i = f(i) for i = 1, ..., n
4. 各シェアを暗号化: C_i = AES_GCM(k_owner, Share_i)
```

### 再暗号化鍵生成

```
1. Ownerが (sk_owner, pk_requester, t, n) からn個のKFragを生成
2. 各KFragは1つのプロキシが再暗号化を実行可能にする
3. 再暗号化Capsuleの再構成にt個のKFragが必要
4. 配布後、KFragはメモリからゼロ化される
```

## メモリ安全性

| コンポーネント | 保護 |
|-----------|-----------|
| `KFrag.kfrag_data` | `Zeroize` + `ZeroizeOnDrop` |
| `KeyPair.secret_key` | `Zeroize` + `ZeroizeOnDrop` |
| `SecretData.secret_bytes` | `Zeroize` + `ZeroizeOnDrop` |
| `SecretRecoveryResult.recovered_secret` | `Zeroize` + `ZeroizeOnDrop` |
| `ShareBuilder.secret` | `Zeroizing<Vec<u8>>` でラップ |

機密型のデバッグ出力は実際の値の代わりに `[REDACTED]` を表示します。

## セキュリティ前提

1. **DDH仮定**: 基盤となる楕円曲線上でDDHが困難
2. **ランダムオラクルモデル**: ハッシュ関数がランダムオラクルとして振る舞う
3. **閾値仮定**: `t` 未満のプロキシが侵害される
4. **AOセキュリティ**: AO Networkがプロセス分離を提供

## 脅威モデル

### 対象範囲内

| 脅威 | 緩和策 |
|--------|------------|
| 盗聴 | エンドツーエンド暗号化 |
| プロキシ侵害 (< t) | 閾値分散 |
| ストレージ侵害 | Arweave上で暗号化された保管データ |
| リプレイ攻撃 | ノンスベースの要求追跡 |
| メモリ検査 | すべての機密データにZeroize-on-drop |

## ベストプラクティス

### 閾値選択

```
推奨設定:
- 低セキュリティ:  (2, 3)  - 高速、冗長性低
- 中程度:         (3, 5)  - バランス型
- 高セキュリティ:  (5, 9)  - 最大耐性
```

## 参考文献

- Blaze et al. "Divertible Protocols and Atomic Proxy Cryptography"
- Ateniese et al. "Improved Proxy Re-Encryption Schemes"
- NuCypher "Umbral: A Threshold Proxy Re-Encryption Scheme"

## 次のステップ

- [APIリファレンス](/docs/api/actions-api) - 実装詳細
- [開発ガイド](/docs/development/project-structure) - コード構成
