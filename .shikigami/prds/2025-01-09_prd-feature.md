# PRD Feature

## Overview

Add PRD (Product Requirements Document) support to Shikigami, allowing fuda to reference planning documents for context.

## Design Decisions

### Storage: Filesystem-based (no DB table)

PRDs are `.md` files stored at `.shikigami/prds/{date}_{name}.md`. The filesystem is the source of truth.

- **Format**: `2025-01-09_auth-feature.md`
- **prd_id**: The filename without extension (e.g., `2025-01-09_auth-feature`)
- **No `prds` table** - fuda reference PRDs via existing `prd_id` field

### Version Control

- PRD files are committed to git alongside code
- Fuda store `output_commit_hash` at creation time
- To see PRD state when a fuda was created: `git show {hash}:.shikigami/prds/{prd_id}.md`

### Validation: On-read, not on-write

- `shiki add --prd foo` allows orphan references (file doesn't need to exist)
- `shiki prd list` surfaces orphan references clearly
- Typos become visible when listing, easy to fix

### Directory Structure

Flat directory (no nesting by date). Filenames already sort chronologically.

```
.shikigami/prds/
  2025-01-09_auth-feature.md
  2025-01-10_payment-flow.md
```

Archive/cleanup deferred (YAGNI). Files accumulate, git handles history.

## CLI Commands

### `shiki prd list`

Lists PRDs with fuda counts and status.

```
PRDs:
  2025-01-09_auth-feature    3 fuda (2 done, 1 in_progress)
  2025-01-10_payment-flow    5 fuda (0 done, 5 pending)

Orphan references (no .md file):
  auth-featur                1 fuda
```

### `shiki prd show <id>`

Shows PRD content and related fuda.

```
# Auth Feature
...PRD content...

Related Fuda:
  sk-a1b2  [done]        "Add login endpoint"
  sk-c3d4  [in_progress] "Add logout button"
  sk-e5f6  [pending]     "Add session management"
```

### `shiki prd init <name>`

Creates a new PRD file with today's date prefix.

```bash
shiki prd init auth-feature
# Created: .shikigami/prds/2025-01-09_auth-feature.md
```

### `shiki prd check`

Validates PRD references. Returns non-zero if orphans exist (for CI).

## Derived Metadata

PRD status is derived from fuda states:
- **complete**: All fuda are `done`
- **active**: Any fuda is `in_progress`
- **planned**: All fuda are `pending`/`ready`
- **empty**: No fuda reference this PRD

## Out of Scope

- PRD table in database
- Nested date directories
- Auto-archive on completion
- PRD content stored in DB

## Fuda

- [ ] Add PRD info to `shiki show <fuda_id>` output - display `prd_id` and `prd_path` (resolved to `.shikigami/prds/{prd_id}.md`) for both human-readable and `--json` output
- [ ] Update gitignore behavior to exclude `.shikigami/prds/` from ignore. the CLI code that writes ./shikigami should also add `!.shikigami/prds/` to the gitignore.
- [ ] Add `shiki prd init` command
- [ ] Add `shiki prd list` command
- [ ] Add `shiki prd show` command
- [ ] Add `shiki prd check` command
- [ ] Update docs (CLAUDE.md, help text)

