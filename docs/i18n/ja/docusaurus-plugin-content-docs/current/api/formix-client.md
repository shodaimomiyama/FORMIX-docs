---
sidebar_position: 0
---

# FormixClient API

`FormixClient` は低レベルの暗号操作を抽象化した高レベルインターフェースを提供します。

## 初期化

### `init`

ビルダーパターンで新しい `FormixClient` インスタンスを作成します。

```rust
pub fn init(wallet_path: &str) -> FormixClientBuilder
```

**パラメータ**:
- `wallet_path`: Arweaveウォレットの JSONファイルへのパス

**戻り値**: クライアントを設定するための `FormixClientBuilder`。

```rust
use d_tpres::FormixClient;

let client = FormixClient::init("./wallet.json")
    .ao_gateway("https://ao-gateway.example.com")
    .arweave_gateway("https://arweave.net")
    .build()?;
```

## 鍵管理

### `generate_keypair`

新しい暗号鍵ペアを生成します。

```rust
pub fn generate_keypair(&self) -> Result<(SecretKey, PublicKey), FormixError>
```

**戻り値**: `(SecretKey, PublicKey)` のタプル。

```rust
let (owner_sk, owner_pk) = client.generate_keypair()?;
```

## データ共有

### `share`

ビルダーパターンを使用して、閾値パラメータ付きで秘密を暗号化・共有します。

```rust
pub fn share(&self) -> ShareBuilder
```

**戻り値**: 共有操作を設定するための `ShareBuilder`。

#### ShareBuilder メソッド

| メソッド | 説明 |
|--------|-------------|
| `.secret(data: &[u8])` | 暗号化する秘密データ |
| `.threshold(n: u8)` | 復号に必要な最小フラグメント数 |
| `.total_shares(n: u8)` | 生成するフラグメントの総数 |
| `.owner_key(sk: &SecretKey)` | Ownerの秘密鍵 |
| `.requester_key(pk: &PublicKey)` | Requesterの公開鍵 |
| `.metadata(key: &str, value: &str)` | オプションのメタデータ |
| `.execute()` | 共有操作を実行 |

```rust
let share_result = client.share()
    .secret(b"共有する機密データ")
    .threshold(3)
    .total_shares(5)
    .owner_key(&owner_sk)
    .requester_key(&requester_pk)
    .metadata("description", "サンプルの秘密")
    .execute()?;

println!("秘密を共有しました。ID: {}", share_result.secret_id);
```

## データ復元

### `recover`

ビルダーパターンを使用して、共有された秘密を取得・復号します。

```rust
pub fn recover(&self) -> RecoverBuilder
```

**戻り値**: 復元操作を設定するための `RecoverBuilder`。

#### RecoverBuilder メソッド

| メソッド | 説明 |
|--------|-------------|
| `.secret_id(id: &str)` | 復元する秘密のID |
| `.requester_key(sk: &SecretKey)` | Requesterの秘密鍵 |
| `.owner_public_key(pk: &PublicKey)` | Ownerの公開鍵 |
| `.execute()` | 復元操作を実行 |

```rust
let recovered = client.recover()
    .secret_id(&share_result.secret_id)
    .requester_key(&requester_sk)
    .owner_public_key(&owner_pk)
    .execute()?;

assert_eq!(recovered.as_slice(), b"共有する機密データ");
```
