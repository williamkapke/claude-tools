#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const SETTINGS_FILE = path.join(CLAUDE_DIR, 'settings.json');
const GIT_HOOKS_DIR = path.join(os.homedir(), '.git-templates', 'hooks');

// Sound files bundled with the package
const SOUNDS = {
  notification: 'notification.mp3',
  stop: 'stop.mp3'
};

// Parse command line arguments
const args = process.argv.slice(2);
const isUninstall = args.includes('uninstall');
const shouldInstallSounds = isUninstall ? false : (args.length === 0 || args.includes('-sounds'));
const installRules = isUninstall ? false : (args.length === 0 || args.includes('-rules'));
const installGitHook = isUninstall ? false : (args.length === 0 || args.includes('-git-precommit'));
const showHelp = args.includes('-h') || args.includes('--help');

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function copyFile(sourcePath, destPath) {
  console.log(`Copying ${path.basename(destPath)}...`);
  await fs.copyFile(sourcePath, destPath);
  console.log(`  ✓ Copied to ${destPath}`);
}

async function installSounds() {
  console.log('\nInstalling notification sounds...');
  const soundsDir = path.join(__dirname, 'sounds');
  
  for (const [key, filename] of Object.entries(SOUNDS)) {
    const sourcePath = path.join(soundsDir, filename);
    const destPath = path.join(CLAUDE_DIR, filename);
    try {
      await copyFile(sourcePath, destPath);
    } catch (error) {
      console.error(`  ✗ Failed to install ${key} sound: ${error.message}`);
    }
  }
}

async function removeSounds() {
  console.log('\nRemoving notification sounds...');
  for (const filename of Object.values(SOUNDS)) {
    const soundPath = path.join(CLAUDE_DIR, filename);
    if (await fileExists(soundPath)) {
      await fs.unlink(soundPath);
      console.log(`  ✓ Removed ${filename}`);
    }
  }
}

async function setupGitHooks() {
  console.log('\nSetting up Git hooks...');
  await ensureDir(GIT_HOOKS_DIR);
  
  const commitMsgHook = `#!/bin/sh

# Check for Claude/AI references in commit message
if grep -iE "(claude|🤖|generated with|co-authored-by: claude|anthropic)" "$1"; then
    echo "Error: Commit message contains Claude/AI references. Please remove them."
    exit 1
fi
`;

  const hookPath = path.join(GIT_HOOKS_DIR, 'commit-msg');
  await fs.writeFile(hookPath, commitMsgHook);
  await fs.chmod(hookPath, 0o755);
  console.log(`  ✓ Created commit-msg hook at ${hookPath}`);
  
  // Set global git config
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  try {
    await execAsync(`git config --global core.hooksPath ${GIT_HOOKS_DIR}`);
    console.log(`  ✓ Configured global Git hooks path`);
  } catch (error) {
    console.error(`  ✗ Failed to set global Git hooks path: ${error.message}`);
  }
}

async function removeGitHooks() {
  console.log('\nRemoving Git hooks...');
  const hookPath = path.join(GIT_HOOKS_DIR, 'commit-msg');
  
  if (await fileExists(hookPath)) {
    const content = await fs.readFile(hookPath, 'utf-8');
    // Only remove if it's our hook
    if (content.includes('Claude/AI references')) {
      await fs.unlink(hookPath);
      console.log(`  ✓ Removed commit-msg hook`);
    } else {
      console.log(`  ⚠ Skipping removal - commit-msg hook was modified`);
    }
  }
  
  // Note: We don't remove the git config as user might have other hooks
  console.log(`  ℹ Git hooks path remains configured (may have other hooks)`);
}

async function setupClaudeSettings() {
  console.log('\nConfiguring Claude rules...');
  await ensureDir(CLAUDE_DIR);
  
  // Copy rule-manager.js to Claude directory
  const sourceRuleManager = path.join(__dirname, 'rule-manager.js');
  const destRuleManager = path.join(CLAUDE_DIR, 'rule-manager.js');
  
  try {
    const ruleManagerContent = await fs.readFile(sourceRuleManager, 'utf-8');
    await fs.writeFile(destRuleManager, ruleManagerContent);
    await fs.chmod(destRuleManager, 0o755);
    console.log(`  ✓ Copied rule-manager.js to ${destRuleManager}`);
  } catch (error) {
    console.error(`  ✗ Failed to copy rule-manager.js: ${error.message}`);
  }
  
  // Use the destination path for hooks
  const ruleManagerPath = destRuleManager;
  
  const settings = {
    permissions: {
      allow: [
        "Bash",
        "Read",
        "Edit",
        "Write",
        "WebFetch",
        "Grep",
        "Glob",
        "LS",
        "MultiEdit",
        "TodoRead",
        "TodoWrite",
        "WebSearch"
      ]
    },
    hooks: {
      PreToolUse: [
        {
          matcher: ".*",
          hooks: [
            {
              type: "command",
              command: ruleManagerPath
            }
          ]
        }
      ],
      PostToolUse: [
        {
          matcher: ".*",
          hooks: []
        }
      ],
      Notification: [
        {
          matcher: ".*",
          hooks: [
            {
              type: "command",
              command: `(afplay ${path.join(CLAUDE_DIR, 'notification.mp3')} >/dev/null 2>&1 &)`
            }
          ]
        }
      ],
      UserPromptSubmit: [
        {
          matcher: ".*",
          hooks: [
            {
              type: "command",
              command: ruleManagerPath
            }
          ]
        }
      ],
      Stop: [
        {
          matcher: ".*",
          hooks: [
            {
              type: "command",
              command: ruleManagerPath
            },
            {
              type: "command",
              command: `(afplay ${path.join(CLAUDE_DIR, 'stop.mp3')} >/dev/null 2>&1 &)`
            }
          ]
        }
      ],
      SubagentStop: [
        {
          matcher: ".*",
          hooks: []
        }
      ],
      PreCompact: [
        {
          matcher: ".*",
          hooks: []
        }
      ],
      SessionStart: [
        {
          matcher: ".*",
          hooks: [
            {
              type: "command",
              command: ruleManagerPath
            }
          ]
        }
      ]
    }
  };
  
  // Check if settings file exists
  let existingSettings = {};
  try {
    const content = await fs.readFile(SETTINGS_FILE, 'utf-8');
    existingSettings = JSON.parse(content);
    console.log(`  ⚠ Found existing settings.json - will merge hooks`);
  } catch (error) {
    // File doesn't exist or is invalid
  }
  
  // Merge hooks (preserving other settings)
  const mergedSettings = {
    ...existingSettings,
    ...settings
  };
  
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(mergedSettings, null, 2));
  console.log(`  ✓ Updated Claude settings at ${SETTINGS_FILE}`);
}

async function removeClaudeSettings() {
  console.log('\nRemoving Claude rules...');
  
  // Remove rule-manager.js file
  const ruleManagerPath = path.join(CLAUDE_DIR, 'rule-manager.js');
  if (await fileExists(ruleManagerPath)) {
    await fs.unlink(ruleManagerPath);
    console.log(`  ✓ Removed rule-manager.js`);
  }
  
  if (!await fileExists(SETTINGS_FILE)) {
    console.log(`  ⚠ No settings.json found`);
    return;
  }
  
  try {
    const content = await fs.readFile(SETTINGS_FILE, 'utf-8');
    const settings = JSON.parse(content);
    
    // Remove rule-manager.js hooks
    
    for (const hookType of Object.keys(settings.hooks || {})) {
      if (settings.hooks[hookType] && Array.isArray(settings.hooks[hookType])) {
        for (const matcher of settings.hooks[hookType]) {
          if (matcher.hooks && Array.isArray(matcher.hooks)) {
            matcher.hooks = matcher.hooks.filter(hook => 
              !hook.command?.includes('rule-manager.js')
            );
          }
        }
      }
    }
    
    // Remove sound commands from hooks
    if (settings.hooks?.Notification) {
      for (const matcher of settings.hooks.Notification) {
        if (matcher.hooks) {
          matcher.hooks = matcher.hooks.filter(hook => 
            !hook.command?.includes('afplay') || !hook.command?.includes('.claude')
          );
        }
      }
    }
    
    if (settings.hooks?.Stop) {
      for (const matcher of settings.hooks.Stop) {
        if (matcher.hooks) {
          matcher.hooks = matcher.hooks.filter(hook => 
            !hook.command?.includes('afplay') || !hook.command?.includes('.claude')
          );
        }
      }
    }
    
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    console.log(`  ✓ Removed Claude rules from settings.json`);
  } catch (error) {
    console.error(`  ✗ Failed to update settings.json: ${error.message}`);
  }
}

function showUsage() {
  console.log(`
Claude Tools Setup

Usage:
  npx @twistedkap/claude-tools [options]
  npx @twistedkap/claude-tools uninstall

Options:
  -rules          Install Claude rules only
  -sounds         Install notification sounds only
  -git-precommit  Install Git pre-commit hook only
  uninstall       Remove all Claude tools configuration
  -h, --help      Show this help message

When run without options, installs everything.

Examples:
  npx @twistedkap/claude-tools                    # Install everything
  npx @twistedkap/claude-tools -rules -sounds     # Install rules and sounds only
  npx @twistedkap/claude-tools uninstall          # Remove everything
`);
}

async function main() {
  if (showHelp) {
    showUsage();
    process.exit(0);
  }
  
  if (isUninstall) {
    console.log('🗑️  Claude Tools Uninstall\n');
    
    try {
      await removeClaudeSettings();
      await removeSounds();
      await removeGitHooks();
      
      console.log('\n✅ Uninstall complete!');
    } catch (error) {
      console.error('\n❌ Uninstall failed:', error.message);
      process.exit(1);
    }
    return;
  }
  
  console.log('🚀 Claude Tools Setup\n');
  
  if (args.length > 0) {
    console.log('Installing:');
    if (installRules) console.log('  • Claude rules');
    if (shouldInstallSounds) console.log('  • Notification sounds');
    if (installGitHook) console.log('  • Git commit-msg hook');
    console.log('');
  } else {
    console.log('Installing everything:');
    console.log('  • Claude rules and permissions');
    console.log('  • Notification sounds');
    console.log('  • Git commit-msg hook');
    console.log('');
  }
  
  try {
    if (installRules) await setupClaudeSettings();
    if (shouldInstallSounds) await installSounds();
    if (installGitHook) await setupGitHooks();
    
    console.log('\n✅ Setup complete!');
    
    if (installRules) {
      console.log('\nUsage tips:');
      console.log('  • Prefix prompts with "Q: " to ask questions without actions');
      console.log('  • Use "commit!" to allow git commits in that session');
    }
    if (installGitHook) {
      console.log('  • Git commits with AI references will be blocked');
    }
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main();