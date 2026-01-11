# Remove Display IDs

## Overview

Remove the display ID feature (`prd-xxxx.1.2` format) which adds noise to output. The short fuda IDs (`sk-xxxx`) are already unique and sufficient. Instead, show the PRD reference in list output after other info.

## Motivation

Display IDs like `sk-letw (2025-01-09_prd-feature.1)` clutter the list view. The hierarchical numbering doesn't add enough value to justify the visual noise.

## Changes

### Remove display_id

- Remove `display_id` column from `fuda` table (migration)
- Remove `displayId` from `Fuda` type
- Remove display ID generation logic (`src/utils/display-id.ts`)
- Update all CLI commands that reference display IDs
- Update all tests

### Show PRD in list output

Update `shiki list` to show PRD at the end of each row:

```
sk-letw  ready    p0  Test: shiki show displays PRD info    2025-01-09_prd-feature
sk-pevw  pending  p0  Impl: shiki show displays PRD info    2025-01-09_prd-feature
sk-fbhm  ready    p0  Rename FudaStatus.PENDING
```

PRD shown after title, only if set. Keeps the ID column clean.

## Fuda

- [ ] Migration: remove display_id column from fuda table
- [ ] Remove display ID generation logic and types
- [ ] Update CLI list output to show PRD after title
- [ ] Update/remove display ID tests
