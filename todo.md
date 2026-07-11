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
- [x] **Write the implementation plan for the README tree** from the approved spec
      ([`docs/superpowers/specs/2026-07-10-readme-tree-design.md`](docs/superpowers/specs/2026-07-10-readme-tree-design.md))
      — done 2026-07-10 (v0.5.0): plan
      ([`docs/superpowers/plans/2026-07-10-readme-tree.md`](docs/superpowers/plans/2026-07-10-readme-tree.md))
      executed; READMEs, validator changes, and privacy unlock shipped.
- [ ] **Back-fill booked weeks from the private sheet** (SansWord) — edit the seeded TBA files
      (7/21–9/1) with confirmed talks (Foucault, Charlie, Zoe, …). Edit `segments:` only — never
      rename the files. Nothing from the sheet's contact column (maintainer-side rule,
      readme-tree spec §5).
- [ ] **Repo settings (manual, SansWord)** — branch protection on `main` incl. no-bypass + required
      `build` check; Actions "Require approval for all outside collaborators" (spec §3.3).
- [x] **Verify the deploy after merge** — done 2026-07-10: `aitian.dev` serves the new site
      (landing 200 + `data-page="landing"`, `meetup.html` 200, data JSON 200). PR half verified
      earlier the same day: on PR #1 the `build` check passed and `deploy` was skipped, as designed.
- [ ] **Speaker-consent announcement (SansWord)** — the MVP PR merged 2026-07-10, so speaker names
      (Claire, 7/14 meetup) are now published. If the one-time community-channel announcement with
      opt-out (docs/data-schema.md §Privacy & consent) hasn't gone out yet, send it now; check this
      off once confirmed.
- [x] **PR review + merge `feat/localized-time-lines`** — merged 2026-07-10 as
      [#12](https://github.com/SansWord/aitian/pull/12); `v0.5.2` tagged (2026-07-11).
- [x] **PR review + merge `speaker-links`** — merged as
      [#14](https://github.com/SansWord/aitian/pull/14); `v0.6.0` tagged. Open call (1) resolved:
      real speaker links seeded via [#15](https://github.com/SansWord/aitian/pull/15) (Claire's +
      SansWord's links on the 7/14 talks). Open call (2) moved to its own item below.
- [x] **PR review + merge `feat/rsvp-button`** — merged as
      [#16](https://github.com/SansWord/aitian/pull/16); `v0.7.0` tagged (2026-07-11). Adds the
      RSVP button (community `rsvp` CTA) to upcoming meetup detail pages.
- [ ] **Document who may add a speaker's `links`** — `docs/data-schema.md` §Privacy & consent's
      Speakers bullet predates the `links` field; decide + state whether links come from the
      speaker's own PR or an organizer with approval (open call (2) from the `speaker-links`
      review).
- [ ] **Fix `.mod-links a` light-theme contrast** — moderator links still use `--accent-pop`
      (~2:1 on light backgrounds, below AA); apply the same `--accent` fix that v0.6.0 made for
      `.segment-speaker-links a` (devlog v0.6.0 gotcha has the measurements).
- [x] **Post-v0.5.0 content polish** — done 2026-07-11 (v0.7.1): bios replaced earlier via
      #14/#15; avatar renamed to `sansword.jpg`; `sansword.md` en body line fixed; TBA-filename
      rule documented (slug chosen at creation only — a deployed TBA file keeps its bare-date name
      when booked; meetups README + data-schema.md).

## Later

- [x] **Build the MVP** per the spec — done 2026-07-10 (v0.3.0): pages (landing, hash-routed meetup
      detail, moderators), `data/` Markdown, `scripts/build-data.mjs` (parse + validate + emit
      JSON/manifests). CI now publishes `dist/` via the split `build`/`deploy` jobs (spec §3.2).
- [x] **Create `docs/data-schema.md` + `docs/wording.md`** — done 2026-07-10 (v0.3.0), registered in
      `CLAUDE.md` "Maintained docs". Wording covers name lore (AI展 / 愛展 / "aitians"), tagline pair
      (en "Show off your AI work" / zh 「用你的 AI 作品展風神」), and CTA copy.
- [ ] **Seed `data/` from the sign-up sheet** (weekly Tuesdays 7/14 → 9/1), excluding the sheet's
      contact column (maintainer-side rule, readme-tree spec §5) — **amended 2026-07-10:** seeding
      is done (8 PT Tuesdays, 7/14 booked with the kickstart talks, 7 TBA placeholders);
      back-filling the remaining booked weeks is tracked above under Now.
- [x] **Decide vs. Luma** for RSVP / the "get invite link" CTA (kickstart §2 note) — decided
      2026-07-10 (v0.4.1): Luma; the single 報名聚會 / RSVP CTA links to the event, with the link
      kept in `data/community.md` frontmatter for easy updates.
- [x] **Real avatars** — done: `pinku.svg` wired, and SansWord's avatar added + wired via
      [#13](https://github.com/SansWord/aitian/pull/13) (note: the file landed as `sanword.jpg` —
      rename tracked under "Post-v0.5.0 content polish" above).
- [ ] **zh copy review** — pinku/SansWord native pass over `site/ui-strings.json`, moderator bios,
      and the community intro (flagged in `docs/wording.md`).
- [ ] **Styling pass** — pinku's look-and-feel refs on the hero/section design (post-MVP, spec §5).
      **Amended 2026-07-10:** light color scheme done in v0.4.0, dark palette corrected in v0.4.2
      (`#000411`, `#E1EFE6`, `#82C0CC`, `#EFCB68`, `#16697A` → `docs/theming.md`), and the live site
      restyled in v0.4.3 toward the chosen `B` showroom direction with softer borders; v0.4.4 adds
      theme-specific landing hero images plus the corrected dark glow system. Hero / section /
      typography can still be tuned, but the first major polish pass is now in.
- [ ] **Body-heading lint decision** — duplicate or malformed `## en` / `## zh` headings in a markdown
      body silently drop content (last heading wins; stray text after the language code orphans the
      section). Decide whether the validator should flag these (false-positive risk: legit headings
      starting with "en"), or document the rule in `docs/data-schema.md`.
- [x] **Custom domain** — `aitian.dev` is live (CNAME added 2026-07-10, serving HTTP 200).
- [x] **Enable "Enforce HTTPS"** — done 2026-07-10; verified `http://` 301s to `https://aitian.dev/`.
- [x] **Enable GitHub Pages** (deploy from Actions) — live at `sansword.github.io/aitian` (v0.2.0).
