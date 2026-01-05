export const AGENT_INSTRUCTIONS_CONTENT = `# Using Fuda for Coding Agents

Fuda is a task management system designed for AI coding agents to work in parallel. The name "Fuda" (札) refers to Japanese paper talismans - here representing discrete units of work that "spirits" (AI agents) can pick up and complete.

## Quick Start

\`\`\`bash
# 1. Get the highest priority ready task
shiki ready --json --limit 1

# 2. Claim it (replace sk-xxxx with actual ID)
shiki update sk-xxxx --status in_progress --json

# 3. Do the work...

# 4. Mark complete (or failed)
shiki update sk-xxxx --status done --json

# 5. Check for next task
shiki ready --json --limit 1
\`\`\`

## Core Concepts

### Fuda
A **fuda** is a task unit containing:
- **title**: Brief description of the task
- **description**: Detailed requirements and context
- **status**: Current state (\`pending\`, \`ready\`, \`in_progress\`, \`in_review\`, \`blocked\`, \`failed\`, \`done\`)
- **priority**: Numeric priority (higher = more important)
- **spiritType**: Agent type suited for the task (\`shikigami\`, \`tengu\`, \`kitsune\`)

### Spirit Types
- **shikigami**: General-purpose agents for standard coding tasks (default)
- **tengu**: Specialized agents for architecture, complex refactoring, code review
- **kitsune**: Agents for tricky problems, creative solutions, debugging

Spirit types are hints for task routing. When picking tasks, filter by your capabilities:
\`\`\`bash
# Most agents should work on shikigami tasks
shiki list --status ready --json | jq '.[] | select(.spiritType == "shikigami")'
\`\`\`

### Dependencies
Fuda can have dependencies that control execution order:
- **blocks**: Task A must complete before task B can start
- **parent-child**: Hierarchical relationship
- **related**: Informational link (non-blocking)
- **discovered-from**: Task was discovered during work on another

## Agent Workflow

### 1. Initialize the Project
\`\`\`bash
shiki init
\`\`\`
Creates a \`.shikigami/shiki.db\` SQLite database in your project.

### 2. Check What's Ready to Work On
\`\`\`bash
shiki ready --json
\`\`\`
Returns tasks that:
- Have status \`ready\`
- Have no unfinished blocking dependencies
- Are ordered by priority (highest first)

### 3. Claim a Task
When an agent picks up a task, update its status to \`in_progress\`:
\`\`\`bash
shiki update sk-a1b2c3 --status in_progress --json

# Optionally identify yourself
shiki update sk-a1b2c3 --status in_progress --assigned-spirit-id "claude-agent-1" --json
\`\`\`

### 4. Work on the Task
The agent should:
1. Read the task description
2. Implement the required changes
3. Test the implementation
4. Create a commit with the changes

### 5. Complete or Fail the Task
On success:
\`\`\`bash
shiki update sk-a1b2c3 --status done --json
\`\`\`

On failure, mark it failed. The task can be retried later by another agent:
\`\`\`bash
shiki update sk-a1b2c3 --status failed --json
\`\`\`
Note: To record failure details, update the fuda description or add a comment in your commit.

### 6. Check for Newly Ready Tasks
After completing a task, dependent tasks may become unblocked:
\`\`\`bash
shiki ready --json
\`\`\`
The system automatically promotes \`pending\` tasks to \`ready\` when their dependencies are satisfied.

## CLI Reference for Agents

### Adding Tasks
\`\`\`bash
shiki add \\
  -t "Implement feature X" \\
  -d "Detailed description of what needs to be done" \\
  --priority 5 \\
  --spirit-type shikigami \\
  --depends-on sk-xyz123 \\
  --json
\`\`\`

### Batch Import via Stdin
For adding multiple tasks at once without temp files:
\`\`\`bash
echo '[{"title": "Task 1", "description": "First"}, {"title": "Task 2", "description": "Second"}]' | shiki import --stdin --json
\`\`\`

### Listing Tasks
\`\`\`bash
# List all tasks
shiki list --json

# Filter by status
shiki list --status ready --json
shiki list --status in_progress --json
\`\`\`

### Viewing a Task
\`\`\`bash
shiki show sk-a1b2c3 --json
\`\`\`

### Checking Dependencies
\`\`\`bash
# See what's blocking a task
shiki deps blocked sk-a1b2c3 --json

# View full dependency tree
shiki deps tree sk-a1b2c3 --json
\`\`\`

### System Status
\`\`\`bash
shiki status --json
\`\`\`

### Re-read These Instructions
\`\`\`bash
shiki agent-guide
shiki agent-guide --json  # structured format
\`\`\`

## Best Practices

1. **Always use \`--json\` flag** for programmatic access
2. **Check dependencies** before starting work to understand context
3. **Record failure context** when tasks fail to help with retries
4. **Discover sub-tasks** during implementation and add them with proper dependencies
5. **Use priorities** to ensure critical path items get worked on first
6. **Match spirit types** to agent capabilities for optimal task assignment

## Error Handling

**No ready tasks?**
\`\`\`bash
# Check system status - are tasks blocked or all done?
shiki status --json

# Look at what's pending (may need dependencies resolved)
shiki list --status pending --json
\`\`\`

**Task update failed?**
- Verify the task ID exists: \`shiki show <id> --json\`
- Check you're using a valid status value
- Ensure shiki is initialized: \`shiki status --json\`

**Can't find a task?**
- IDs support prefix matching: \`sk-a1b\` matches \`sk-a1b2c3\`
- Use \`shiki list --json\` to see all tasks

## ID Formats

- **Internal ID**: \`sk-{4-6 char alphanumeric}\` (e.g., \`sk-a1b2c3\`)
- **Display ID**: \`{PRD-ID}/{sequence}\` (e.g., \`PRD-001/1.2\` for nested tasks)
- IDs can be referenced by prefix for convenience (e.g., \`a1b2\` matches \`sk-a1b2c3\`)

## Database Location

The Fuda database is stored at \`.shikigami/shiki.db\` in your project root. It's a SQLite database that can be accessed directly for advanced operations.
`;

export interface AgentGuideStructured {
  coreConcepts: {
    fuda: string;
    spiritTypes: string[];
    dependencyTypes: string[];
    statuses: string[];
  };
  workflow: {
    step: number;
    title: string;
    description: string;
    command?: string;
  }[];
  cliReference: {
    commands: {
      name: string;
      description: string;
      example: string;
    }[];
  };
  bestPractices: string[];
  idFormats: {
    internal: string;
    display: string;
  };
}

export function getStructuredContent(): AgentGuideStructured {
  return {
    coreConcepts: {
      fuda:
        "A task unit containing title, description, status, priority, and spiritType",
      spiritTypes: ["shikigami", "tengu", "kitsune"],
      dependencyTypes: ["blocks", "parent-child", "related", "discovered-from"],
      statuses: [
        "pending",
        "ready",
        "in_progress",
        "in_review",
        "blocked",
        "failed",
        "done",
      ],
    },
    workflow: [
      {
        step: 1,
        title: "Initialize the Project",
        description: "Creates a .shikigami/shiki.db SQLite database in your project",
        command: "shiki init",
      },
      {
        step: 2,
        title: "Check What's Ready to Work On",
        description:
          "Returns tasks with status ready, no unfinished blocking dependencies, ordered by priority",
        command: "shiki ready --json",
      },
      {
        step: 3,
        title: "Claim a Task",
        description: "Update task status to in_progress",
        command: "shiki update <id> --status in_progress --json",
      },
      {
        step: 4,
        title: "Work on the Task",
        description:
          "Read task description, implement changes, test, create commit",
      },
      {
        step: 5,
        title: "Complete or Fail the Task",
        description: "Update status to done or failed",
        command: "shiki update <id> --status done --json",
      },
      {
        step: 6,
        title: "Check for Newly Ready Tasks",
        description:
          "Dependent tasks may become unblocked after completion",
        command: "shiki ready --json",
      },
    ],
    cliReference: {
      commands: [
        {
          name: "shiki init",
          description: "Initialize shiki in the current project",
          example: "shiki init",
        },
        {
          name: "shiki add",
          description: "Create a new fuda",
          example:
            'shiki add -t "Implement feature X" -d "Description" --priority 5 --json',
        },
        {
          name: "shiki import --stdin",
          description: "Batch import fuda from stdin",
          example:
            'echo \'[{"title": "Task", "description": "Desc"}]\' | shiki import --stdin --json',
        },
        {
          name: "shiki list",
          description: "List all fuda with optional filters",
          example: "shiki list --status ready --json",
        },
        {
          name: "shiki show",
          description: "Show fuda details",
          example: "shiki show sk-a1b2c3 --json",
        },
        {
          name: "shiki ready",
          description: "List fuda ready to work on",
          example: "shiki ready --json",
        },
        {
          name: "shiki update",
          description: "Update a fuda's status or assignment",
          example:
            "shiki update sk-a1b2c3 --status in_progress --assigned-spirit-id agent-1 --json",
        },
        {
          name: "shiki deps tree",
          description: "View full dependency tree",
          example: "shiki deps tree sk-a1b2c3 --json",
        },
        {
          name: "shiki deps blocked",
          description: "See what's blocking a task",
          example: "shiki deps blocked sk-a1b2c3 --json",
        },
        {
          name: "shiki status",
          description: "Show current system status",
          example: "shiki status --json",
        },
        {
          name: "shiki agent-guide",
          description: "Show this workflow guide",
          example: "shiki agent-guide --json",
        },
      ],
    },
    bestPractices: [
      "Always use --json flag for programmatic access",
      "Check dependencies before starting work to understand context",
      "Record failure context when tasks fail to help with retries",
      "Discover sub-tasks during implementation and add them with proper dependencies",
      "Use priorities to ensure critical path items get worked on first",
      "Match spirit types to agent capabilities for optimal task assignment",
    ],
    idFormats: {
      internal: "sk-{4-6 char alphanumeric} (e.g., sk-a1b2c3)",
      display: "{PRD-ID}/{sequence} (e.g., PRD-001/1.2 for nested tasks)",
    },
  };
}
