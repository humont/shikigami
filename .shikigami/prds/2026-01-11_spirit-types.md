# Spirit Types

## Overview

Design a system of specialized AI agents (spirits) that users can summon to assist with different phases of software development. All spirits are shikigami (式神 - servant spirits) with different roles.

**Core principle**: Everything works from Fuda. The output of any task is either more Fuda, or nothing. No Fuda = no work.

**Handoff model**: All spirit invocations are manual. A human uses the CLI to summon a spirit to work on a task.

The spirits work together in a TDD-driven workflow:

```
prd → task → test → code → review
 ↓      ↓                     ↓
(PRD) (Fuda)           (Fuda or nothing)
```

## Spirit Definitions

### 1. prd

**Role**: Socratic dialog to help users create high-quality Product Requirements Documents.

**Capabilities**:
- Asks probing questions to clarify requirements
- Identifies edge cases and ambiguities
- Helps structure requirements clearly
- Suggests acceptance criteria

**Constraints**:
- Cannot write code
- Cannot create Fuda directly
- Must produce a markdown PRD as output

**Output**: PRD markdown file in `.shikigami/prds/`

---

### 2. task

**Role**: Transform a PRD into a dependency-ordered graph of Fuda.

**Capabilities**:
- Breaks down requirements into atomic, executable tasks
- Identifies dependencies between tasks
- Assigns appropriate spirit types to each task
- Estimates complexity/size

**Constraints**:
- Requires a PRD as input
- Tasks must be small enough for a single work session
- Must produce valid dependency graph (no cycles)

**Output**: Fuda with dependencies

---

### 3. test

**Role**: Write conformance tests that verify requirements are met.

**Capabilities**:
- Writes unit, integration, and e2e tests as appropriate
- Follows "write tests, not too many, mostly integration"
- Creates test plans for human approval
- Knows when mocking is appropriate vs real dependencies

**Constraints**:
- Must interact with human to approve test plan before writing
- Cannot write implementation code
- Tests must be meaningful (not frivolous coverage)

**Output**: Test files, possibly Fuda for discovered edge cases

---

### 4. code

**Role**: Write and refactor code to fulfill task requirements.

**Capabilities**:
- Implements features to pass tests
- Refactors code for clarity, performance, or testability
- Follows codebase conventions
- Task intent drives behavior (implement vs refactor vs optimize)

**Constraints**:
- Cannot modify tests (unless explicitly tasked)
- Must ensure tests pass after changes
- Follows existing patterns in codebase

**Output**: Code changes

---

### 5. review

**Role**: Quality gate that evaluates work and files issues for improvements.

**Capabilities**:
- Reviews code for standards conformance
- Checks documentation completeness
- Identifies potential bugs or edge cases
- Presents findings to human for approval

**Constraints**:
- Cannot fix issues directly
- Must present conclusions to human before creating Fuda
- Human decides which issues (if any) become Fuda
- Must reference specific code locations

**Output**: Fuda for approved issues, or nothing if human accepts work as-is

---

## Workflow Integration

### CLI Commands

#### PRD Commands
```bash
shiki prd init <name>           # Create blank PRD file (no spirit)
shiki prd create                # PRD spirit dialog → new PRD
shiki prd continue <prd_id>     # PRD spirit dialog → refine existing PRD
shiki prd plan <prd_id>         # Task spirit → Fuda graph (one-shot, no dialog)
```

#### Work Commands
```bash
shiki summon <fuda_id>          # Work on specific fuda (uses spirit type from fuda)
shiki summon <fuda_id> --spirit <type>  # Override spirit type
shiki summon                    # Take next ready fuda, summon appropriate spirit
```

### Typical Flow

1. User runs `shiki prd create` → PRD spirit dialog → produces PRD
2. User runs `shiki prd plan <prd_id>` → Task spirit → produces Fuda graph
3. For each Fuda:
   - User runs `shiki summon` or `shiki summon <fuda_id>` → appropriate spirit works on it
   - If review spirit, human decides which findings become new Fuda
4. Repeat until no more Fuda

### Task Intent Examples

The code spirit behavior is driven by task description:

```bash
# Implementation task
shiki add "implement JWT token validation" --spirit code

# Refactor task
shiki add "refactor auth module to use dependency injection" --spirit code

# Optimization task
shiki add "optimize database queries in user service" --spirit code
```

## Fuda

- [ ] Update spirit type enum in types (prd, task, test, code, review)
- [ ] Design spirit prompt schema (capabilities, constraints)
- [ ] Implement `shiki prd create` command (PRD spirit dialog)
- [ ] Implement `shiki prd continue <prd_id>` command
- [ ] Implement `shiki prd plan <prd_id>` command (task spirit, one-shot)
- [ ] Implement `shiki summon` command (take next ready fuda)
- [ ] Implement `shiki summon <fuda_id>` command (work on specific fuda)
- [ ] Implement `--spirit` flag override for summon
- [ ] Implement test spirit planning flow with human approval
- [ ] Implement code spirit execution flow
- [ ] Implement review spirit flow with human approval gate
