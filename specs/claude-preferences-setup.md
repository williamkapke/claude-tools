# Claude Preferences Setup Documentation

## Current Configuration Overview

### Claude Global Settings Location
- **Main settings file**: `~/.claude/settings.json`
- **Local settings**: `~/.claude/settings.local.json`
- **Plugins config**: `~/.claude/plugins/config.json`
- **Memory store**: `~/.claude/memory.json`

### Claude Hooks Configuration

The current Claude setup uses multiple hooks that are triggered at different stages of interaction:

#### 1. **PreToolUse Hook**
Triggered before any tool is executed.
- **is-question**: `/Users/kap/Documents/Code/williamkapke/is-question/bin/direct.js`
  - Validates whether prompts are questions vs commands
- **MadameClaude Bridge**: `/Users/kap/Documents/Code/williamkapke/MadameClaude/bridge/bridge.js`
  - Provides integration bridge for extended functionality

#### 2. **PostToolUse Hook**
Triggered after tool execution completes.
- **MadameClaude Bridge**: Continues monitoring and processing

#### 3. **Notification Hook**
Triggered for user notifications.
- **MadameClaude Bridge**: Handles notification routing
- **Sound notification**: Plays `~/.claude/notification.mp3`

#### 4. **UserPromptSubmit Hook**
Triggered when user submits a prompt.
- **is-question**: Validates the prompt type
- **MadameClaude Bridge**: Processes the prompt

#### 5. **Stop Hook**
Triggered when stopping operations.
- **is-question**: Cleanup validation
- **MadameClaude Bridge**: Cleanup processing
- **Sound notification**: Plays `~/.claude/stop.mp3`

#### 6. **SubagentStop Hook**
Triggered when subagents are stopped.
- **MadameClaude Bridge**: Handles subagent cleanup

#### 7. **PreCompact Hook**
Triggered before compacting operations.
- **MadameClaude Bridge**: Pre-compaction processing

#### 8. **SessionStart Hook**
Triggered at the beginning of a new session.
- **is-question**: Initial setup
- **MadameClaude Bridge**: Session initialization

### Git Hooks Configuration

#### Global Git Hooks Path
- **Location**: `/Users/kap/.git-templates/hooks/`
- **Active hooks**: `commit-msg`

#### Commit Message Hook (`commit-msg`)
Purpose: Prevents accidental inclusion of AI/Claude references in commit messages.

**Checks for**:
- "claude" (case-insensitive)
- "🤖" emoji
- "generated with"
- "co-authored-by: claude"
- "anthropic"

**Behavior**: Rejects commits containing these references with an error message.

### Permissions

The following tools are allowed in Claude:
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

## Application Requirements

The Claude preferences configuration app should provide:

### 1. **Hooks Management**
- View/edit all hook types
- Add/remove hook commands
- Test hook execution
- Enable/disable specific hooks
- Configure hook matchers (regex patterns)

### 2. **Permissions Management**
- Toggle allowed tools
- Add custom tool permissions
- View tool descriptions

### 3. **Sound Configuration**
- Select notification sounds
- Test sound playback
- Volume control
- Enable/disable sounds per hook type

### 4. **Git Integration**
- Configure git hooks
- Manage commit message rules
- Test git hook execution

### 5. **Settings Management**
- Import/export configurations
- Backup/restore settings
- Profile management (different configs for different projects)
- View/edit raw JSON

### 6. **Hook Scripts**
- Edit hook script paths
- Validate script existence
- View script output logs
- Script dependency management

## Technical Architecture

### Configuration Structure
```json
{
  "permissions": {
    "allow": ["tool1", "tool2", ...]
  },
  "hooks": {
    "HookType": [
      {
        "matcher": "regex_pattern",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/script"
          }
        ]
      }
    ]
  }
}
```

### Hook Execution Flow
1. Event triggered (e.g., tool use, prompt submit)
2. Matcher evaluated against context
3. Matching hooks executed in order
4. Results processed/logged
5. Continue or block based on hook response

## External Dependencies

### is-question
- **Location**: `/Users/kap/Documents/Code/williamkapke/is-question/`
- **Purpose**: Distinguishes questions from commands in prompts
- **Integration**: Used in multiple hooks for validation

### MadameClaude
- **Location**: `/Users/kap/Documents/Code/williamkapke/MadameClaude/`
- **Purpose**: Extended Claude functionality bridge
- **Integration**: Core integration layer for all major hooks

### Audio Files
- **Notification sound**: `~/.claude/notification.mp3`
- **Stop sound**: `~/.claude/stop.mp3`

## Implementation Considerations

1. **File System Access**: App needs read/write access to `~/.claude/` directory
2. **Process Execution**: Must be able to test-run hook scripts
3. **JSON Validation**: Ensure valid JSON structure when saving
4. **Backup Strategy**: Auto-backup before modifications
5. **Error Handling**: Graceful handling of missing scripts or invalid configurations
6. **Platform Compatibility**: Consider cross-platform paths and commands