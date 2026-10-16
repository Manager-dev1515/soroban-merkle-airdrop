# GitHub Labels Guide

This document describes every label used in the `soroban-merkle-airdrop` repository, including its name, hex color, description, and guidance on when to apply it.

---

## Type Labels

These labels describe *what kind of change* an issue or pull request represents.

| Label | Color | Description | When to use |
|---|---|---|---|
| `bug` | `#d73a4a` | Something isn't working correctly | Use when reporting or fixing incorrect behavior — a broken function, wrong output, a failing test, or a crash. |
| `feature` | `#0075ca` | Entirely new functionality | Use when proposing or implementing something that does not exist yet — a new CLI command, contract function, or web UI page. |
| `enhancement` | `#a2eeef` | Improvement to existing functionality | Use when changing something that already works but could be better — better UX, improved error messages, performance, or API ergonomics. |
| `docs` | `#e4e669` | Documentation-only changes | Use when adding or updating `docs/`, `README.md`, `CONTRIBUTING.md`, inline code comments, or any written material. |
| `test` | `#bfd4f2` | Adding or improving tests | Use when the only change is new or updated tests — unit tests, integration tests, or test helpers — with no production code change. |
| `security` | `#ee0701` | Security vulnerability or hardening | Use for issues involving key exposure, auth bypass, access-control gaps, dependency CVEs, or any change that narrows the attack surface. |
| `refactor` | `#e4b9fd` | Code restructuring without behavior change | Use when reorganizing code for clarity, extracting helpers, renaming symbols, or splitting files — without altering public behavior. |
| `ci` | `#c5def5` | CI/CD pipeline changes | Use for changes to `.github/workflows/`, build scripts, linter configs, or any automation that does not ship to production directly. |
| `chore` | `#ededed` | Maintenance or housekeeping | Use for dependency bumps, `.gitignore` updates, tooling config, or any task that keeps the repo tidy but delivers no user-visible change. |

---

## Area Labels

These labels describe *which part of the codebase* an issue or pull request touches.

| Label | Color | Description | When to use |
|---|---|---|---|
| `area: contract` | `#f9d0c4` | Soroban smart contract (`contracts/airdrop/`) | Use for anything in `contracts/airdrop/src/` — contract logic, storage, error types, or Rust test suite. |
| `area: merkle` | `#c2e0c6` | Merkle tree algorithms | Use when the change affects the core hashing logic in `contracts/airdrop/src/merkle.rs` or `sdk/src/merkle.ts`, including cross-language compatibility. |
| `area: sdk` | `#d4c5f9` | TypeScript SDK (`sdk/`) | Use for changes to the SDK's public API, tree builder, RPC client, type definitions, or SDK test suite. |
| `area: cli` | `#fef2c0` | CLI tool (`cli/`) | Use for new commands, flag changes, output formatting, or error handling in `cli/src/`. |
| `area: frontend` | `#bfe5bf` | Next.js web UI (`web/`) | Use for changes to pages, components, styles, or client-side state in `web/src/`. |
| `area: deployment` | `#e99695` | Deploy scripts and workflows | Use for changes to `deploy.yml`, deployment documentation, or anything that affects how the contract is released to testnet/mainnet. |
| `area: docs` | `#e4e669` | Documentation files (`docs/`, `README.md`) | Use when the change is confined to the `docs/` folder or top-level markdown files. Pair with the `docs` type label. |
| `area: community` | `#fce4ec` | Community health files | Use for changes to `CONTRIBUTING.md`, `SECURITY.md`, issue templates, PR templates, or `CODE_OF_CONDUCT.md`. |

---

## Difficulty Labels

These labels help contributors self-select tasks that match their experience level.

| Label | Color | Description | When to use |
|---|---|---|---|
| `difficulty: easy` | `#77dd77` | Good first issue — straightforward scope | Use for well-defined tasks with a clear, small scope that require little prior knowledge of the codebase. Ideal for first-time contributors. |
| `difficulty: medium` | `#fdfd96` | Some familiarity with the codebase required | Use for tasks that touch multiple files or require understanding one subsystem (e.g., the Merkle algorithm or the Soroban SDK). |
| `difficulty: hard` | `#ff6961` | Significant effort or deep expertise needed | Use for tasks that span multiple subsystems, require cryptographic or Soroban knowledge, or involve tricky design decisions. |

---

## Priority Labels

These labels signal urgency for maintainers triaging the backlog.

| Label | Color | Description | When to use |
|---|---|---|---|
| `priority: critical` | `#b60205` | Blocks a release or production users | Use when a bug or regression actively prevents deployment or breaks existing users. |
| `priority: high` | `#e11d48` | Important, address soon | Use for regressions or significant gaps that should be resolved in the next milestone. |
| `priority: medium` | `#f97316` | Normal priority, address when possible | Use for improvements and non-critical bugs that belong in a planned milestone. |
| `priority: low` | `#6b7280` | Nice to have, no immediate urgency | Use for polish, minor enhancements, or ideas that the team is not committed to yet. |

---

## Status Labels

These labels track the workflow state of an issue or pull request.

| Label | Color | Description | When to use |
|---|---|---|---|
| `status: needs triage` | `#ededed` | Newly opened, not yet reviewed by a maintainer | Applied automatically to new issues; remove once a maintainer has categorized it. |
| `status: confirmed` | `#0052cc` | Reproducible bug or accepted proposal | Use once a maintainer has verified the issue and agreed it should be fixed. |
| `status: in progress` | `#fbca04` | Actively being worked on | Apply when a contributor is actively implementing a fix or feature. |
| `status: blocked` | `#e4e669` | Cannot proceed without external input | Use when work is stalled on a dependency, decision, or upstream issue. |
| `status: wontfix` | `#ffffff` | Intentionally out of scope | Use when a maintainer decides the issue will not be addressed; always leave an explanatory comment. |
| `status: duplicate` | `#cfd3d7` | Already tracked in another issue | Apply and link to the original issue, then close the duplicate. |

---

## Label Combinations — Common Patterns

Below are examples of how labels are typically combined.

```
bug + area: contract + priority: high           → broken claim logic in the Soroban contract
feature + area: cli + difficulty: medium        → new CLI command
docs + area: community + difficulty: easy       → update CONTRIBUTING.md
security + area: cli + priority: critical       → secret key exposed in process listing
test + area: merkle + difficulty: easy          → add missing unit tests for edge cases
refactor + area: sdk + priority: low            → clean up TypeScript types
ci + priority: medium                           → add linting step to GitHub Actions
chore + difficulty: easy                        → bump a dependency version
```

---

## Adding Labels to a New Issue

1. Open the issue on GitHub.
2. In the right sidebar, click **Labels**.
3. Apply **at least one type label** and **at least one area label**.
4. Optionally add a difficulty label if you want to attract contributors.
5. A maintainer will add priority and status labels during triage.

---

## Keeping This Guide Up to Date

If you add a new label to the repository, open a PR that also updates this file. The label name, color, description, and when-to-use guidance must all be documented here before the label is used in issues.
