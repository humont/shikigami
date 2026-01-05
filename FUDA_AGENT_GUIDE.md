# Using Fuda for Coding Agents

Fuda is a task management system designed for AI coding agents to work in parallel. The name "Fuda" (札) refers to Japanese paper talismans - here representing discrete units of work that "spirits" (AI agents) can pick up and complete.

## Core Concepts

### Fuda
A **fuda** is a task unit containing:
- **title**: Brief description of the task
- **description**: Detailed requirements and context
- **status**: Current state (`pending`, `ready`, `in_progress`, `in_review`, `blocked`, `failed`, `done`)
- **priority**: Numeric priority (higher = more important)
- **spiritType**: Agent type suited for the task (`shikigami`, `tengu`, `kitsune`)

### Spirit Types
- **shikigami**: General-purpose agents for standard coding tasks
- **tengu**: Specialized agents (e.g., architecture, complex refactoring)
- **kitsune**: Agents for tricky or creative problem-solving

### Dependencies
Fuda can have dependencies that control execution order:
- **blocks**: Task A must complete before task B can start
- **parent-child**: Hierarchical relationship
- **related**: Informational link (non-blocking)
- **discovered-from**: Task was discovered during work on another

## Agent Workflow

### 1. Initialize the Project
```bash
shiki init
```
Creates a `.shiki/shiki.db` SQLite database in your project.

### 2. Check What's Ready to Work On
```bash
shiki ready --json
```
Returns tasks that:
- Have status `ready`
- Have no unfinished blocking dependencies
- Are ordered by priority (highest first)

Example response:
```json
[
  {
    "id": "sk-a1b2c3",
    "displayId": "PRD-001/1",
    "title": "Implement user authentication",
    "description": "Add login/logout functionality...",
    "status": "ready",
    "spiritType": "shikigami",
    "priority": 10
  }
]
```

### 3. Claim a Task
When an agent picks up a task, update its status to `in_progress` and assign the agent:

```bash
# Via the database directly (programmatic access)
UPDATE fuda SET status = 'in_progress', assigned_spirit_id = 'agent-123' WHERE id = 'sk-a1b2c3'
```

### 4. Work on the Task
The agent should:
1. Read the task description
2. Implement the required changes
3. Test the implementation
4. Create a commit with the changes

### 5. Complete or Fail the Task
On success:
```bash
UPDATE fuda SET status = 'done', output_commit_hash = 'abc123' WHERE id = 'sk-a1b2c3'
```

On failure:
```bash
UPDATE fuda SET status = 'failed', failure_context = 'Error message...' WHERE id = 'sk-a1b2c3'
```

### 6. Check for Newly Ready Tasks
After completing a task, dependent tasks may become unblocked:
```bash
shiki ready --json
```
The system automatically promotes `pending` tasks to `ready` when their dependencies are satisfied.

## CLI Reference for Agents

### Adding Tasks
```bash
shiki add \
  -t "Implement feature X" \
  -d "Detailed description of what needs to be done" \
  --priority 5 \
  --spirit-type shikigami \
  --depends-on sk-xyz123 \
  --json
```

### Viewing a Task
```bash
shiki show sk-a1b2c3 --json
```

### Checking Dependencies
```bash
# See what's blocking a task
shiki deps blocked sk-a1b2c3 --json

# View full dependency tree
shiki deps tree sk-a1b2c3 --json
```

### System Status
```bash
shiki status --json
```
Returns counts by status:
```json
{
  "pending": 5,
  "ready": 2,
  "inProgress": 1,
  "inReview": 0,
  "blocked": 3,
  "failed": 0,
  "done": 10,
  "total": 21
}
```

## Integration Pattern for Coding Agents

```
┌─────────────────────────────────────────────────────────────┐
│                     Agent Loop                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. GET READY TASK                                          │
│     └─> shiki ready --json --limit 1                        │
│                                                             │
│  2. CLAIM TASK                                              │
│     └─> Update status to 'in_progress'                      │
│                                                             │
│  3. EXECUTE TASK                                            │
│     ├─> Read codebase                                       │
│     ├─> Make changes                                        │
│     ├─> Run tests                                           │
│     └─> Create commit                                       │
│                                                             │
│  4. REPORT RESULT                                           │
│     ├─> Success: status = 'done', save commit hash          │
│     └─> Failure: status = 'failed', save error context      │
│                                                             │
│  5. DISCOVER NEW TASKS (optional)                           │
│     └─> shiki add ... --depends-on <current-task>           │
│                                                             │
│  6. LOOP                                                    │
│     └─> Go to step 1                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Best Practices

1. **Always use `--json` flag** for programmatic access
2. **Check dependencies** before starting work to understand context
3. **Record failure context** when tasks fail to help with retries
4. **Discover sub-tasks** during implementation and add them with proper dependencies
5. **Use priorities** to ensure critical path items get worked on first
6. **Match spirit types** to agent capabilities for optimal task assignment

## ID Formats

- **Internal ID**: `sk-{6-char-alphanumeric}` (e.g., `sk-a1b2c3`)
- **Display ID**: `{PRD-ID}/{sequence}` (e.g., `PRD-001/1.2` for nested tasks)
- IDs can be referenced by prefix for convenience (e.g., `a1b2` matches `sk-a1b2c3`)

## Database Location

The Fuda database is stored at `.shiki/shiki.db` in your project root. It's a SQLite database that can be accessed directly for advanced operations.
