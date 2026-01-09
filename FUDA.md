# Fuda - Task Management System

*Fuda (札) are paper talismans used by Onmyoji to command spirits*

---

## Overview

Fuda are work units that spirits execute. Each fuda represents a **declarative requirement**—a task or feature to implement—not procedural logic. Fuda form a dependency graph where work flows from independent fuda to dependent ones. The Onmyoji orchestrator polls for ready fuda and dispatches spirits to complete them.

**Key principle:** The dependency graph describes *what* must be done and *what blocks what*. It does not encode *how* to handle failures, retries, or alternative approaches. That intelligence belongs to the spirits, not the data model.

---

## Data Model

### Fuda

| Field              | Type       | Description                                                       |
| ------------------ | ---------- | ----------------------------------------------------------------- |
| `id`               | string     | Primary key. Short hash format: `sk-a1b2`                         |
| `displayId`        | string?    | Hierarchical ID: `prd-xxxx.1.2` (PRD -> fuda 1 -> subfuda 2)      |
| `prdId`            | string     | Reference to parent PRD                                           |
| `title`            | string     | Short name                                                        |
| `description`      | string     | Full details of work to be done                                   |
| `status`           | FudaStatus | Current lifecycle state                                           |
| `spiritType`       | string     | Which spirit type executes this (`shikigami`, `tengu`, `kitsune`) |
| `assignedSpiritId` | string?    | ID of spirit currently working on it                              |
| `outputCommitHash` | string?    | Git commit SHA after completion                                   |
| `retryCount`       | number     | Times this fuda has been retried                                  |
| `failureContext`   | string?    | Error context from last failure                                   |
| `parentFudaId`     | string?    | Parent fuda (for hierarchy)                                       |
| `priority`         | number     | Higher = more important (affects ordering)                        |
| `createdAt`        | Date       | When created                                                      |
| `updatedAt`        | Date       | Last modification                                                 |
| `deletedAt`        | Date?      | Soft delete timestamp (tombstone)                                 |
| `deletedBy`        | string?    | Who deleted it                                                    |
| `deleteReason`     | string?    | Why it was deleted                                                |

### FudaStatus

```
blocked      -> Not ready (has unmet dependencies or manually blocked)
ready        -> All dependencies met, can be picked up by a spirit
in_progress  -> Currently being worked on
in_review    -> Work done, awaiting tengu review
failed       -> Failed after max retries
done         -> Successfully completed
```

### Lifecycle

```
                    +-------------+
                    |   blocked   |
                    +------+------+
                           | (all deps done)
                           v
                    +-------------+
         +----------|    ready    |<-------------+
         |          +------+------+              |
         |                 | (spirit claims)     |
         |                 v                     |
         |          +-------------+              |
         |          | in_progress |--------------+ (retry)
         |          +------+------+              |
         |                 |                     |
         |        +--------+--------+            |
         |        v        v        v            |
         |   +--------+ +------+ +--------+      |
         +---|in_review| | done | | failed |-----+
             +----+---+ +------+ +--------+
```

---

## Dependencies

### Dependency Types

| Type              | Blocks Ready?    | Use Case                                |
| ----------------- | ---------------- | --------------------------------------- |
| `blocks`          | Yes              | "Cannot start X until Y is done"        |
| `parent-child`    | Yes (transitive) | Hierarchical organization, subfuda      |
| `related`         | No               | Cross-reference, informational link     |
| `discovered-from` | No               | Audit trail when tengu creates fix fuda |

### FudaDependency

| Field         | Type           | Description                      |
| ------------- | -------------- | -------------------------------- |
| `fudaId`      | string         | The fuda that has the dependency |
| `dependsOnId` | string         | The fuda it depends on           |
| `type`        | DependencyType | Relationship type                |

### Readiness Logic

A fuda becomes `ready` when:
1. Its status is `blocked`
2. ALL `blocks` dependencies have status `done`
3. ALL `parent-child` ancestors have status `done` (transitive)

Non-blocking types (`related`, `discovered-from`) do not affect readiness.

---

## ID System

### Primary ID (Short Hash)

Format: `sk-{4-6 chars}`

- Generated from UUID, converted to base64, truncated
- Collision-resistant: checks existing IDs, extends length if needed
- Human-typeable: `shiki possess a1b2` instead of full UUID

### Display ID (Hierarchical)

Format: `{prd-id}.{n}.{m}`

- Auto-generated based on PRD and parent relationships
- Examples:
  - `prd-a1b2.1` - First fuda under PRD prd-a1b2
  - `prd-a1b2.1.3` - Third subfuda under fuda 1
  - `prd-a1b2.2` - Second fuda under same PRD

### Prefix Matching

All commands accept partial IDs:
- `a1b2` matches `sk-a1b2`
- `prd-a1b2.1` matches by displayId
- Ambiguous matches return error with candidates

---

## Soft Deletes

Fuda are never hard-deleted by default. Instead, tombstone fields are set:

```
deleted_at    = current timestamp
deleted_by    = who deleted (optional)
delete_reason = why (optional)
```

### Behavior

- All queries filter `WHERE deleted_at IS NULL` by default
- `restoreFuda(id)` clears tombstone fields
- `hardDeleteFuda(id)` permanently removes (use with caution)
- `getDeletedFuda()` returns all soft-deleted fuda for audit

---

## CLI Commands

### Query Commands

```bash
# List fuda ready to work on
shiki ready [--limit N] [--all] [--json]

# Show current status
shiki status [--json]
```

### Fuda Management

```bash
# Create a fuda
shiki add -t "Title" -d "Description" \
  [-s spirit-type] \
  [-p priority] \
  [--depends-on id1,id2] \
  [--dep-type blocks|parent-child|related|discovered-from] \
  [--prd prd-id] \
  [--json]

# Remove a fuda (soft delete)
shiki remove <id> [-f|--force] [--json]
```

### Status Shortcuts

Convenient commands for common status transitions:

```bash
# Start working on a fuda (sets status to in_progress)
shiki start <id> [--assigned-spirit-id <spirit>] [--json]

# Mark fuda as finished (sets status to done)
shiki finish <id> [--json]

# Mark fuda as failed (sets status to failed)
shiki fail <id> [--json]

# General status update (for other statuses like blocked, in_review)
shiki update <id> -s <status> [--assigned-spirit-id <spirit>] [--json]
```

### Dependency Management

```bash
# Show what a fuda depends on (tree view)
shiki deps tree <id> [--depth N] [--json]

# Show what's blocking a fuda
shiki deps blocked <id> [--json]

# Add a dependency
shiki deps add <fuda-id> <depends-on-id> [-t type] [--json]

# Remove a dependency
shiki deps remove <fuda-id> <depends-on-id> [--json]
```

### Import

```bash
# Import fuda from JSON file
shiki import <file.json> [--dry-run] [--json]
```

---

## Database Functions

### CRUD

```typescript
createFuda(title, description, spiritType?, priority?, prdId?, parentFudaId?): Fuda
getFuda(id, includeDeleted?): Fuda | null
getFudaByPrd(prdId): Fuda[]
getFudaByStatus(status): Fuda[]
getReadyFuda(limit?): Fuda[]
findFudaByPrefix(prefix, includeDeleted?): Fuda | null
findFudasByPrefix(prefix, includeDeleted?): Fuda[]
```

### Status Updates

```typescript
updateFudaStatus(id, status): void      // Also triggers ready check
updateFudaAssignment(id, spiritId): void
updateFudaCommit(id, commitHash): void
updateFudaFailureContext(id, context): void
incrementFudaRetry(id): number
```

### Dependencies

```typescript
addFudaDependency(fudaId, dependsOnId, type?): void
removeFudaDependency(fudaId, dependsOnId): void
getFudaDependencies(fudaId): string[]           // Just IDs
getFudaDependenciesFull(fudaId): FudaDependency[] // Full objects
getBlockingDependencies(fudaId): FudaDependency[] // Only blocking types
getFudaDependents(fudaId): string[]             // What depends on this
areAllDependenciesDone(fudaId): boolean
updateReadyFuda(): number                       // Batch update blocked->ready
```

### Soft Delete

```typescript
deleteFuda(id, {deletedBy?, reason?}): boolean  // Soft delete
restoreFuda(id): boolean                        // Undo soft delete
hardDeleteFuda(id): boolean                     // Permanent delete
getDeletedFuda(): Fuda[]                        // Audit trail
```

---

## JSON Output Format

All commands support `--json` for programmatic access:

```json
{
  "id": "sk-a1b2",
  "displayId": "prd-c3d4.1",
  "title": "Implement feature X",
  "description": "Full description...",
  "status": "ready",
  "spiritType": "shikigami",
  "priority": 10,
  "prdId": "prd-c3d4",
  "parentFudaId": null,
  "dependencies": [
    {"id": "sk-e5f6", "type": "blocks"}
  ],
  "createdAt": "2026-01-05T14:00:00.000Z",
  "updatedAt": "2026-01-05T14:00:00.000Z",
  "deletedAt": null,
  "deletedBy": null,
  "deleteReason": null
}
```

---

## Schema (SQLite)

```sql
CREATE TABLE fuda (
  id TEXT PRIMARY KEY,
  display_id TEXT,
  prd_id TEXT REFERENCES prds(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'blocked',
  spirit_type TEXT NOT NULL DEFAULT 'shikigami',
  assigned_spirit_id TEXT,
  output_commit_hash TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  failure_context TEXT,
  parent_fuda_id TEXT REFERENCES fuda(id),
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  deleted_by TEXT,
  delete_reason TEXT
);

CREATE TABLE fuda_dependencies (
  fuda_id TEXT NOT NULL REFERENCES fuda(id) ON DELETE CASCADE,
  depends_on_id TEXT NOT NULL REFERENCES fuda(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL DEFAULT 'blocks',
  PRIMARY KEY (fuda_id, depends_on_id)
);

CREATE INDEX idx_fuda_status ON fuda(status);
CREATE INDEX idx_fuda_prd_id ON fuda(prd_id);
CREATE INDEX idx_fuda_priority ON fuda(priority DESC);
CREATE INDEX idx_deps_type ON fuda_dependencies(dependency_type);
```
