# AI展 (aitian)

**Show off your AI work** — the weekly AI-application meetup. Live at **[aitian.dev](https://aitian.dev)**.

The name is a Taiwanese pun: **愛展** (*ài-tián*) means "love to show off / want to demo", and the
"-ian" ending makes a demonym — members are **aitians**.

## What this repo is

The static portal site for the meetup: upcoming schedule, past sessions, and the moderator crew.
Content is Markdown under [`data/`](data/), validated and built to JSON at deploy, and published to
GitHub Pages. The data contract lives in [`docs/data-schema.md`](docs/data-schema.md); project
history and design docs live in [`docs/`](docs/).

Fittingly for a show-your-AI-work community, the site is itself a demo of AI work: designed and
developed with [Claude Code](https://claude.com/claude-code), mostly **Claude Fable 5** for the MVP.

## Contribute

| You want to… | Start here |
|---|---|
| Add or edit a meetup | [`data/meetups/README.md`](data/meetups/README.md) |
| Add yourself as a moderator | [`data/moderators/README.md`](data/moderators/README.md) |
| Improve site copy or code | PRs welcome — keep the maintained [`docs/`](docs/) files in sync with your change |

The PR flow, once for everything: **fork or branch → open a PR → CI validates → a maintainer
merges → the site auto-deploys.**

## Test your change locally

```
npm ci
npm test          # validator + unit tests — the same checks CI runs
npm run build     # validates data/ and builds the site into dist/
npx serve dist    # any static file server works
```

> **Don't open `dist/index.html` via a `file://` URL** — the site fetches its JSON at runtime and
> browsers block `fetch` on file URLs, so you'd see empty pages. Serve `dist/` over HTTP as above.

## Public visibility

Anything merged here is public — the repo, its history, and the site. Only include contact info you
want public; links beat raw emails. Want your content changed or removed later? Open a PR or ask a
maintainer.
