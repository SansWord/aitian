# Changelog

What's new on [aitian.dev](https://aitian.dev) for visitors, speakers, and moderators. This file
tracks user-visible features — the full build history (fixes, internals, design sessions) lives in
[`docs/devlog.md`](docs/devlog.md).

## v0.8.0 — Labeled materials & per-meetup buttons (2026-07-12)

- Talks and chats can list multiple materials — slides, demo, repo — each with its own label, in
  both languages if you like.
- A special event can put its own buttons on its meetup page in place of the site-wide RSVP.
- When a contribution PR has a data problem, the errors now show up inline on the changed file
  and on the check's summary page — no digging through build logs.

## v0.7.0 — RSVP from the meetup page (2026-07-10)

- Upcoming meetup pages show the RSVP button right below the schedule — sign up where you're
  already reading.

## v0.6.0 — Speaker profiles on meetup pages (2026-07-10)

- Talks can carry a speaker card: name, a short bio, and the speaker's own links (portfolio,
  LinkedIn, …). Speakers add and edit these themselves via PR.

## v0.5.2 — Bilingual time display (2026-07-10)

- Both schedule lines follow the language toggle: English mode shows "Taipei: Wed 9:00 AM …",
  中文 mode shows 「美國西岸時間 …」.
- The language switch is a segmented EN｜中文 control that highlights the current language.

## v0.5.0 — Contribute your own entry (2026-07-10)

- Contributor guides across the repo: add yourself as a moderator, or add your talk to a meetup,
  by editing one Markdown file and opening a PR — templates and worked examples included.
- Moderator profiles support an avatar and any links you want public.

## v0.4 — New look + live RSVP (2026-07-10)

*(covers v0.4.0–v0.4.4)*

- Refreshed visual identity in both themes — lagoon-and-cream light, black/purple/gold dark —
  plus hero artwork on the landing page.
- The RSVP button is live, linking to the Luma event.

## v0.3.0 — Launch (2026-07-10)

- [aitian.dev](https://aitian.dev) is live: a landing page with the next meetup and the coming
  weeks, a page for every meetup with a citable URL you can link from LinkedIn or a résumé, and a
  moderators page.
- The whole site is bilingual (English / 中文) with a dark/light theme; both preferences are
  remembered between visits.
- Every meetup, talk, and moderator profile is a Markdown file contributed by PR — the community
  maintains its own record.
