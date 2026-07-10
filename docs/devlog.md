# Devlog

Running log of decisions and learnings, **newest first**. The top entry is the project's current
state — the root `CLAUDE.md` points here instead of restating the version. This file is *historical*
(append-only) yet *always current*, because "newest on top" is true forever. Each entry references the
spec / plan / design doc from that session so a later session can lazily load the right context.

### Learning tags

| Tag | Meaning |
|-----|---------|
| `[note]` | Useful context, well-documented — good to have written down but you'd find it in the docs |
| `[insight]` | Non-obvious; meaningfully changes how you design or debug something |
| `[gotcha]` | A specific trap that bit you; high risk of biting again — bookmark it |

## TL;DR

| Version | Summary |
|---------|---------|
| [v0.2.0](#v020--end-to-end-cicd-setup-2026-07-09-1724) | Stood up the **end-to-end CI/CD pipeline** — a hello-world page under `site/` deploys to GitHub Pages via Actions and is live at `sansword.github.io/aitian`. |
| [v0.1.0-design](#v010-design--kickstart-and-doc-tree-setup-2026-07-09-0555) | Captured meetup-portal requirements, named the project **AI展 (aitian)**, created the public repo, and set up the document-tree practice. |

---

## v0.2.0 — End-to-end CI/CD setup (2026-07-09 17:24)

**Review:** not yet
**Design docs:** *(none — small infra step, folded directly into the docs)*
**What was built:**
- **Proved the whole deploy path end-to-end**: push to `main` → GitHub Actions → GitHub Pages → live
  URL. A minimal hello-world page ([`site/index.html`](../site/index.html)) now serves at
  **`https://sansword.github.io/aitian/`** (verified HTTP 200). This is the pipeline the MVP will ride
  on, not the scaffold itself.
- Added [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) — checkout → `upload-pages-artifact`
  (`path: site`) → `deploy-pages`, triggered on push to `main` + `workflow_dispatch`, with a `pages`
  concurrency group.
- **Published only `site/`, never `path: .`** (kickstart §4c) — so `CLAUDE.md`, `todo.md`, and `docs/`
  stay off the served website even though the repo is public.
- Bumped actions to Node 24-native majors: `checkout@v7`, `upload-pages-artifact@v5`, `deploy-pages@v5`
  (clears the Node 20 deprecation warning from the first run).
- The hello-world page carries the **AI展** wordmark (展 in accent), the `aitian · Ài-Tián` romanization,
  and `prefers-color-scheme` dark/light — a throwaway smoke test, not the real landing.

**Key learnings:**
- `[insight]` Pages source was **already** set to the *GitHub Actions* build type on repo creation, so
  the first push deployed with **zero manual settings** — the "switch Pages to Actions" step in
  kickstart §4c was a no-op here. Confirm with `gh api repos/OWNER/REPO/pages --jq .build_type` before
  assuming a manual toggle is needed.
- `[gotcha]` GitHub Actions warns when an action targets **Node 20** (now force-run on Node 24). Pin the
  latest majors up front; the `@vN` you first reach for is often a release behind (`deploy-pages` is at
  **v5**, not v4).
- `[note]` Deploy-from-`site/` is why publishing to `main` (not a feature branch) is correct here — the
  Pages Actions source builds from the default branch, so a branch push wouldn't produce a live deploy.
- `[note]` A maintained `docs/architecture.md` for the build pipeline is **deferred** until
  `scripts/build-data.mjs` (Markdown → JSON + manifest) exists — today's workflow just uploads a static
  folder, so there's no pipeline worth documenting separately yet.

## v0.1.0-design — Kickstart and doc-tree setup (2026-07-09 05:55)

**Review:** not yet
**Design docs:** Kickstart: [Spec](kickstart.md)
**What was built:** *(design/planning session — no site code yet)*
- Captured the AI-application meetup-portal requirements from the SansWord ↔ pinku discussion into
  [`docs/kickstart.md`](kickstart.md): purpose, name, hosting, data model, MVP page scope, privacy, and
  open questions.
- Named the project **AI展 (aitian)** — a three-layer name (愛展 "want/love to demo" · AI 展 "AI demo" ·
  "-ian" demonym → community members are "aitians"). Rejected `laitian` (reads like "Laotian").
- Settled the data architecture: one Markdown-file-per-entry under `data/`, built to JSON + a manifest
  at deploy via GitHub Actions; a meetup is a multi-segment session (Talk 1 / Talk 2 / Chat).
- Created public repo `sansword/aitian` and pushed the kickstart doc.
- Applied the **document-tree practice** (this `CLAUDE.md`, `todo.md`, this devlog, and the `docs/`
  historical tiers + templates).
- Opted into advanced governance blocks — **PR gate, Conventions, dev cycle, pre-commit secret scan** —
  promoting them straight into `CLAUDE.md`. Left Unlock-protocol and ADR-flow out (reconstructable from
  the `sans_doc_tree` template if wanted later) and removed the `CLAUDE.advanced.md` menu as unused.
- Aligned the historical spec/plan folders to the **superpowers plugin defaults**
  (`docs/superpowers/specs/`, `docs/superpowers/plans/`) so brainstorm/write-plan output lands there
  automatically; dropped the unused `docs/decisions/` + ADR template.

**Key learnings:**
- `[note]` Superpowers v5.0.7 saves brainstorming specs to `docs/superpowers/specs/` and writing-plans
  output to `docs/superpowers/plans/` — match those paths so the plugin picks them up with no config.
- `[insight]` A static GitHub Pages site can't list a directory at runtime — so a deploy-time build
  both parses Markdown → JSON and generates the `index.json` manifest, keeping the runtime
  dependency-free while contributors author friendly Markdown.
- `[insight]` A custom domain decouples the public URL from the (taken) GitHub org name and makes
  hosting movable without breaking cited links — which matters because the site's whole point is a
  stable, citable URL.
- `[gotcha]` The repo is **public** — speaker contact info (sign-up sheet column F) must never be
  committed; only topic, speaker name, and materials link are public.
- `[note]` Meetups run weekly on **Tuesdays**, 2026-07-14 → 2026-09-01, each with Talk 1 / Talk 2 / Chat.
