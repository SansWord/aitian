# RSVP button on the meetup detail page — design

**Date:** 2026-07-10 · **Status:** approved (one-shot session: design → plan → implement together)

## Docs consulted

`docs/kickstart.md` (§2 CTA decision, §3 MVP pages), `docs/data-schema.md` (community `ctas` schema,
fetch/caching), `docs/wording.md` (CTA copy table), `site/site.js`, `site/meetup.html`,
`data/community.md`, `todo.md` (v0.4.1 Luma decision).

## Problem

The RSVP CTA (decided v0.4.1: Luma, link kept in `data/community.md` frontmatter) renders only on
the landing hero. A visitor who lands directly on `meetup.html#<id>` — the citable per-meetup URL —
sees the agenda but has no way to sign up.

## Decision

Render the community CTA row on the meetup detail page, for **upcoming meetups only**. (Revised
in-session from "just the `rsvp` entry" at SansWord's direction: the detail page renders **all**
`ctas`, exactly like the landing hero — today that is the single RSVP button, and future CTAs
appear on both pages automatically.)

### Approaches considered

1. **Reuse the community `ctas` entry (chosen).** `meetup.html` fetches `community.json` alongside
   the meetup index and renders the `id === 'rsvp'` entry with the existing `.cta` styling. Zero
   schema change, single source of truth for label + link, bilingual label already in data.
2. **Per-meetup `rsvpUrl` field.** A schema addition for a value that is today identical for every
   meetup (one recurring Luma event). Violates YAGNI; revisit only if per-event links ever diverge.
3. **Hardcode the Luma URL in `site.js`.** Rejected — v0.4.1 deliberately moved the link into data
   so event-link changes are a one-line data edit.

## Behavior

- **Data:** `initMeetup()` fetches `./data/community.json` in parallel with the meetup index.
- **Which CTAs:** all of `community.ctas`, rendered by a `ctaButtons()` helper shared with the
  landing hero — one behavior, two pages: non-empty `href` → link, empty `href` → disabled
  placeholder button. An empty `ctas` list renders nothing.
- **When:** only when the displayed meetup is still "upcoming" by the site's one rule,
  `isUpcoming(m)` (`end + 1h grace`, the same predicate `splitMeetups` uses). Past meetups never
  show the row. TBA upcoming weeks do — the Luma event is real regardless of agenda.
- **Where:** directly after the two time lines (before attendees/intro/segments) — beside the
  information a visitor needs to decide.
- **Label/link:** `pick(cta.label)` (follows the language toggle via the full re-render) and
  `cta.href`, same-tab navigation exactly like the landing CTA.
- **Markup:** `<div class="cta-row detail-ctas">…</div>`; one new CSS rule for detail-page
  spacing, button look reuses `.cta` unchanged.

## Error handling

`community.json` joins the existing `Promise.all` in `initMeetup()`; a failure falls through to the
page-level error handler in `main()` like any other data fetch (no new path).

## Testing

The automated suite covers the build pipeline only; frontend behavior is verified manually per
project precedent: `npm test`, `npm run build`, serve `dist/`, check upcoming (button, both
languages) and a past/not-found hash (no button).

## Out of scope

Per-meetup RSVP links, attendee-count integration with Luma, showing the button on past meetups.
