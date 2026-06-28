---
name: review-arch-bot
description: Use when changes have been made to the codebase and you want to sync CLAUDE.md with new patterns, files, routes, or conventions, or when the user asks to review recent changes and propose improvements.
disable-model-invocation: true # This skill is about analyzing code and proposing updates, not generating new text from a prompt
---



# Review Arch Bot

## Overview

Scan recent git changes, compare against CLAUDE.md, identify documentation gaps and stale entries, then propose both CLAUDE.md updates and code-level improvements.

**Announce at start:** "Using review-arch-bot to scan changes and update CLAUDE.md."

## When to Use

- User says "review the changes", "update CLAUDE.md", "sync the docs", "what changed?"
- After a feature branch is merged or a significant set of files were modified
- When CLAUDE.md may be out of date with what's actually in the repo

## Process

### Step 1 — Gather change context

Run these to understand what changed:

```bash
git diff main...HEAD --stat          # files changed vs main
git diff main...HEAD                 # full diff
git log main...HEAD --oneline        # commit history on branch
git status                           # uncommitted changes
```

If on the main branch (no feature branch), compare recent commits:

```bash
git diff HEAD~5..HEAD --stat
git diff HEAD~5..HEAD
```

### Step 2 — Read CLAUDE.md

Read the full `CLAUDE.md` at the project root. Hold it in context — you'll be diffing it against reality.

### Step 3 — Scan the repo structure

For each changed file or directory, check:

| Signal | What to look for |
|--------|-----------------|
| New `app/` routes | Missing from **Pages** table |
| New `components/` files | Missing from **UI Components** table |
| New `lib/` modules | Missing from **Bot Architecture** table |
| New `hooks/` | Missing from **Hooks** table |
| New API routes | Missing from **API Routes** table |
| New env vars | Missing from **Environment Variables** section |
| New npm packages | Missing from **Key dependencies** list |
| Removed files | Stale entries in any table |
| Renamed exports/types | Wrong names in **Types** or **Key conventions** |
| Changed patterns/conventions | Conflicting guidance in CLAUDE.md |

### Step 4 — Propose CLAUDE.md updates

Output a clear diff-style proposal:

```
## CLAUDE.md Updates Proposed

### Add to Pages table:
| `/new-route` | `app/new-route/page.tsx` | Description of what it does |

### Add to UI Components table:
| `NewComponent` | One-line description |

### Update Key dependencies:
+ `new-package` (purpose)
- `old-package` (removed)

### Update Known TODOs:
- Remove: "X should read from bot_config" — DONE in lib/bot.ts:42
+ Add: "Y still reads from env var, not DB"
```

### Step 5 — Propose code improvements

Review the diff for:

1. **TODOs marked as done** — remove from CLAUDE.md Known TODOs
2. **New TODOs introduced** — add to CLAUDE.md Known TODOs  
3. **Pattern violations** — code that breaks stated conventions (e.g. `USDT` values in trading pairs, wrong currency symbol, missing `cn()` for classNames)
4. **Missing type entries** — new types in `lib/types.ts` not referenced anywhere in docs
5. **Dead code** — files no longer imported, routes no longer registered

For each finding:
```
IMPROVEMENT [severity: low|medium|high]
File: lib/bot.ts:87
Issue: Reads TRADING_PAIR from env var — CLAUDE.md Known TODOs says this should read from bot_config table
Suggested fix: Replace `process.env.TRADING_PAIR` with config loaded from Supabase
```

### Step 6 — Apply updates (if approved)

If user confirms, edit `CLAUDE.md` directly using the Edit tool. Never rewrite the whole file — use targeted edits to the specific sections that changed.

## Common Mistakes

| Mistake | Correct behavior |
|---------|-----------------|
| Rewriting all of CLAUDE.md | Only edit sections with actual changes |
| Adding speculative docs for future code | Only document what exists now |
| Proposing CLAUDE.md edits without showing them first | Always show the diff proposal, wait for approval |
| Ignoring the Known TODOs section | Check every TODO — some may now be done |
| Flagging intentional naming inconsistencies as bugs | Read CLAUDE.md conventions first (e.g., `_USDT` key suffix is intentional) |
