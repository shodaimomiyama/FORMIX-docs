---
sidebar_position: 3
---

# Security Properties

FORMIX provides strong cryptographic guarantees through its Umbral-based threshold proxy re-encryption scheme.

## Core Security Properties

### IND-CPA Security

FORMIX achieves **Indistinguishability under Chosen Plaintext Attack (IND-CPA)**, meaning:

- An adversary cannot distinguish between encryptions of two different messages
- Even with access to an encryption oracle, the ciphertext reveals nothing about the plaintext
- Security relies on the hardness of the Decisional Diffie-Hellman (DDH) problem on the underlying elliptic curve

### Threshold Fault Tolerance

The system tolerates Byzantine failures up to the threshold limit:

| Configuration | Tolerance |
|--------------|-----------|
| (3, 5) | 2 malicious/failed nodes |
| (5, 9) | 4 malicious/failed nodes |
| (t, n) | n - t failures |

**Properties**:
- Any `t` honest nodes can complete re-encryption
- Fewer than `t` nodes learn nothing about the secret
- No single point of failure

### Collusion Resistance

Even if multiple parties collude, they cannot:

1. **Proxy + Requester Collusion**: Cannot decrypt without owner authorization
2. **Proxy + Proxy Collusion**: Cannot reconstruct the re-encryption key with fewer than threshold proxies
3. **Owner + Requester Collusion**: Data remains encrypted at rest

## Cryptographic Primitives

### Umbral Proxy Re-Encryption

FORMIX uses the **Umbral** threshold proxy re-encryption scheme, providing:

- Threshold re-encryption without revealing the owner's secret key
- Unidirectional re-encryption (owner → requester only)
- Non-interactive key generation (owner generates KFrags without requester participation)

### Hybrid Encryption

The capsule encapsulates a symmetric key using Umbral PRE:

```
1. Generate random symmetric key k_owner
2. Capsule = PRE_Enc(pk_owner, k_owner)
3. Encrypt data with AES-GCM using k_owner
4. Store Capsule + Ciphertext separately
```

### Shamir Secret Sharing

Shares are generated using Shamir's Secret Sharing for threshold recovery:

```
1. Choose random polynomial f(x) of degree t-1
2. f(0) = secret (the value to be shared)
3. Share_i = f(i) for i = 1, ..., n
4. Each share encrypted: C_i = AES_GCM(k_owner, Share_i)
```

### Re-Encryption Key Generation

KFrags are generated using Umbral's key fragment scheme:

```
1. Owner generates n KFrags from (sk_owner, pk_requester, t, n)
2. Each KFrag enables one proxy to perform re-encryption
3. t KFrags needed to reconstruct the re-encrypted capsule
4. KFrags are zeroized from memory after distribution
```

## Memory Safety

FORMIX implements strict memory safety for cryptographic material:

| Component | Protection |
|-----------|-----------|
| `KFrag.kfrag_data` | `Zeroize` + `ZeroizeOnDrop` |
| `KeyPair.secret_key` | `Zeroize` + `ZeroizeOnDrop` |
| `SecretData.secret_bytes` | `Zeroize` + `ZeroizeOnDrop` |
| `SecretRecoveryResult.recovered_secret` | `Zeroize` + `ZeroizeOnDrop` |
| `ShareBuilder.secret` | Wrapped in `Zeroizing<Vec<u8>>` |
| `SecretSharingRequest.secret` | Custom `Drop` with `zeroize()` |

Debug output for sensitive types displays `[REDACTED]` instead of actual values.

## Attack Resistance

### Replay Attacks

- Each capsule and secret has a unique identifier
- Re-encryption requests are tracked by nonce
- Duplicate requests are rejected

### Man-in-the-Middle

- All communications are authenticated
- KFrags include origin verification
- CFrags are cryptographically bound to requesters

### Key Extraction

- Private keys never leave their respective processes
- Re-encryption happens without key exposure
- Proxies only see encrypted key material

## Security Assumptions

FORMIX security depends on:

1. **DDH Assumption**: Decisional Diffie-Hellman is hard on the underlying elliptic curve
2. **Random Oracle Model**: Hash functions behave as random oracles
3. **Threshold Assumption**: Fewer than `t` proxies are compromised
4. **AO Security**: AO Network provides process isolation

## Threat Model

### In Scope

| Threat | Mitigation |
|--------|------------|
| Eavesdropping | End-to-end encryption |
| Proxy compromise (< t) | Threshold distribution |
| Storage compromise | Data encrypted at rest on Arweave |
| Replay attacks | Nonce-based request tracking |
| Memory inspection | Zeroize-on-drop for all sensitive data |

### Out of Scope

- Side-channel attacks on client devices
- Social engineering attacks
- Compromise of > t proxy nodes
- AO Network consensus attacks

## Best Practices

### Threshold Selection

```
Recommended configurations:
- Low security:  (2, 3)  - Fast, less redundancy
- Medium:        (3, 5)  - Balanced
- High security: (5, 9)  - Maximum tolerance
```

### Key Management

1. **Never share private keys**
2. **Rotate KFrags periodically**
3. **Use hardware security modules for production**
4. **Maintain secure key backup procedures**

### Operational Security

1. **Monitor proxy node health**
2. **Implement access logging**
3. **Regular security audits**
4. **Incident response planning**

## Formal Verification

The cryptographic primitives are based on peer-reviewed research:

- Blaze et al. "Divertible Protocols and Atomic Proxy Cryptography"
- Ateniese et al. "Improved Proxy Re-Encryption Schemes"
- NuCypher "Umbral: A Threshold Proxy Re-Encryption Scheme"

## Next Steps

- [API Reference](/docs/api/actions-api) - Implementation details
- [Development Guide](/docs/development/project-structure) - Code organization
