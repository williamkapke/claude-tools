# @twistedkap/claude-tools

Configuration tools for Claude CLI.

## Installation & Usage

Run directly with npx:

```bash
# Install everything
npx @twistedkap/claude-tools

# Install specific components
npx @twistedkap/claude-tools -rules              # Rules only
npx @twistedkap/claude-tools -sounds             # Sounds only
npx @twistedkap/claude-tools -git-precommit      # Git hook only
npx @twistedkap/claude-tools -rules -sounds      # Multiple components

# Uninstall
npx @twistedkap/claude-tools uninstall

# Help
npx @twistedkap/claude-tools --help
```

## Features

### Question Mode
Prefix prompts with `Q: ` to ask questions without Claude performing actions.

### Commit Control
Use `commit!` prefix to allow git commits in that session.

### Git Hook
Automatically blocks commits containing Claude/AI references.

## Sound Credits

Notification sounds from [Notification Sounds](https://notificationsounds.com/):
- Notification: ["Hurry"](https://notificationsounds.com/standard-ringtones/hurry-263)
- Stop: ["Achievement"](https://notificationsounds.com/message-tones/achievement-message-tone)

Used under their standard license.

## License

MIT