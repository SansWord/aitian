# `data/` — the site's content

This folder is the site's **stable backend**: every page renders from the Markdown files here,
validated and built to JSON at deploy. The site's look-and-feel may be redesigned freely; these
files and their schema are meant to survive.

**The filename is the id and the citable URL** (`2026-07-14-ai-role-play.md` →
`aitian.dev/meetup.html#2026-07-14-ai-role-play`). **Never rename a file after it has deployed** —
renaming breaks every link already shared or cited (LinkedIn, résumés), which is the very thing
this site exists to provide.

## What's here

- [`community.md`](community.md) — site-wide copy and schedule defaults (maintainer-owned).
- [`meetups/`](meetups/) — one file per weekly session. How-to: [`meetups/README.md`](meetups/README.md).
- [`moderators/`](moderators/) — one file per moderator. How-to: [`moderators/README.md`](moderators/README.md).

## How to contribute an entry

1. Copy the `_template.md` in the right folder.
2. Rename the copy — each folder's README gives its naming rule.
3. Fill in the fields. The template's inline comments get you started; the full field reference is
   [`docs/data-schema.md`](../docs/data-schema.md).
4. Open a PR. CI validates every file and reports each problem with its file and field.
5. A maintainer merges; the site redeploys automatically.

**Bilingual fields in one line:** a plain string serves both languages, or use an `{en, zh}` map;
prose bodies use `## en` / `## zh` headings — details in
[`docs/data-schema.md`](../docs/data-schema.md#bilingual-fields--one-rule-per-shape).

## Public visibility

Anything merged here is public — the repo, its history, and the site. Only include contact info you
want public; links beat raw emails. Want your content changed or removed later? Open a PR or ask a
maintainer.
