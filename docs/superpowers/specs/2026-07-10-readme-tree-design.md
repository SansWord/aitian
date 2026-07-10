# Contributor README tree + privacy unlock — design

**Date:** 2026-07-10 · **Participants:** SansWord, Claude · **Status:** approved
**Docs consulted:** `docs/kickstart.md` (§4, §4d), `docs/data-schema.md`, `CLAUDE.md` (locked
decisions), `data/meetups/_template.md`, `data/moderators/_template.md`, `scripts/build-data.mjs`.

## 0. Goal

Contributors landing on the GitHub repo should be able to find out what the project is, what they
can PR (meetups, moderator entries), and how to do it — without a maintainer walking them through.
Today that knowledge lives in `docs/data-schema.md` and the `_template.md` files; nothing greets a
reader at the repo root or inside `data/`.

Deliverable: four README files plus the validator/doc changes they require, and one
locked-decision change (privacy stance) that surfaced during design.

## 1. Decisions made during brainstorming

| Decision | Choice |
|---|---|
| Language | English only — matches every existing repo doc; one copy, no translation drift |
| Root README framing | Community front door: name lore + tagline + aitian.dev link, then contributor guide; under ~2 screens |
| Where field detail lives | **Layered roles** — READMEs are how-to guides; `docs/data-schema.md` stays the only normative field reference (deep-linked); `_template.md` stays the inline cheat-sheet. No duplicated field tables. |
| Privacy stance | **Unlocked** (was: contact info never enters the repo) — see §5 |

## 2. Doc-role layering (the rule that prevents drift)

- **READMEs** answer "what do I do": steps, file-naming rules, PR flow, what CI checks, one worked
  example per type. Worked examples are links to real committed files (`2026-07-14-ai-role-play.md`,
  `sansword.md`), so they cannot drift.
- **`docs/data-schema.md`** stays the single normative reference: field tables, bilingual rules,
  CI rejection list, evolution rules. READMEs deep-link into its sections; they never restate them.
- **`_template.md`** files stay the copy-me starting point with inline comments.

## 3. The four files

### 3.1 `README.md` (repo root)

1. **Hero:** AI展 (aitian) + tagline "Show off your AI work"; the name pun in one line
   (愛展 *ài-tián*, "want to demo"; members are "aitians"); prominent link to **https://aitian.dev**.
2. **What this repo is:** static portal for the weekly AI-application meetup; content is Markdown
   under `data/`, validated and built to JSON at deploy, published to GitHub Pages. One short
   paragraph; link `docs/data-schema.md` for the contract and `docs/` generally for history.
3. **Contribute:** routing table — "add/edit a meetup" → `data/meetups/README.md`; "add yourself as
   a moderator" → `data/moderators/README.md`; "site copy / code" → PRs welcome, keep `docs/*.md` in
   sync. States the PR flow once: fork/branch → PR → CI validates → maintainer merges → auto-deploy.
4. **Test your change locally:**
   ```
   npm ci
   npm test          # validator + unit tests — same checks CI runs
   npm run build     # builds the site into dist/
   npx serve dist    # any static server works
   ```
   With the explicit warning that opening `dist/index.html` via `file://` does not work (the site
   fetches JSON; browsers block fetch on file URLs) — serve it over HTTP.
5. **Public-visibility note:** one short paragraph (§5 wording).

### 3.2 `data/README.md`

- `data/` is the site's stable backend; **the filename is the id and the citable URL; never rename
  a file after it has deployed**.
- Map of contents: `community.md` (maintainer-owned site copy), `meetups/` (one file per weekly
  session), `moderators/` (one file per moderator) — one line each, linking each folder README.
- The contribution flow in five numbered steps (copy `_template.md` → rename → fill → PR → CI
  reports per-field errors; maintainer merge deploys the site).
- Bilingual rule in one line (plain string serves both languages, or `{en, zh}`; prose bodies use
  `## en` / `## zh`) with a deep link to `docs/data-schema.md#bilingual-fields--one-rule-per-shape`.
- Public-visibility note (§5).

### 3.3 `data/meetups/README.md`

- What a meetup file is: a multi-segment session (talks + chat), one file per week.
- Naming: `YYYY-MM-DD.md` (TBA) or `YYYY-MM-DD-short-slug.md` (booked); the date is the meetup's
  **PT calendar date**; reschedules change the `date` field, never the filename.
- Steps from template copy to opened PR; TBA weeks keep `segments: []`; back-fill `attendees`
  after the event.
- Worked example: link `2026-07-14-ai-role-play.md` as "a real booked week to crib from".
- Deep links: `docs/data-schema.md#meetup...` (full fields) and `#what-ci-rejects`.
  (Implementation: compute the real GitHub anchors from the headings.)

### 3.4 `data/moderators/README.md`

- One file per moderator; filename = your lowercase handle = your card id.
- Steps: copy `_template.md` → `your-handle.md` → fill `name`/`bio`/`links` → optional avatar
  (PNG into `avatars/`, referenced by bare filename in `avatar:`; omitted → `default.png`).
- **PR-ing your own entry is the consent to publish it.**
- Worked example: link `sansword.md`. Deep link to `docs/data-schema.md#moderator...`.

## 4. Validator change: skip `README.md` in data folders

`listDataFiles()` (`scripts/build-data.mjs`) currently includes every `*.md` not starting with
`_`, so `data/meetups/README.md` would be validated as a meetup and fail CI. Change:

- Filter also excludes the exact name `README.md` (the only casing we commit).
- Regression test: a `README.md` placed in a data folder is ignored by validation and emission.
- `docs/data-schema.md` wording updated in the same PR: "Templates (`_*.md`) and `README.md` are
  skipped by validation and never rendered."

`data/README.md` itself is safe today (`community.md` is read by exact path; nothing globs the
`data/` root), but the filter change covers all three folders uniformly anyway.

## 5. Privacy unlock (locked-decision change)

**Old locked decision:** speaker contact info (email/thread) never enters the public repo; CI
rejects email-shaped strings.

**New stance (decided this session, softened on review):** the repo does not police contact info.
The consent model is: **everything you PR is public once merged.** Contributors may include
contact info if they are comfortable with that; prefer profile/portfolio links over raw emails.
Speakers and moderators can ask for their content to be edited or removed at any time, and we
honor those requests. Logistics from the private sign-up sheet still never enter the repo from
the maintainer side.

Changes required:

- `scripts/build-data.mjs` (+ `scripts/lib/`): remove the email-shape privacy lint and its tests.
- `docs/data-schema.md` §Privacy & consent: rewrite to the awareness framing above.
- `CLAUDE.md` locked-decision bullet: reword from "never enters the public repo" to the new stance;
  the **Before committing** scan section narrows to maintainer-side leaks (secrets, private
  sign-up-sheet data) instead of any email-shaped string.
- `data/meetups/_template.md`: replace the "NEVER emails or contact info" comment with the
  public-forever awareness wording.
- Devlog entry logs the unlock (per the locked-decision change rule). `docs/kickstart.md` §4d
  stays untouched — it is historical.

READMEs carry a short version: *"Anything merged here is public. Only include contact info you
want public — links beat raw emails. Want your content changed or removed later? Open a PR or
ask a maintainer."*

## 6. Maintenance rules

- The three `data/` READMEs become **maintained docs**. Update trigger: any change to the
  contribution flow, file-naming rules, or folder layout.
- Root `README.md` is also maintained. Update trigger: URL, stack, PR flow, or local-test commands
  change.
- `CLAUDE.md` "Docs — two tiers" gains one line registering the READMEs (kept short — the index
  stays an index).

## 7. Out of scope

- Bilingual/zh versions of the READMEs (revisit if contributors ask).
- Screenshots, architecture diagrams, badges in the root README.
- CONTRIBUTING.md / issue templates / PR templates — the READMEs carry this load for now.
- Any change to what the *site* renders (contact info in data will render wherever the schema
  already renders those fields; no new fields are added).

## 8. Testing

- `npm test` green after the validator changes (lint removal + README-skip + new regression test).
- `npm run build` with the READMEs in place: build succeeds; `dist/data/` contains no README
  artifacts; `index.json` unchanged.
- Link check (manual): every deep link in the READMEs resolves on GitHub (anchors included).
- Local-test instructions verified by actually running them once (`npx serve dist` + browser).
