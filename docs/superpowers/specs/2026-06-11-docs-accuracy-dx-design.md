# D-TPRES-docs 正確性・開発者体験 改善 — Design Spec

Date: 2026-06-11
Status: Approved

## Goal

`~/Develop/MyProject/D-TPRES/FORMIX` の実装を唯一の真実（source of truth）として、
D-TPRES-docs（Docusaurus, EN/JA）を正確かつ開発者が使いやすいものにする。

## Source of Truth

- `FORMIX/client/src/actions/client.rs` — `FormixClient` 実シグネチャ
- `FORMIX/client/src/usecase/dto.rs` — DTO 定義
- `FORMIX/client/src/usecase/core/crypto.rs` — 鍵型・定数
- `FORMIX/client/src/actions/error.rs`, `domain/errors.rs` — エラー型
- `FORMIX/client/examples/basic_usage.rs` — 動作するコード例
- `FORMIX/ao/contracts/src/` — AOコントラクト（Rust→WASM）ハンドラ
- `FORMIX/docs/PRD.md` — 正典の3フェーズワークフロー
- `FORMIX/client/Cargo.toml` — crate名 `formix`、feature flags

## Decisions (user-approved 2026-06-11)

1. **ワークフロー**: 6フェーズ構成を維持。ただし全ステップを実装と突合し、
   PRD 3フェーズとの対応表を冒頭に追加。
2. **クライアント名**: `FormixClient` に統一（実装と一致）。
3. **スコープ**: 日本語完全パリティ / AOコントラクトAPIページ新設 /
   未文書API詳細の追記 / プレースホルダBlog削除 — すべて含む。
4. **本番モード**: HyperBEAM (`hyperbeam` feature) を「実験的・E2E統合作業中」
   として記載。「利用不可」一辺倒の注記を現状に合わせて更新。

## Changes

### C1. 事実誤り修正

- `docs/docs/intro.md`: 技術スタック表の「AO Network (Lua)」→ Rust→WASM。
- `docs/docs/architecture/six-phase-workflow.md`: 各フェーズの暗号学的ステップを
  実装（SecretSharingWorkflowService / SecretRecoveryWorkflowService / crypto.rs）と
  突合して修正。冒頭に PRD 3フェーズ対応表を追加。
- API/quick-start: `ao_gateway_url` / `arweave_gateway_url` が現状未配線
  （Issue #51/#52）であることを明記。`SecretRecoveryResult` 等のフィールドを
  dto.rs と突合。

### C2. APIリファレンス拡充（`docs/docs/api/formix-client.md`）

- コンストラクタ3種: `new()` / `with_storage()` / `init()`（未実装, Issue #60）
- feature flags: default(Mock) / `hyperbeam`（実験的） / `key-export`（テスト用）
- 定数: `MIN_THRESHOLD=2`, `MAX_SHARES=20`, 鍵サイズ等
- `ActionError` 全バリアント（`PartialStorageFailure` 含む）
- DTO: `SecretMetadata`, `SecretSharingResult`, `SecretRecoveryResult`
  （Zeroize 挙動含む）
- 動く例: `cargo run --example basic_usage`

### C3. AOコントラクトAPIページ新設（`docs/docs/api/ao-contract.md`）

実ハンドラ（DelegateKFrag, DelegateCapsule, SubmitKFrag, SubmitCapsule,
Reencrypt, GetCFrag, ListCapsulesByKFrag）と Capsule 状態機械
（Received → ReencInProgress → CFragReady）。実装の handlers.rs / state.rs と突合。

### C4. 本番モード記述の統一

- intro.md に集約ステータスバナー（HyperBEAM 実験的・E2E統合作業中）。
- 各ページの散在する「利用不可」注記は短い現状参照に置換。

### C5. クイックスタート改善

- デモCLI（`cargo run --release -- local all`）に加え、ライブラリとしての利用
  （basic_usage.rs ベース、`with_storage()` + Mock）を併記。

### C6. Blog削除

- 2019–2021 のテンプレ記事4本を削除、blogプラグイン無効化、
  navbar/footer のリンク除去。

### C7. 日本語パリティ

- C1–C6 のすべてを `docs/i18n/ja/docusaurus-plugin-content-docs/current/` に同期。
  EN/JA の内容差をゼロにする。

## Verification

- 全コード例・シグネチャを FORMIX ソースと行レベルで突合（file:line を作業ログに残す）。
- `yarn build`（docs/ 内）が警告・broken link なしで通ること。
- EN/JA のページ構成・注記が一致していること。

## Out of Scope

- FORMIX 実装側の変更。
- 新しいチュートリアルコンテンツの書き下ろし（既存ページの正確化が主）。
- ホームページ（src/）の大幅リデザイン（事実誤りがあれば修正のみ）。
