# TODO

The single home for "what's next" — the root `CLAUDE.md` points here instead of restating it. Keep it
current as part of the end-of-session checklist.

## Now

- [ ] **Write the implementation plan** from the approved spec
      ([`docs/superpowers/specs/2026-07-09-mvp-scaffold-design.md`](docs/superpowers/specs/2026-07-09-mvp-scaffold-design.md))
      via `superpowers:writing-plans` in a fresh session. Mind the spec §5 sequencing hint: data
      layer + build/validate + landing form the ship-alone cutline for **7/14**.
- [ ] **Merge the spec PR** — branch `feat/mvp-scaffold-spec` holds the spec + doc updates;
      push, raise PR, squash-merge (new branching convention in `CLAUDE.md`).

## Later

- [ ] **Build the MVP** per the spec — pages (landing, hash-routed meetup detail, moderators),
      `data/` Markdown, `scripts/build-data.mjs` (parse + validate + emit JSON/manifests). Deploy
      pipeline already stands up (`.github/workflows/deploy.yml`); swap `path: site` → `path: dist`
      and add the PR-validate job (spec §3.2).
- [ ] **Create `docs/data-schema.md` + `docs/wording.md`** during implementation (spec §5) and
      register both in `CLAUDE.md` "Maintained docs". Wording needs: name lore (AI展 / 愛展 /
      "aitians"), tagline pair (en "Show off your AI work" / zh 「用你的 AI 作品展風神」), CTA copy.
- [ ] **Repo settings (manual, SansWord)** — branch protection on `main` incl. no-bypass + required
      validate check; Actions "Require approval for all outside collaborators" (spec §3.3).
- [ ] **Seed `data/` from the sign-up sheet** (weekly Tuesdays 7/14 → 9/1), excluding private contact
      info (kickstart §4d).
- [ ] **Decide vs. Luma** for RSVP / the "get invite link" CTA (kickstart §2 note).
- [x] **Custom domain** — `aitian.dev` is live (CNAME added 2026-07-10, serving HTTP 200).
- [x] **Enable "Enforce HTTPS"** — done 2026-07-10; verified `http://` 301s to `https://aitian.dev/`.
- [x] **Enable GitHub Pages** (deploy from Actions) — live at `sansword.github.io/aitian` (v0.2.0).
