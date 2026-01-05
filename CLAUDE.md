# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shikigami is an AI agent orchestration system for parallel development. It uses a task management system called **Fuda** (札 - Japanese paper talismans) where tasks are work units that "spirits" (AI agents) pick up and execute.

## Guidiance

- This project follows TDD.
  - if the task is to write a test for a feature, it is likely that the feature is not yet implemented or does not even exist.
  - tests are colocated with the feature they are testing. so you may need to create the directory for the feature if it doesn't exist.
- This project dogfoods its own CLI - see @FUDA_AGENT_GUIDE.md for more details on how to use it.
- If the user asks you to "get to work" or something similar, you should use the CLI to get a task and then work on it.

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
```

### Database

- SQLite stored at `.shiki/shiki.db` in project root
- Migrations embedded in `src/db/migrations/` (not SQL files)
- Tests use in-memory SQLite (`:memory:`) for isolation

### Key Patterns

- All CLI commands support `--json` flag for machine-readable output
- IDs use short hash format: `sk-{4-6 chars}` with prefix matching
- Soft deletes by default (tombstone fields: `deleted_at`, `deleted_by`, `delete_reason`)
- Readiness is computed: a fuda becomes `ready` when all blocking dependencies are `done`

## Development Approach

This project follows TDD. When implementing new features:
1. Write tests first in `tests/`
2. Implement in `src/`
3. Use `shiki add` to create fuda tracking the work with proper dependencies
