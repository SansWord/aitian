# AI展 (aitian) — Project Context

Static portal website for our AI-application meetup community (members = "aitians"). It gives the
community a branded front door, gives moderators/speakers a **citable webpage** for LinkedIn/résumé,
and records past meetups. Content is authored as Markdown, contributed via PR, and built to a static
GitHub Pages site. Full requirements/brainstorm: [`docs/kickstart.md`](docs/kickstart.md).

This file is auto-loaded every session — a small **index**, not an encyclopedia. Shared conventions
(three-part semver, devlog format, communication style) live in the global `~/.claude/CLAUDE.md`;
don't restate them.

## Who's working on this

- **SansWord** (Wen-Kai) — building it. **pinku** — co-organizer, design/product input.
- How I like you to work: give **clear options with a recommendation**, not open-ended menus.
  **Surface decisions that are mine** (scope, naming, copy, product framing) — don't silently assume
  them. Keep the doc tree current.

## Current status

> Not restated here, to avoid drift: **what's shipped** → top row of [`docs/devlog.md`](docs/devlog.md);
> **what's next** → [`todo.md`](todo.md).

Stable facts:
- **Repo:** `sansword/aitian` (public) · **Hosting:** GitHub Pages, static site.
- **URL:** **`https://aitian.dev`** — custom domain, live (CNAME in `site/`, wired 2026-07-10);
  `sansword.github.io/aitian` redirects there.
- **Stack:** vanilla HTML/CSS/JS under `site/`. Data authored as Markdown + YAML frontmatter under
  `data/`, validated + built to JSON at deploy by `scripts/build-data.mjs` (spec: data schema is the
  stable contract — see `docs/data-schema.md`).

## Locked decisions

> Settled calls. **Implementing/planning → obey them.** **Brainstorming or explicit human decision →
> challenge freely.** If a new idea conflicts with one, name the conflict and ask align-or-unlock; to
> change one, update the canonical section + log it in [`docs/devlog.md`](docs/devlog.md). Detail and
> rationale live in [`docs/kickstart.md`](docs/kickstart.md).

- **Name:** AI展 (aitian) — Taiwanese pun (愛展 "want to demo") + "-ian" demonym → members are
  "aitians". → kickstart §0
- **Hosting:** GitHub Pages, repo `sansword/aitian`; custom domain **`aitian.dev`** (live). → kickstart §2
- **Data format:** author in Markdown + YAML frontmatter; build to JSON at deploy (page consumes JSON,
  no runtime parser). → kickstart §4b
- **Data layout:** one file per meetup/moderator under `data/`; discovery + ordering via a deploy-time
  generated `index.json` (never committed to the repo). → kickstart §4c
- **Framework:** vanilla HTML/CSS/JS + standalone `scripts/build-data.mjs`; no framework, no client
  runtime deps. → spec 2026-07-09 §0
- **Schema stability:** the `data/*.md` schema is additive-only; every change updates
  `docs/data-schema.md` + validator + `_template.md` in one PR. → spec 2026-07-09 §1.4
- **A meetup is a multi-segment session** (Talk 1 / Talk 2 / Chat), not a single talk. → kickstart §4
- **Privacy:** speaker contact info (email/thread) **never** enters the public repo — logistics stay
  in the private sign-up sheet; only topic, speaker name, and materials link are public. → kickstart §4d
- **Contribution:** speakers/moderators add or edit **their own** Markdown file via PR (conflict-free).
  → kickstart §4

## Docs — two tiers

- **Maintained `docs/*.md`** (source of truth; must match the code):
  - [`docs/data-schema.md`](docs/data-schema.md) — the `data/` contract: schemas, consent, evolution
    rules, and how the site fetches/caches the built JSON. **Update trigger:** any schema change
    (same PR as validator + `_template.md`, per its rules) or any change to `fetchJson()` behavior.
  - [`docs/wording.md`](docs/wording.md) — name lore + all bilingual copy. **Update trigger:** any
    user-visible wording change (same PR as `site/ui-strings.json` / `data/community.md`).
  - [`docs/theming.md`](docs/theming.md) — the color system: palette references, token roles +
    contrast requirements, and the how-to for changing the theme. **Update trigger:** any change to
    the token blocks in `site/site.css` (same PR).
- **Historical** (how we got here; allowed to go stale; kept forever):
  - [`docs/kickstart.md`](docs/kickstart.md) — the founding brainstorm/spec. **Read before any planning.**
  - [`docs/superpowers/specs/`](docs/superpowers/specs/) & [`docs/superpowers/plans/`](docs/superpowers/plans/)
    — per-milestone specs (brainstorming output) and plans (writing-plans output). **These paths are
    the superpowers plugin defaults**, so brainstorm/write-plan land files here automatically.
  - [`docs/devlog.md`](docs/devlog.md) — newest-first history; the top row is the current state.

## Before you plan — read first

Before planning or building, **read [`docs/kickstart.md`](docs/kickstart.md)** (plus any relevant
maintained docs and the Locked decisions above), then plan against them — and **name the files you
consulted**, so it's visible which docs informed the work.

## Workflow — the dev cycle (superpowers)

Each milestone: **brainstorm → spec → plan → implement → fold decisions into the maintained docs.**

1. **Brainstorm/spec** via `superpowers:brainstorming` → saves to `docs/superpowers/specs/`.
2. **Plan** via `superpowers:writing-plans` → saves to `docs/superpowers/plans/`.
3. **Implement** against the plan (`superpowers:executing-plans` / subagent-driven).
4. Specs & plans are **historical** (may go stale). Afterward, **fold lasting decisions into the
   maintained docs** (Locked decisions above / a `docs/*.md`) — those, not the spec, are the source of
   truth.
5. **Phase handoff:** per the global `~/.claude/CLAUDE.md`, run each phase in a fresh session, carrying
   only the written doc forward.

## End of session — close the loop (a gate before any PR)

Updating docs is a **gate, not a nicety** — before the work counts as done / before a PR opens:

1. Update every maintained `docs/*.md` the session touched. ("No docs needed" is a claim to justify.)
2. Append a newest-on-top entry to [`docs/devlog.md`](docs/devlog.md) (global `CLAUDE.md` owns the
   format), linking its spec/plan.
3. Update [`todo.md`](todo.md).

When the user says **"ship it" / "raise a PR":** run this, commit the doc changes **in the same PR** as
the code, open the PR — then **stop; don't merge** (that's the user's call). If they head to push
without it, **remind them**.

**After the user merges a release PR: tag it.** Tag the squash commit on `main` with the release's
`vX.Y.Z` and push the tag — tags are the canonical version reference (global `CLAUDE.md`
§Versioning) and must match the devlog heading. If the user reports a merge and no tag has been
pushed, do it (or remind them) before moving on. Design-only sessions (`vX.Y.0-design`) and meta
entries get no tag.

## Conventions

- **Branching: never develop on `main`** — all work (code *and* docs/specs) happens on a feature
  branch and lands via PR, **squash-merged** into `main` after review. Sole exception: hotfixes.
  If a session finds itself with commits on `main` ahead of `origin/main`, move them to a branch
  before continuing.
- **Staging: explicit paths only** — never `git add -A` / `git add .`. Confirm scope with
  `git diff --name-only main...HEAD` before a PR.
- **Publish only the built site** (`dist/`) to Pages — never `path: .`; keep `CLAUDE.md`, `todo.md`,
  and `docs/` off the served site (kickstart §4c).
- **Code comments describe the *current* state only** — no "moved from…" / "used to be…" breadcrumbs;
  history lives in git.
- **Escape user-supplied input** (contributor-authored Markdown/frontmatter) even when rendering it
  verbatim ("verbatim" = don't *translate* it, not skip escaping).

## Before committing (load-bearing — public repo)

Scan **every** commit for secrets / API keys / tokens, `.env*` files, and **speaker contact info /
private PII** (kickstart §4d) before pushing. This repo is public and holds a community with private
sign-up data — this scan is required, not precautionary.
