# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shikigami is an AI agent orchestration system for parallel development. It uses a task management system called **Fuda** (札 - Japanese paper talismans) where tasks are work units that "spirits" (AI agents) pick up and execute.

## Guidiance

- This project follows TDD.
  - if the task is to write a test for a feature, it is likely that the feature is not yet implemented or does not even exist.
  - tests are colocated with the feature they are testing. so you may need to create the directory for the feature if it doesn't exist.
- This project dogfoods its own CLI. See `.shikigami/AGENT_INSTRUCTIONS.md` for the full workflow guide.
- If the user asks you to "get to work" or something similar, you should use the CLI to get a task and then work on it.
- when you've completed a task and marked it as done, create a commit with the changes.

## Commands

```bash
# Run CLI in development
bun run dev [command]

# Run all tests
bun test

# Run specific test file
bun test tests/db/fuda.test.ts

# Run tests in a directory
bun test tests/db

# Type checking
bun run typecheck
```

## Architecture

### Core Concepts

- **Fuda**: Task units with title, description, status, priority, and spirit type
- **Spirit Types**: `shikigami` (general), `tengu` (review), `kitsune` (testing)
- **Dependencies**: Tasks can block each other (`blocks`, `parent-child`, `related`, `discovered-from`)
- **Status Flow**: `pending` → `ready` → `in_progress` → `in_review`/`done`/`failed`

### Directory Structure

```
src/
├── cli/           # Commander-based CLI
│   ├── index.ts   # Entry point, defines all commands
│   └── commands/  # Individual command implementations
├── db/            # SQLite database layer (bun:sqlite)
│   ├── fuda.ts    # Fuda CRUD operations
│   └── dependencies.ts  # Dependency graph operations
├── types/         # TypeScript interfaces and enums
└── utils/         # ID generation, output formatting

tests/             # Mirrors src/ structure, uses bun:test

.shikigami/        # Project data directory
├── shiki.db       # SQLite database
└── prds/          # PRD markdown files
```

### Database

- SQLite stored at `.shikigami/shiki.db` in project root
- Migrations embedded in `src/db/migrations/` (not SQL files)
- Tests use in-memory SQLite (`:memory:`) for isolation

### Key Patterns

- All CLI commands support `--json` flag for machine-readable output
- IDs use short hash format: `sk-{4-6 chars}` with prefix matching
- Soft deletes by default (tombstone fields: `deleted_at`, `deleted_by`, `delete_reason`)
- Readiness is computed: a fuda becomes `ready` when all blocking dependencies are `done`

### PRD (Product Requirements Documents)

PRDs are markdown files that define features and their implementation tasks. They live in `.shikigami/prds/` with a date-prefixed naming convention.

**File convention:** `.shikigami/prds/{YYYY-MM-DD}_{name}.md`

**Commands:**
- `shiki prd init <name>` - Create a new PRD file with today's date prefix
- `shiki prd list` - List all PRDs with fuda counts and status summary
- `shiki prd show <id>` - Show PRD content and all related fuda
- `shiki prd check` - Validate PRD references (CI-friendly, exits non-zero if orphaned fuda found)

**Linking fuda to PRDs:**
- When creating fuda with `shiki add --prd <prd-id>`, the fuda is linked to that PRD
- The PRD ID is the filename without `.md` extension (e.g., `2025-01-09_my-feature`)
- Use `shiki prd show <id>` to see all fuda associated with a PRD

## Development Approach

This project follows TDD. When implementing new features:
1. Write tests first in `tests/`
2. Implement in `src/`
3. Use `shiki add` to create fuda tracking the work with proper dependencies
