# Worktree Automation

## Overview

Automate git worktree management for parallel agent development. Agents should be able to claim a fuda and immediately start working in an isolated worktree, with simple commands to merge completed work back to main.

**Distributed-ready**: Agents can work on different machines. The only coordination guarantee is that no two agents work on the same fuda simultaneously (enforced by fuda status).

**Stateless orchestration**: An orchestrator can spawn and monitor multiple agents, but holds no internal state. All context is derivable from fuda + ledger + git state, allowing any agent to pick up any fuda at any time.

## Design Decisions

### Worktree Location: `.worktrees/{fuda-id}`

Worktrees live in `.worktrees/` at project root, named by fuda ID.

```
.worktrees/
  sk-a1b2/    # worktree for fuda sk-a1b2
  sk-c3d4/    # worktree for fuda sk-c3d4
```

- `.worktrees/` is gitignored (already done)
- Naming by fuda ID keeps mapping simple and discoverable
- One worktree per fuda (no sharing)

### Branch Naming: `{fuda-id}/{slug}`

Branches follow pattern `sk-a1b2/some-task-slug` where slug is derived from fuda title.

- Keeps branches organized and traceable
- Easy to identify which fuda a branch belongs to
- Slug is kebab-cased, truncated to 30 chars

### Why Fuda-based, Not PRD-based

Considered organizing worktrees by PRD (one branch per feature), but this doesn't work for distributed agents:

| Scenario | Problem with PRD-based |
|----------|----------------------|
| 2 agents, same PRD, different machines | Race condition on shared branch |
| Agent A finishes before Agent B | Who owns the PRD branch? |
| Partial PRD completion | Merge timing unclear |

**Fuda-based branches require no coordination** - each agent works independently, merges independently. PRD grouping lives in metadata, not git structure.

### PRD Traceability (Without PRD Branches)

PRDs are tracked through metadata and conventions, not branch structure:

| Layer | How PRD is tracked |
|-------|-------------------|
| Commit message | `feat(prd-id): description [sk-xxxx]` |
| Fuda metadata | `prd_id` field in database |
| CLI | `shiki prd show <id>` lists all related fuda |
| Review | Human batches merges by PRD if desired |

### Symlinks for Shared State

Worktrees need access to `.shikigami/` for CLI to work. Created via symlink:

```bash
ln -s ../../.shikigami .shikigami
```

This shares:
- Database (fuda state)
- PRD files
- Agent instructions

### Fuda Selection: Interactive by Default

`shiki work` without arguments shows an interactive picker of ready fudas. Explicit ID skips picker.

```bash
# Interactive - shows ready fudas, user picks
shiki work

# Explicit - skip picker
shiki work sk-a1b2
```

### Merge Flow: Manual with Review

Agent marks fuda as `done`, human reviews and runs `shiki merge`:

1. Agent completes work, commits, runs `shiki finish sk-a1b2`
2. Human reviews changes: `git diff main...sk-a1b2/slug`
3. Human merges: `shiki merge sk-a1b2`
4. Worktree and branch auto-cleanup on successful merge

### Cleanup: Automatic After Merge

After successful merge, `shiki merge` automatically:
1. Removes the worktree (`git worktree remove`)
2. Deletes the branch (`git branch -d`)
3. Deletes remote branch if pushed (`git push origin --delete`)

Failed merges leave everything in place for manual resolution.

### Distributed Workflow (Remote Branches)

When agents work on different machines, branches must be pushed to a shared remote:

```bash
# Agent on Machine A
shiki work sk-a1b2
cd .worktrees/sk-a1b2
# ... work ...
git push -u origin sk-a1b2/add-login
shiki finish sk-a1b2

# Human (or CI) merges from any machine
git fetch origin
shiki merge sk-a1b2
```

The `shiki work` command detects if a remote branch already exists (another machine started work) and fetches it instead of creating fresh.

### Commit Message Convention

To maintain PRD traceability in git history:

```
feat(<prd-id>): <description>

<body>

Fuda: sk-xxxx
```

Example:
```
feat(2025-01-09_auth-feature): add login endpoint

Implements POST /auth/login with JWT token response.

Fuda: sk-a1b2
```

The `shiki finish` command can optionally validate/suggest this format.

### Stateless Orchestration

The orchestrator (`shiki orchestrate`) coordinates multiple agents without holding internal state.

**Core principle**: All state is derived from external sources each poll cycle:

| State | Source | Query |
|-------|--------|-------|
| Fuda assigned? | `fuda.status = in_progress` | DB |
| Agent running? | tmux session `shiki-{fuda-id}` exists | `tmux has-session` |
| Previous attempts? | `fuda.retry_count` | DB |
| What happened before? | `fuda_ledger` entries | DB |
| Uncommitted work? | `git status` in worktree | Git |

**Why stateless?**
- User can manually start agents without orchestrator
- Orchestrator can restart without losing track of agents
- Any agent can pick up any fuda with full context
- No coordination required between orchestrator and manual workflows

### Agent Context Generation

When `shiki work` runs, it generates `AGENT_CONTEXT.md` in the worktree:

```markdown
# Assignment: sk-a1b2

## Fuda
Title: Add user authentication
Priority: p3
Status: in_progress
Retry count: 2

## PRD
[Full PRD content if linked]

## Ledger History

### Learnings
- 2025-01-10 10:15: "The /auth endpoint expects JSON body, not form data"
- 2025-01-10 10:32: "JWT secret is in .env.local"

### Previous Crashes
- 2025-01-10 09:45: Agent terminated unexpectedly. Uncommitted changes present.
- 2025-01-10 10:40: Agent terminated unexpectedly. No uncommitted changes.

### Handoffs
[From predecessor fudas if any]

## Git State
Branch: sk-a1b2/add-user-auth
Uncommitted changes: YES (run `git status` to see)

## Instructions
1. This fuda has crashed 2 times before. Proceed carefully.
2. Check existing code before making changes.
3. Write learnings as you discover things: `shiki ledger add learning "..."`
4. When done: `shiki finish sk-a1b2`
```

This file is regenerated on each `shiki work` invocation, ensuring agents always have current context.

### Continuous Learning

Agents write learnings throughout their work (not just at completion):

```bash
# Agent discovers something useful
shiki ledger add learning "The API rate limits at 100 req/min"

# Agent makes a decision
shiki ledger add learning "Chose bcrypt over argon2 - wider support"

# Agent encounters a gotcha
shiki ledger add learning "Must run migrations before tests"
```

Learnings persist across crashes. Next agent reads all accumulated learnings.

### Crash Detection and Recovery

**Detection** (stateless): Each poll cycle, orchestrator checks:
- Get all `in_progress` fudas from DB
- Get all `shiki-*` sessions from tmux
- If fuda is `in_progress` but no matching session → crash detected

**Recovery flow**:
```
On crash detected for sk-a1b2:
│
├─ 1. Capture available context
│     └─ git diff in worktree (uncommitted changes)
│
├─ 2. Write crash entry to ledger
│     └─ Entry type: "crash"
│     └─ Content: timestamp, has_uncommitted_changes
│
├─ 3. Increment retry count
│     └─ UPDATE fuda SET retry_count = retry_count + 1
│
├─ 4. Decide fate
│     ├─ retry_count >= max_retries (default 3)?
│     │   └─ Mark failed, notify user (critical)
│     └─ retry_count < max_retries?
│         └─ Reset to ready, notify user (info)
│
└─ 5. Leave worktree as-is
      └─ Next agent inherits git state
```

**New ledger entry type**: `crash`
```typescript
export enum EntryType {
  HANDOFF = "handoff",
  LEARNING = "learning",
  CRASH = "crash",  // NEW
}
```

### Attention Notifications

Uses Claude Code hooks (no orchestrator state needed):

```json
// .claude/settings.local.json (generated per worktree)
{
  "hooks": {
    "Notification": [
      {
        "matcher": "permission_prompt",
        "hooks": [{
          "type": "command",
          "command": "shiki notify --fuda sk-a1b2 --type permission"
        }]
      },
      {
        "matcher": "idle_prompt",
        "hooks": [{
          "type": "command",
          "command": "shiki notify --fuda sk-a1b2 --type idle"
        }]
      }
    ]
  }
}
```

Notification types:
- `permission_prompt`: Agent needs user input for tool permission
- `idle_prompt`: Agent idle for 60+ seconds (waiting for input)

### Worktree Deletion Safety

**Problem**: If agent's shell is in worktree when it's deleted, session crashes.

**Solution**: `shiki merge` and `shiki cleanup` check for active sessions:
```bash
$ shiki merge sk-a1b2
Error: tmux session 'shiki-sk-a1b2' is still active.
Either attach and exit the agent, or run: shiki cleanup --force sk-a1b2
```

## CLI Commands

### `shiki work [fuda-id]`

Creates worktree and starts work on a fuda.

```bash
# Interactive selection
$ shiki work
Ready fuda:
  1. sk-a1b2  [p5]  "Add user authentication"
  2. sk-c3d4  [p3]  "Fix pagination bug"
  3. sk-e5f6  [p1]  "Update README"

Select fuda (1-3): 1

Created worktree: .worktrees/sk-a1b2
Branch: sk-a1b2/add-user-authentication
Status: in_progress

To start working:
  cd .worktrees/sk-a1b2

# Explicit selection
$ shiki work sk-a1b2
Created worktree: .worktrees/sk-a1b2
Branch: sk-a1b2/add-user-authentication
Status: in_progress
```

**Steps performed:**
1. Validates fuda is `ready` (or promotes from `pending` if deps satisfied)
2. Creates branch `{fuda-id}/{slug}` from current HEAD
3. Creates worktree at `.worktrees/{fuda-id}`
4. Creates `.shikigami` symlink in worktree
5. Updates fuda status to `in_progress`

**Errors:**
- Fuda not found
- Fuda not ready (show blocking deps)
- Worktree already exists (offer to resume)

### `shiki merge <fuda-id>`

Merges completed fuda work back to main.

```bash
$ shiki merge sk-a1b2
Merging sk-a1b2/add-user-authentication into main...

Merge successful.
Removed worktree: .worktrees/sk-a1b2
Deleted branch: sk-a1b2/add-user-authentication
```

**Steps performed:**
1. Validates fuda is `done` or `in_review`
2. Validates we're on main branch (or target branch)
3. Runs `git merge {branch}`
4. On success: removes worktree and deletes branch
5. On conflict: aborts and shows instructions

**Errors:**
- Fuda not done (must `shiki finish` first)
- Merge conflicts (leaves state for manual resolution)
- Not on main branch

### `shiki worktrees`

Lists active worktrees and their fuda status.

```bash
$ shiki worktrees
Active worktrees:
  sk-a1b2  in_progress  "Add user authentication"
           .worktrees/sk-a1b2 -> sk-a1b2/add-user-auth
  sk-c3d4  done         "Fix pagination bug"
           .worktrees/sk-c3d4 -> sk-c3d4/fix-pagination
           Ready to merge: shiki merge sk-c3d4

No worktrees: 2 ready fuda available (shiki work)
```

### `shiki cleanup [fuda-id]`

Manually removes a worktree without merging (for abandoned work).

```bash
$ shiki cleanup sk-a1b2
This will delete the worktree and branch WITHOUT merging.
Fuda status will be reset to 'ready'.

Confirm? [y/N]: y

Removed worktree: .worktrees/sk-a1b2
Deleted branch: sk-a1b2/add-user-authentication
Fuda sk-a1b2 status: ready
```

### `shiki orchestrate`

Starts the orchestrator to automatically spawn and monitor agents.

```bash
# Start orchestrator (foreground)
$ shiki orchestrate
Orchestrator started. Max agents: 4
Polling every 5s...

[10:00:05] Found 3 ready fudas, 0 active agents
[10:00:05] Spawning agent for sk-a1b2 "Add user auth"
[10:00:06] Spawning agent for sk-c3d4 "Fix pagination"
[10:00:07] Spawning agent for sk-e5f6 "Update README"
[10:00:10] Agent sk-e5f6 needs attention (permission_prompt)
[10:05:15] Agent sk-e5f6 completed (done)
[10:05:15] Cleaned up session shiki-sk-e5f6
...

# With options
$ shiki orchestrate --max-agents 2 --max-retries 5

# Stop with Ctrl+C (graceful shutdown)
^C
Orchestrator stopping...
Active agents will continue running.
```

**Orchestrator loop** (every 5s):
1. Query DB for ready fudas
2. Query tmux for active `shiki-*` sessions
3. Spawn agents for ready fudas (up to `--max-agents`)
4. Detect crashes (in_progress fuda without session)
5. Handle crashes (retry or fail)
6. Clean up completed sessions (done/in_review fudas)

**Options:**
- `--max-agents <n>`: Maximum concurrent agents (default: 4)
- `--max-retries <n>`: Max crash retries before failing fuda (default: 3)
- `--poll-interval <ms>`: Poll interval in milliseconds (default: 5000)

### `shiki agents`

Lists active agent sessions.

```bash
$ shiki agents
Active agents:
  sk-a1b2  running    "Add user authentication"    tmux: shiki-sk-a1b2
  sk-c3d4  ATTENTION  "Fix pagination bug"         tmux: shiki-sk-c3d4
  sk-e5f6  running    "Update README"              tmux: shiki-sk-e5f6

Attach: shiki attach <fuda-id>
```

### `shiki attach <fuda-id>`

Attaches to an agent's tmux session.

```bash
$ shiki attach sk-a1b2
# Runs: tmux attach -t shiki-sk-a1b2
```

### `shiki notify`

Sends desktop notification (called by Claude Code hooks).

```bash
# Called by hooks, not typically run manually
$ shiki notify --fuda sk-a1b2 --type permission
# macOS: osascript -e 'display notification ...'
# Linux: notify-send "Shikigami" "sk-a1b2 needs permission"
```

## Agent Workflow (Updated)

### Local Agent (Single Machine)

```bash
# 1. Get a task and start working (creates worktree)
cd /project
shiki work sk-a1b2
cd .worktrees/sk-a1b2

# 2. Do the work, commit with PRD-traceable message
# ... implement feature ...
git add . && git commit -m "feat(2025-01-09_auth): add login endpoint

Fuda: sk-a1b2"

# 3. Mark complete
shiki finish sk-a1b2

# 4. (Human) Review and merge
cd /project
git diff main...sk-a1b2/add-login
shiki merge sk-a1b2
```

### Distributed Agent (Multiple Machines)

```bash
# 1. Agent claims fuda, creates worktree
shiki work sk-a1b2
cd .worktrees/sk-a1b2

# 2. Work and commit
git add . && git commit -m "feat(2025-01-09_auth): add login endpoint

Fuda: sk-a1b2"

# 3. Push to remote before finishing
git push -u origin sk-a1b2/add-login

# 4. Mark complete
shiki finish sk-a1b2

# 5. (Human/CI on any machine) Merge
git fetch origin
shiki merge sk-a1b2
```

### Orchestrated Workflow (Multiple Parallel Agents)

```bash
# 1. Human starts orchestrator
$ shiki orchestrate --max-agents 4
Orchestrator started. Polling every 5s...

# 2. Orchestrator automatically:
#    - Finds ready fudas
#    - Creates worktrees
#    - Spawns tmux sessions with claude
#    - Generates AGENT_CONTEXT.md per agent

[10:00:05] Spawning agent for sk-a1b2 "Add user auth"
[10:00:06] Spawning agent for sk-c3d4 "Fix pagination"

# 3. Agents work autonomously, writing learnings as they go
#    Inside each agent session:
#    shiki ledger add learning "Found that API needs auth header"

# 4. Desktop notification when agent needs attention
#    (triggered by Claude Code hooks)
🔔 "sk-a1b2 needs permission"

# 5. Human attaches to help
$ shiki attach sk-a1b2
# ... approve permission, detach ...

# 6. Agent completes, runs shiki finish
[10:15:30] Agent sk-a1b2 completed (done)

# 7. If agent crashes, orchestrator handles it
[10:20:00] Agent sk-c3d4 crashed (attempt 1/3)
[10:20:00] Resetting sk-c3d4 to ready...
[10:20:05] Spawning agent for sk-c3d4 (retry)
#          New agent gets crash context via AGENT_CONTEXT.md

# 8. Human reviews and merges completed work
$ shiki agents
  sk-a1b2  done  "Add user auth"  Ready to merge

$ shiki merge sk-a1b2
Merged. Cleaned up worktree and session.
```

### Agent Self-Recovery (Manual Start After Crash)

```bash
# If user manually starts an agent for a previously crashed fuda:
$ shiki work sk-c3d4

Fuda sk-c3d4 has crashed 2 times before.
Worktree exists with uncommitted changes.

Options:
  1. Resume (keep changes, new agent)
  2. Reset (discard changes, fresh start)
  3. Cancel

Select [1-3]: 1

Starting agent with existing worktree...
# Agent reads AGENT_CONTEXT.md which includes:
# - All previous learnings
# - Crash history
# - Instruction to proceed carefully
```

## Out of Scope

- GitHub PR integration (deferred - can add later)
- PRD-based branches (see "Why Fuda-based" rationale)
- Multiple worktrees per fuda
- Custom worktree paths
- Automatic conflict resolution
- Automatic `git push` (agent decides when to push)
- Orchestrator-held state (must remain stateless)
- Dynamic resource monitoring (use `--max-agents` cap instead)

## Open Questions

### Worktree Management
1. **Resume behavior**: If worktree exists, should `shiki work` just print cd instructions, or offer to reset?
2. **Main branch detection**: Hardcode `main`, or detect from `git symbolic-ref refs/remotes/origin/HEAD`?
3. **Dirty worktree handling**: Block merge if uncommitted changes in worktree?
4. **Remote branch exists**: If `shiki work` finds existing remote branch, auto-fetch or prompt?

### Orchestration
5. **Pre-spawn resource check**: Check free memory before spawning agent? (e.g., require >1GB free)
6. **Crash notification level**: Notify on every crash, or only when max retries exceeded?
7. **Agent spawn method**: Use `claude` CLI directly, or wrap in a script that sets up hooks first?
8. **Session cleanup timing**: Clean up session immediately when fuda done, or wait for next poll cycle?

## Fuda

### Worktree Commands
- [ ] Add `shiki work` command - interactive fuda picker, worktree creation, symlink setup, AGENT_CONTEXT.md generation, remote branch detection
- [ ] Add `shiki merge` command - merge branch to main, auto-cleanup worktree + local branch + remote branch, check for active sessions
- [ ] Add `shiki worktrees` command - list active worktrees with fuda status
- [ ] Add `shiki cleanup` command - remove worktree without merge, reset fuda status, `--force` to kill session

### Orchestration Commands
- [ ] Add `shiki orchestrate` command - main orchestrator loop, spawn agents, detect crashes, handle retries
- [ ] Add `shiki agents` command - list active agent sessions with status
- [ ] Add `shiki attach` command - attach to agent tmux session
- [ ] Add `shiki notify` command - send desktop notification (for hooks)

### Schema & Infrastructure
- [ ] Add `crash` entry type to ledger (migration + code)
- [ ] Add AGENT_CONTEXT.md generation utility - assembles fuda, PRD, ledger, git state
- [ ] Add Claude Code hooks configuration generation per worktree
- [ ] Add slug generation utility - kebab-case title, 30 char limit

### Documentation
- [ ] Update AGENT_INSTRUCTIONS.md with worktree workflow (local + distributed)
- [ ] Update AGENT_INSTRUCTIONS.md with continuous learning workflow
- [ ] Add `.worktrees/` to default gitignore in `shiki init`
- [ ] Add commit message convention docs (PRD traceability)

