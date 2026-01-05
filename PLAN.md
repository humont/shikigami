# Fuda System Implementation Plan

## Overview

Implement the Fuda task management system as specified in FUDA.md. Test-driven development using Bun's test runner.

## Key Decisions

- **SQLite Driver**: Bun's built-in `bun:sqlite`
- **CLI Framework**: Commander v14 (already installed)
- **DB Location**: `.shiki/shiki.db` in project root
- **Migrations**: Plain SQL files in `.shiki/migrations/`
- **Test Runner**: `bun test`
- **Approach**: Write tests first, then implement

## Directory Structure

```
src/
├── cli/
│   ├── index.ts
│   └── commands/
│       ├── init.ts
│       ├── add.ts
│       ├── show.ts
│       ├── remove.ts
│       ├── ready.ts
│       ├── status.ts
│       └── deps/
│           ├── index.ts
│           ├── tree.ts
│           ├── blocked.ts
│           ├── add.ts
│           └── remove.ts
├── db/
│   ├── index.ts
│   ├── migrations.ts
│   ├── fuda.ts
│   └── dependencies.ts
├── types/
│   └── index.ts
└── utils/
    ├── id.ts
    ├── output.ts
    └── display-id.ts

tests/
├── db/
│   ├── fuda.test.ts
│   ├── dependencies.test.ts
│   └── migrations.test.ts
├── utils/
│   ├── id.test.ts
│   └── display-id.test.ts
└── cli/
    ├── init.test.ts
    ├── add.test.ts
    ├── show.test.ts
    ├── remove.test.ts
    ├── ready.test.ts
    └── deps.test.ts
```

## Implementation Steps (Test-First)

### Phase 1: Foundation + Tests

1. **Create tsconfig.json**

2. **Create src/types/index.ts**
   - `FudaStatus`, `DependencyType` enums
   - `Fuda`, `FudaDependency` interfaces

3. **Write tests/utils/id.test.ts**
   - Test `generateId()` produces `sk-xxxx` format
   - Test uniqueness across multiple calls
   - Test collision handling

4. **Implement src/utils/id.ts**

5. **Write tests/utils/display-id.test.ts**
   - Test `prd-xxxx.1` for first child
   - Test `prd-xxxx.1.2` for nested child
   - Test incrementing sibling numbers

6. **Implement src/utils/display-id.ts**

### Phase 2: Database Layer + Tests

7. **Write tests/db/migrations.test.ts**
   - Test migration table creation
   - Test running migrations in order
   - Test skipping already-applied migrations
   - Test transaction rollback on failure

8. **Implement src/db/index.ts & src/db/migrations.ts**

9. **Write tests/db/fuda.test.ts**
   - Test `createFuda()` returns valid fuda with ID
   - Test `getFuda()` retrieves by ID
   - Test `getFuda()` with prefix matching
   - Test `getFudaByStatus()` filters correctly
   - Test `getReadyFuda()` returns only ready fuda
   - Test `updateFudaStatus()` changes status
   - Test `deleteFuda()` soft deletes (sets deletedAt)
   - Test `restoreFuda()` clears deletedAt
   - Test `hardDeleteFuda()` permanently removes
   - Test soft-deleted fuda excluded by default

10. **Implement src/db/fuda.ts**

11. **Write tests/db/dependencies.test.ts**
    - Test `addFudaDependency()` creates link
    - Test `removeFudaDependency()` removes link
    - Test `getFudaDependencies()` returns all deps
    - Test `getBlockingDependencies()` filters to blocks/parent-child
    - Test `areAllDependenciesDone()` checks all blocking deps
    - Test multi-parent: C depends on A AND B
    - Test `updateReadyFuda()` transitions pending→ready

12. **Implement src/db/dependencies.ts**

### Phase 3: CLI Commands + Tests

13. **Write tests/cli/init.test.ts**
    - Test creates `.shiki/` directory
    - Test creates database file
    - Test runs initial migration
    - Test `--force` overwrites existing
    - Test fails without `--force` if exists

14. **Implement src/cli/commands/init.ts**

15. **Write tests/cli/add.test.ts**
    - Test creates fuda with title/description
    - Test `--depends-on` adds dependencies
    - Test `--json` outputs valid JSON

16. **Implement src/cli/commands/add.ts**

17. **Write tests/cli/show.test.ts**
    - Test displays fuda details
    - Test prefix matching works
    - Test `--json` outputs valid JSON
    - Test error on not found

18. **Implement src/cli/commands/show.ts**

19. **Write remaining CLI tests and implementations**
    - remove, ready, status, deps subcommands

### Phase 4: Import Command

20. **Write tests/cli/import.test.ts**
    - Test imports from JSON file
    - Test `--dry-run` doesn't modify DB
    - Test validates JSON structure

21. **Implement src/cli/commands/import.ts**

## Files to Create

| File | Purpose |
|------|---------|
| `tsconfig.json` | TypeScript configuration |
| `src/types/index.ts` | Type definitions |
| `src/db/index.ts` | Database connection |
| `src/db/migrations.ts` | Migration runner |
| `src/db/fuda.ts` | Fuda CRUD |
| `src/db/dependencies.ts` | Dependency operations |
| `src/utils/id.ts` | ID generation |
| `src/utils/output.ts` | Output formatting |
| `src/utils/display-id.ts` | Display ID logic |
| `src/cli/index.ts` | CLI entry point |
| `src/cli/commands/init.ts` | Init command |
| `src/cli/commands/add.ts` | Add command |
| `src/cli/commands/show.ts` | Show single fuda |
| `src/cli/commands/remove.ts` | Remove command |
| `src/cli/commands/ready.ts` | Ready command |
| `src/cli/commands/status.ts` | Status command |
| `src/cli/commands/deps/index.ts` | Deps subcommand |
| `src/cli/commands/deps/tree.ts` | Deps tree |
| `src/cli/commands/deps/blocked.ts` | Deps blocked |
| `src/cli/commands/deps/add.ts` | Deps add |
| `src/cli/commands/deps/remove.ts` | Deps remove |
| `src/cli/commands/import.ts` | Import command |
| `tests/utils/id.test.ts` | ID generation tests |
| `tests/utils/display-id.test.ts` | Display ID tests |
| `tests/db/migrations.test.ts` | Migration tests |
| `tests/db/fuda.test.ts` | Fuda CRUD tests |
| `tests/db/dependencies.test.ts` | Dependency tests |
| `tests/cli/init.test.ts` | Init command tests |
| `tests/cli/add.test.ts` | Add command tests |
| `tests/cli/show.test.ts` | Show command tests |
| `tests/cli/remove.test.ts` | Remove command tests |
| `tests/cli/ready.test.ts` | Ready command tests |
| `tests/cli/deps.test.ts` | Deps command tests |
| `tests/cli/import.test.ts` | Import command tests |

## Migration Format (Embedded)

Migrations are embedded in code for bundle compatibility:

```
src/db/migrations/
├── all.ts            # Exports allMigrations array
├── 0001_init.ts      # Initial schema
└── 0002_add_foo.ts   # Future migrations
```

Each migration file:
```typescript
export const migration: Migration = {
  name: "0001_init",
  sql: `CREATE TABLE ...`
};
```

The `.shiki/` directory only contains:
- `shiki.db` - the database (migrations table tracks applied migrations)

## Running Tests

```bash
bun test                    # Run all tests
bun test tests/db           # Run database tests only
bun test tests/utils        # Run utility tests only
bun test tests/cli          # Run CLI tests only
```

## Notes

- All commands support `--json` for machine-readable output
- Prefix matching on IDs (e.g., `a1b2` matches `sk-a1b2`)
- Soft deletes by default, `hardDeleteFuda()` for permanent removal
- Readiness check: all `blocks` and `parent-child` deps must be `done`
- Tests use in-memory SQLite (`:memory:`) for isolation
