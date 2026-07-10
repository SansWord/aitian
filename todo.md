# TODO

The single home for "what's next" — the root `CLAUDE.md` points here instead of restating it. Keep it
current as part of the end-of-session checklist.

## Now

- [ ] **Brainstorm session** on the open questions in [`docs/kickstart.md`](docs/kickstart.md) §5 —
      framework choice, i18n approach, hero image, speaker-consent flow, participant count,
      look-and-feel assets.
- [ ] **Create `docs/wording.md`** — name lore (AI展 / 愛展 / "aitians") + bilingual (zh/en) copy.
      See kickstart §0 TODO.

## Later

- [ ] **Build the MVP** — pages (landing, hash-routed meetup detail, moderators), `data/` Markdown,
      `scripts/build-data.mjs` (parse Markdown → JSON + manifest). Deploy pipeline already stands up
      (`.github/workflows/deploy.yml`); the MVP build step slots into it (swap `path: site` → `path: dist`
      once there's a `dist/` to build).
- [ ] **Seed `data/` from the sign-up sheet** (weekly Tuesdays 7/14 → 9/1), excluding private contact
      info (kickstart §4d).
- [ ] **Decide vs. Luma** for RSVP / the "get invite link" CTA (kickstart §2 note).
- [ ] **Custom domain** (`aitian.dev` or similar) once the site is up.
- [x] **Enable GitHub Pages** (deploy from Actions) — live at `sansword.github.io/aitian` (v0.2.0).
