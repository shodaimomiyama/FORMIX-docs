---
sidebar_position: 3
---

# Security Properties

FORMIX provides strong cryptographic guarantees through its threshold proxy re-encryption scheme.

## Core Security Properties

### IND-CPA Security

FORMIX achieves **Indistinguishability under Chosen Plaintext Attack (IND-CPA)**, meaning:

- An adversary cannot distinguish between encryptions of two different messages
- Even with access to an encryption oracle, the ciphertext reveals nothing about the plaintext
- Security relies on the hardness of the Decisional Diffie-Hellman (DDH) problem

```
Given: (G, g^a, g^b, g^c)
Hard to determine: Is c = ab mod q?
```

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

### Elliptic Curve Cryptography

FORMIX uses the **BLS12-381** curve, providing:

- ~128-bit security level
- Efficient pairing operations
- Small key/signature sizes

```
Security Level: 128 bits
G1 Point Size: 48 bytes
G2 Point Size: 96 bytes
```

### Key Encapsulation

The capsule encapsulates a symmetric key using hybrid encryption:

```
1. Generate random r
2. Compute E = r * G (generator point)
3. Compute V = r * pk_owner
4. Derive symmetric key = H(r * pk_owner)
5. Capsule = (E, V, signature)
```

### Re-Encryption Key Generation

KFrags are generated using Shamir's Secret Sharing variant:

```
1. Choose random polynomial f(x) of degree t-1
2. f(0) = sk_owner * sk_requester^(-1) [conceptually]
3. KFrag_i = f(i) for i = 1, ..., n
4. Each KFrag includes proof of correctness
```

## Attack Resistance

### Replay Attacks

- Each capsule includes a unique identifier
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

1. **DDH Assumption**: Decisional Diffie-Hellman is hard in G1
2. **Random Oracle Model**: Hash functions behave as random oracles
3. **Threshold Assumption**: Fewer than `t` proxies are compromised
4. **AO Security**: AO Network provides process isolation

## Threat Model

### In Scope

| Threat | Mitigation |
|--------|------------|
| Eavesdropping | End-to-end encryption |
| Proxy compromise (< t) | Threshold distribution |
| Storage compromise | Data encrypted at rest |
| Replay attacks | Nonce-based request tracking |

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
