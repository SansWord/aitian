<!-- ADVANCED MENU — not auto-loaded (only CLAUDE.md / AGENTS.md is). These are the blocks NOT yet
     opted in. When you want one, copy it into the lean CLAUDE.md (replace any matching stub — one
     fact, one place). Shared conventions (devlog format, semver, communication style) live in the
     global ~/.claude/CLAUDE.md and are not duplicated here. -->

# AI展 (aitian) — governance menu

**Already active in `CLAUDE.md`** (opted in): Locked decisions · Before-you-plan · Workflow/dev cycle ·
End-of-session PR gate · Conventions · Before-committing scan.

The blocks below are the **remaining** menu — copy into `CLAUDE.md` if/when you want them.

## Unlock protocol — change a Locked decision in the open

> Not yet opted in. Today's rule (in `CLAUDE.md` Locked decisions) is the lighter "update the canonical
> section + log it in the devlog." This block formalizes it:

Changing a locked decision must be **deliberate and logged, never silent**:

1. Update the canonical doc/section (kickstart or a maintained `docs/*.md`) with the new rule.
2. Update the one-liner in `CLAUDE.md` Locked decisions.
3. **Log the change and its reason** in `docs/devlog.md` (newest-on-top). The superseded decision stays
   in the historical record, so the *why* of the change is preserved.

Past constraints shouldn't silently block new thinking — they should be visible so the choice is
deliberate.

## ADR flow — Architecture Decision Records

> Not yet opted in. Early `aitian` decisions live as one-liners in `CLAUDE.md` Locked decisions (with
> rationale in kickstart). Adopt this when a decision is weighty enough to deserve its own
> context/options/consequences write-up.

To adopt: create `docs/decisions/` with a short README, add an ADR template, and record each
significant decision as `docs/decisions/NNNN-<slug>.md` (context · decision · why · consequences),
dated and append-only. **Tier rule:** the ADR is the *historical record*; the **current enforced rule**
still lives in a maintained doc (`docs/*.md` or `CLAUDE.md` Locked decisions) — that's what the agent
obeys.
