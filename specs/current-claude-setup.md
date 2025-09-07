# Current Claude Setup Documentation

## Claude Configuration Files

### Primary Configuration
- **Location**: `~/.claude/settings.json`
- **Content**: Contains permissions and hooks configuration

### Additional Files Found
- `~/.claude/settings.local.json`
- `~/.claude/plugins/config.json`
- `~/.claude/memory.json`
- `~/.claude/notification.mp3`
- `~/.claude/stop.mp3`

## Permissions Configuration

The following tools are currently allowed:
- Bash
- Read
- Edit
- Write
- WebFetch
- Grep
- Glob
- LS
- MultiEdit
- TodoRead
- TodoWrite
- WebSearch

## Hooks Configuration

### Hook Structure
Each hook type contains matchers (regex patterns) and associated commands to execute.

### Active Hooks

#### PreToolUse
Executes before any tool is used.
- `/Users/kap/Documents/Code/williamkapke/is-question/bin/direct.js`

#### PostToolUse
Executes after any tool is used.
- (MadameClaude bridge - excluded from documentation)

#### Notification
Executes for notifications.
- `(afplay /Users/kap/.claude/notification.mp3 >/dev/null 2>&1 &)`

#### UserPromptSubmit
Executes when user submits a prompt.
- `/Users/kap/Documents/Code/williamkapke/is-question/bin/direct.js`

#### Stop
Executes when stopping.
- `/Users/kap/Documents/Code/williamkapke/is-question/bin/direct.js`
- `(afplay /Users/kap/.claude/stop.mp3 >/dev/null 2>&1 &)`

#### SubagentStop
Executes when subagents stop.
- (MadameClaude bridge - excluded from documentation)

#### PreCompact
Executes before compacting.
- (MadameClaude bridge - excluded from documentation)

#### SessionStart
Executes at session start.
- `/Users/kap/Documents/Code/williamkapke/is-question/bin/direct.js`

### Hook Scripts Referenced

1. **is-question script**: `/Users/kap/Documents/Code/williamkapke/is-question/bin/direct.js`
   - Used in: PreToolUse, UserPromptSubmit, Stop, SessionStart

2. **Sound commands**:
   - Notification: `afplay /Users/kap/.claude/notification.mp3`
   - Stop: `afplay /Users/kap/.claude/stop.mp3`

## Git Hooks Configuration

### Global Git Hooks Path
```
/Users/kap/.git-templates/hooks/
```

### Active Git Hooks

#### commit-msg Hook
**Location**: `/Users/kap/.git-templates/hooks/commit-msg`

**Purpose**: Prevents Claude/AI references in commit messages

**Script Content**:
```bash
#!/bin/sh

# Check for Claude/AI references in commit message
if grep -iE "(claude|🤖|generated with|co-authored-by: claude|anthropic)" "$1"; then
    echo "Error: Commit message contains Claude/AI references. Please remove them."
    exit 1
fi
```

**Patterns Blocked**:
- claude (case-insensitive)
- 🤖
- generated with
- co-authored-by: claude
- anthropic