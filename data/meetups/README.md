# Meetups — one file per weekly session

A meetup file describes one whole weekly session — a **multi-segment** evening (e.g. Talk 1 /
Talk 2 / open chat), never a single talk. One file per week.

## Naming

- Week still TBA: `YYYY-MM-DD.md` (e.g. `2026-07-21.md`)
- Week already booked when the file is created: `YYYY-MM-DD-short-slug.md`
  (e.g. `2026-07-14-ai-role-play.md`)
- The date is the meetup's **US-Pacific (PT) calendar date** — a Tuesday-evening PT meetup is
  Wednesday morning in Taipei and still uses the Tuesday date.
- **The filename is frozen once the file has deployed.** It's the shared, citable link — renaming
  breaks it. A deployed TBA file that later gets booked keeps its bare-date name (fill in
  `segments:` only), and reschedules change the `date` field, never the filename.

## Add or edit a week

1. Copy [`_template.md`](_template.md) to a new file named as above.
2. Fill in the frontmatter. A TBA week keeps `segments: []` — the site renders it as a
   "want to speak?" slot.
3. For each booked segment fill `type`, `title`, and `speaker` (plus `speakerBio` /
   `materialsUrl` / `links` — the speaker's public links — if you have them).
4. Open a PR; CI reports any problems per field. Anything merged is public — see the
   [visibility note](../README.md#public-visibility).
5. After the event, back-fill `attendees` with a follow-up PR.

**Worked example:** [`2026-07-14-ai-role-play.md`](2026-07-14-ai-role-play.md) — a real booked
week to crib from.

**Full field reference:**
[meetup fields](../../docs/data-schema.md#meetup--datameetupsyyyy-mm-dd-slugmd) ·
[what CI rejects](../../docs/data-schema.md#what-ci-rejects)
