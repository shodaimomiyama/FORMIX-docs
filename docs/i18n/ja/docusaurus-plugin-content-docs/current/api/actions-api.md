---
sidebar_position: 1
---

# Actions層 API

Actions層はFORMIXと対話するための主要なインターフェースを提供します。すべての外部操作はこの層を通じて実行されます。

## 概要

```rust
use formix::actions::*;
```

Actions層は以下の機能を公開します：
- 鍵生成と管理
- データの暗号化と復号
- 再暗号化鍵の配布
- アクセス要求の処理

## 鍵管理

### `generate_keypair`

新しい暗号鍵ペアを生成します。

```rust
pub fn generate_keypair() -> Result<KeyPair, ActionError>
```

**戻り値**: 公開鍵と秘密鍵を含む新しい`KeyPair`。

**例**:
```rust
let keypair = generate_keypair()?;
println!("公開鍵: {:?}", keypair.public_key());
```

### `derive_public_key`

秘密鍵から公開鍵を導出します。

```rust
pub fn derive_public_key(private_key: &PrivateKey) -> PublicKey
```

## 暗号化操作

### `encrypt_data`

公開鍵を使用してデータを暗号化します。

```rust
pub fn encrypt_data(
    public_key: &PublicKey,
    data: &SecretData,
) -> Result<(Capsule, Ciphertext), ActionError>
```

**パラメータ**:
- `public_key`: Ownerの公開鍵
- `data`: 暗号化するデータ

**戻り値**: `(Capsule, Ciphertext)`のタプル

**例**:
```rust
let data = SecretData::new(b"機密情報".to_vec());
let (capsule, ciphertext) = encrypt_data(&owner_pk, &data)?;
```

### `decrypt_data`

Ownerの秘密鍵を使用してデータを復号します（直接復号）。

```rust
pub fn decrypt_data(
    private_key: &PrivateKey,
    capsule: &Capsule,
    ciphertext: &Ciphertext,
) -> Result<SecretData, ActionError>
```

## 再暗号化鍵生成

### `generate_kfrags`

Requester用の再暗号化鍵フラグメントを生成します。

```rust
pub fn generate_kfrags(
    owner_keypair: &KeyPair,
    requester_public_key: &PublicKey,
    threshold: u8,
    shares: u8,
) -> Result<Vec<KFrag>, ActionError>
```

**パラメータ**:
- `owner_keypair`: Ownerの鍵ペア
- `requester_public_key`: 意図された受信者の公開鍵
- `threshold`: 復号に必要な最小フラグメント数
- `shares`: 生成するフラグメントの総数

**戻り値**: `KFrag`オブジェクトのベクター

**例**:
```rust
let kfrags = generate_kfrags(
    &owner_keypair,
    &requester_pk,
    3,  // 閾値
    5,  // 総シェア数
)?;
```

### `verify_kfrag`

KFragの正しさを検証します。

```rust
pub fn verify_kfrag(
    kfrag: &KFrag,
    owner_public_key: &PublicKey,
    requester_public_key: &PublicKey,
) -> Result<bool, ActionError>
```

## 再暗号化操作

### `reencrypt`

KFragを使用して再暗号化を実行します。

```rust
pub fn reencrypt(
    capsule: &Capsule,
    kfrag: &KFrag,
) -> Result<CFrag, ActionError>
```

**パラメータ**:
- `capsule`: 暗号化からの元のカプセル
- `kfrag`: 再暗号化鍵フラグメント

**戻り値**: `CFrag`（再暗号化されたカプセルフラグメント）

### `verify_cfrag`

CFragの正しさを検証します。

```rust
pub fn verify_cfrag(
    cfrag: &CFrag,
    capsule: &Capsule,
    owner_public_key: &PublicKey,
    requester_public_key: &PublicKey,
) -> Result<bool, ActionError>
```

## 再暗号化による復号

### `decrypt_reencrypted`

再暗号化フラグメントを使用してデータを復号します。

```rust
pub fn decrypt_reencrypted(
    requester_keypair: &KeyPair,
    owner_public_key: &PublicKey,
    capsule: &Capsule,
    cfrags: &[CFrag],
    ciphertext: &Ciphertext,
) -> Result<SecretData, ActionError>
```

**パラメータ**:
- `requester_keypair`: Requesterの鍵ペア
- `owner_public_key`: 元のOwnerの公開鍵
- `capsule`: 元のカプセル
- `cfrags`: 再暗号化フラグメントのコレクション（>= 閾値）
- `ciphertext`: 暗号化データ

**戻り値**: 復号された`SecretData`

**例**:
```rust
let plaintext = decrypt_reencrypted(
    &requester_keypair,
    &owner_pk,
    &capsule,
    &cfrags,
    &ciphertext,
)?;
```

## ドメインエンティティ

### Secret

メタデータを含む暗号化データを表します。

```rust
pub struct Secret {
    pub id: SecretId,
    pub capsule: Capsule,
    pub ciphertext_ref: ArweaveRef,
    pub owner: PublicKey,
    pub created_at: Timestamp,
}
```

### Capsule

カプセル化された対称鍵を含みます。

```rust
pub struct Capsule {
    pub point_e: G1Point,
    pub point_v: G1Point,
    pub signature: Signature,
}
```

### KFrag

再暗号化鍵フラグメント。

```rust
pub struct KFrag {
    pub id: FragmentId,
    pub key: G2Point,
    pub precursor: G1Point,
    pub proof: KFragProof,
}
```

### CFrag

再暗号化されたカプセルフラグメント。

```rust
pub struct CFrag {
    pub point_e1: G1Point,
    pub point_v1: G1Point,
    pub kfrag_id: FragmentId,
    pub proof: CFragProof,
}
```

## 値オブジェクト

### KeyPair

```rust
pub struct KeyPair {
    private_key: PrivateKey,
    public_key: PublicKey,
}

impl KeyPair {
    pub fn generate() -> Self;
    pub fn public_key(&self) -> &PublicKey;
    pub fn private_key(&self) -> &PrivateKey;
}
```

### SecretData

```rust
pub struct SecretData(Vec<u8>);

impl SecretData {
    pub fn new(data: Vec<u8>) -> Self;
    pub fn as_bytes(&self) -> &[u8];
}
```

## エラー型

```rust
pub enum ActionError {
    InvalidKey(String),
    EncryptionFailed(String),
    DecryptionFailed(String),
    InvalidThreshold { threshold: u8, shares: u8 },
    InsufficientFragments { required: u8, provided: u8 },
    VerificationFailed(String),
    StorageError(String),
}
```

## 次のステップ

- [プロジェクト構造](/docs/development/project-structure) - コード構成
- [開発コマンド](/docs/development/commands) - ビルドとテストコマンド
