#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Parse command-line arguments
const args = process.argv.slice(2);
const enableLogging = args.includes('-log');

// Tools that are safe to use when answering questions (read-only operations)
const SAFE_TOOLS = new Set([
  'Read',
  'Grep',
  'Glob',
  'LS',
  'WebFetch',
  'WebSearch',
  'ListMcpResourcesTool',
  'ReadMcpResourceTool',
  'TodoRead'  // Reading todos is safe
]);

// Get state directory
function getStateDir() {
  return path.join(os.homedir(), '.claude', 'hook-state');
}

// Get marker file paths
function getQuestionPath(session_id) {
  return path.join(getStateDir(), `${session_id}.question.txt`);
}

function getCommitPath(session_id) {
  return path.join(getStateDir(), `${session_id}.commit.txt`);
}

// Get log file path
function getLogPath(session_id) {
  return path.join(getStateDir(), `${session_id}.jsonl`);
}

// Ensure state directory exists
async function ensureStateDir() {
  await fs.mkdir(getStateDir(), { recursive: true });
}

// Write to JSONL log file
async function writeLog(session_id, entry) {
  if (!enableLogging) return;

  try {
    await ensureStateDir();
    const logPath = getLogPath(session_id);
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...entry
    };
    await fs.appendFile(logPath, JSON.stringify(logEntry) + '\n');
  } catch (error) {
    // Silently fail logging
  }
}

// Check if file exists
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Create marker file
async function createMarkerFile(filePath, content = '') {
  await ensureStateDir();
  await fs.writeFile(filePath, content);
}

// Delete marker file
async function deleteMarkerFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch {
    // Ignore if file doesn't exist
  }
}

// Clean up all marker files for a session
async function cleanupSession(session_id) {
  await deleteMarkerFile(getQuestionPath(session_id));
  await deleteMarkerFile(getCommitPath(session_id));
}

// Check if prompt starts with Q: followed by whitespace
function isQuestionPrefix(prompt) {
  return /^Q:\s/.test(prompt);
}

// Check if prompt starts with commit!
function isCommitPrefix(prompt) {
  return /^commit!(\s|$)/i.test(prompt);
}

// Check if bash command is a git commit
function isGitCommit(command) {
  // Match various forms of git commit commands
  const gitCommitPatterns = [
    /\bgit\s+commit\b/,
    /\bgit\s+.*\s+commit\b/,  // e.g., git -c user.name=foo commit
  ];
  return gitCommitPatterns.some(pattern => pattern.test(command));
}

// Main hook handler
async function handleHook() {
  let session_id = 'unknown';

  try {
    // Read JSON from stdin
    let input = '';
    for await (const chunk of process.stdin) {
      input += chunk;
    }

    const hookData = JSON.parse(input);
    session_id = hookData.session_id || 'unknown';
    const { hook_event_name } = hookData;

    // Log incoming hook
    await writeLog(session_id, {
      event: 'hook_received',
      hook_event_name,
      hookData
    });

    // Handle different hook types
    switch (hook_event_name) {
      case 'UserPromptSubmit': {
        const prompt = hookData.prompt;
        let hasQuestion = false;
        let allowCommit = false;
        let actualPrompt = prompt;

        // Check for Q: prefix (question)
        if (isQuestionPrefix(prompt)) {
          hasQuestion = true;
          actualPrompt = prompt.replace(/^Q:\s*/, '');
          await createMarkerFile(getQuestionPath(session_id), actualPrompt);

          await writeLog(session_id, {
            event: 'question_detected',
            prompt,
            actualPrompt
          });
        }

        // Check for commit! prefix (allow commits)
        if (isCommitPrefix(prompt)) {
          allowCommit = true;
          actualPrompt = prompt.replace(/^commit!\s*/i, '');
          await createMarkerFile(getCommitPath(session_id), actualPrompt);

          await writeLog(session_id, {
            event: 'commit_allowed',
            prompt,
            actualPrompt
          });
        }

        // If it's a question, add context to prevent actions
        if (hasQuestion) {
          const response = {
            hookSpecificOutput: {
              additionalContext: "USER ASKED A QUESTION: You must answer it before doing anything else. DO NOT use tools. DO NOT perform actions. ONLY provide the answer."
            }
          };

          await writeLog(session_id, {
            event: 'response',
            response,
            action: 'adding_context'
          });

          console.log(JSON.stringify(response));
        } else {
          await writeLog(session_id, {
            event: 'response',
            response: {},
            action: 'no_context_needed'
          });

          // No additional context needed
          console.log('{}');
        }
        break;
      }

      case 'PreToolUse': {
        const toolName = hookData.tool_name || hookData.tool;
        const toolParams = hookData.tool_input || hookData.params || hookData.parameters;

        // Check if question marker exists
        const hasQuestion = await fileExists(getQuestionPath(session_id));

        await writeLog(session_id, {
          event: 'pretooluse_check',
          hasQuestion,
          tool: toolName,
          params: toolParams
        });

        // Check if tool should be blocked for questions
        if (hasQuestion && !SAFE_TOOLS.has(toolName)) {
          const safeToolsList = Array.from(SAFE_TOOLS).join(', ');
          const response = {
            error: `THE USER ASKED A QUESTION. You must answer the question before performing any actions. You may use these tools to help answer: ${safeToolsList}.`
          };

          await writeLog(session_id, {
            event: 'blocking_tool',
            response,
            tool: toolName,
            reason: 'question_pending_unsafe_tool',
            exit_code: 2
          });

          console.error(JSON.stringify(response));
          process.exit(2);
        }

        // Check for git commit in Bash commands
        if (toolName === 'Bash' && toolParams?.command) {
          if (isGitCommit(toolParams.command)) {
            const hasCommitPermission = await fileExists(getCommitPath(session_id));

            if (!hasCommitPermission) {
              const response = {
                error: "Committing without user's review and approval is OFFENSIVE, RUDE, and INAPPROPRIATE."
              };

              await writeLog(session_id, {
                event: 'blocking_git_commit',
                response,
                command: toolParams.command,
                exit_code: 2
              });

              console.error(JSON.stringify(response));
              process.exit(2);
            } else {
              await writeLog(session_id, {
                event: 'allowing_git_commit',
                command: toolParams.command
              });
            }
          }
        }

        // Allow tool use
        await writeLog(session_id, {
          event: 'allowing_tool',
          tool: toolName,
          reason: hasQuestion ? 'safe_tool_allowed' : 'no_restriction'
        });

        console.log('{}');
        break;
      }

      case 'Stop':
      case 'SessionStart': {
        await writeLog(session_id, {
          event: 'session_cleanup',
          hook_event_name
        });

        // Clean up all marker files
        await cleanupSession(session_id);
        console.log('{}');
        break;
      }

      default: {
        await writeLog(session_id, {
          event: 'passthrough',
          hook_event_name
        });

        // For other hook types, just pass through
        console.log('{}');
      }
    }
  } catch (error) {
    await writeLog(session_id, {
      event: 'error',
      error: error.message,
      stack: error.stack
    });

    // Return error in hook format
    console.log(JSON.stringify({
      error: `Hook handler error: ${error.message}`
    }));
    process.exit(1);
  }
}

// Run the hook handler
handleHook().catch(error => {
  console.error(JSON.stringify({
    error: `Fatal error: ${error.message}`
  }));
  process.exit(1);
});