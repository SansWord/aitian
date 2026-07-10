# TODO

The single home for "what's next" — the root `CLAUDE.md` points here instead of restating it. Keep it
current as part of the end-of-session checklist.

## Now

- [x] **Merge the MVP PR** ([#1](https://github.com/SansWord/aitian/pull/1)) — merged 2026-07-10;
      one combined PR (spec + plan + implementation).
- [x] **Execute the plan** ([`docs/superpowers/plans/2026-07-10-mvp-scaffold.md`](docs/superpowers/plans/2026-07-10-mvp-scaffold.md))
      — done 2026-07-10 (v0.3.0): built on `feat/mvp-scaffold`, stacked on the unmerged
      `feat/mvp-scaffold-spec`; both land together via the combined PR #1. All 19 tasks shipped
      (well past the 7/14 cutline), incl. the meetup detail and moderators pages.
- [x] **Write the implementation plan** from the approved spec — done 2026-07-10:
      [`docs/superpowers/plans/2026-07-10-mvp-scaffold.md`](docs/superpowers/plans/2026-07-10-mvp-scaffold.md).
- [ ] **Back-fill booked weeks from the private sheet** (SansWord) — edit the seeded TBA files
      (7/21–9/1) with confirmed talks (Foucault, Charlie, Zoe, …). Edit `segments:` only — never
      rename the files. No contact info (kickstart §4d).
- [ ] **Repo settings (manual, SansWord)** — branch protection on `main` incl. no-bypass + required
      `build` check; Actions "Require approval for all outside collaborators" (spec §3.3).
- [x] **Verify the deploy after merge** — done 2026-07-10: `aitian.dev` serves the new site
      (landing 200 + `data-page="landing"`, `meetup.html` 200, data JSON 200). PR half verified
      earlier the same day: on PR #1 the `build` check passed and `deploy` was skipped, as designed.
- [ ] **Speaker-consent announcement (SansWord)** — the MVP PR merged 2026-07-10, so speaker names
      (Claire, 7/14 meetup) are now published. If the one-time community-channel announcement with
      opt-out (docs/data-schema.md §Privacy & consent) hasn't gone out yet, send it now; check this
      off once confirmed.

## Later

- [x] **Build the MVP** per the spec — done 2026-07-10 (v0.3.0): pages (landing, hash-routed meetup
      detail, moderators), `data/` Markdown, `scripts/build-data.mjs` (parse + validate + emit
      JSON/manifests). CI now publishes `dist/` via the split `build`/`deploy` jobs (spec §3.2).
- [x] **Create `docs/data-schema.md` + `docs/wording.md`** — done 2026-07-10 (v0.3.0), registered in
      `CLAUDE.md` "Maintained docs". Wording covers name lore (AI展 / 愛展 / "aitians"), tagline pair
      (en "Show off your AI work" / zh 「用你的 AI 作品展風神」), and CTA copy.
- [ ] **Seed `data/` from the sign-up sheet** (weekly Tuesdays 7/14 → 9/1), excluding private contact
      info (kickstart §4d) — **amended 2026-07-10:** seeding is done (8 PT Tuesdays, 7/14 booked with
      the kickstart talks, 7 TBA placeholders); back-filling the remaining booked weeks is tracked
      above under Now.
- [ ] **Decide vs. Luma** for RSVP / the "get invite link" CTA (kickstart §2 note).
- [ ] **Real avatars** — replace `default.png` placeholder usage: add `sansword.png` / `pinku.png`
      to `data/moderators/avatars/` + `avatar:` fields (photos from the humans).
- [ ] **zh copy review** — pinku/SansWord native pass over `site/ui-strings.json`, moderator bios,
      and the community intro (flagged in `docs/wording.md`).
- [ ] **Styling pass** — pinku's look-and-feel refs on the hero/section design (post-MVP, spec §5).
- [ ] **Body-heading lint decision** — duplicate or malformed `## en` / `## zh` headings in a markdown
      body silently drop content (last heading wins; stray text after the language code orphans the
      section). Decide whether the validator should flag these (false-positive risk: legit headings
      starting with "en"), or document the rule in `docs/data-schema.md`.
- [x] **Custom domain** — `aitian.dev` is live (CNAME added 2026-07-10, serving HTTP 200).
- [x] **Enable "Enforce HTTPS"** — done 2026-07-10; verified `http://` 301s to `https://aitian.dev/`.
- [x] **Enable GitHub Pages** (deploy from Actions) — live at `sansword.github.io/aitian` (v0.2.0).
