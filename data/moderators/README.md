# Moderators — one file per person

One file per moderator. **The filename is your lowercase handle and your card's id** —
`sansword.md` renders as the `sansword` card.

## Add yourself

1. Copy [`_template.md`](_template.md) to `your-handle.md` (lowercase slug).
2. Fill in `name`, `bio` (a one-liner for the grid card), and any `links` you want public.
3. Optional avatar: drop a square image (PNG/JPG/SVG) into [`avatars/`](avatars/) and reference
   it by bare filename (`avatar: you.png`). Omit it and you get `default.png`.
4. Open a PR. **PR-ing your own entry is the consent to publish it.**

## Avatar guidance

- **Square image (PNG/JPG/SVG), 256–512px recommended.** It renders in a 96px circle and
  non-square images are center-cropped, so exact dimensions are forgiving.
- **File size must be ≤ 500 KB** — CI enforces this. Resize/compress before committing.

**Worked example:** [`sansword.md`](sansword.md).

**Full field reference:**
[moderator fields](../../docs/data-schema.md#moderator--datamoderatorsslugmd)

Anything merged here is public. Only include contact info you want public — links beat raw emails.
Want your content changed or removed later? Open a PR or ask a maintainer.
