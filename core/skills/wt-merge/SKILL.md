---
name: wt-merge
description: "Squash-merge a worktree branch's PR, clean up the worktree, update main, and report status. Use when done with a worktree — after a subagent finishes, when the user says 'merge worktree', 'merge this branch', 'clean up worktree', 'wt merge', 'done with this worktree', or 'merge and clean up'. Also trigger when the user asks to merge a specific worktree by name."
allowed-tools: "Bash(git *), Bash(gh *), Bash(echo *), AskUserQuestion"
user-invocable: true
---

# Merge Worktree

Squash-merge the PR for a worktree branch, clean up the worktree and branch, update main, and report what's left.

Announce at start: "Merging worktree — gathering context."

## Step 0: Gather Context

Run all of these (they're independent — run in parallel where possible):

```
pwd
git branch --show-current
git worktree list
git status --porcelain
git rev-list @{u}..HEAD 2>/dev/null || echo NO_UPSTREAM
gh pr view --json number,url,state,title,headRefName 2>&1 || echo NO_PR
```

## Step 1: Determine Target

From the context above, extract these variables:

| Variable | How to find it |
|---|---|
| `{MAIN_WORKTREE}` | Path of the first entry in `git worktree list` (the one on `main`) |
| `{WORKTREE_PATH}` | Path of the feature worktree being merged |
| `{BRANCH}` | The feature worktree's branch name |
| `{NUMBER}` | PR number (from `gh pr view` or `gh pr list --head {BRANCH}`) |
| `{INVOKED_FROM}` | Either `"worktree"` or `"main"` — where the session is running |

**If `pwd` does NOT match the path of the first `git worktree list` entry** (inside a linked worktree):
- `{INVOKED_FROM}` = `"worktree"`
- `{WORKTREE_PATH}` = current directory
- `{BRANCH}` = current branch
- `{MAIN_WORKTREE}` = first entry from worktree list

**If `pwd` matches the path of the first `git worktree list` entry** (in the main worktree):
- `{INVOKED_FROM}` = `"main"`
- `{MAIN_WORKTREE}` = current directory
- List all non-main worktrees
- If exactly one exists: target it automatically
- If multiple exist: show the list and ask the user which one to merge (use AskUserQuestion)
- If none exist: STOP — "No feature worktrees found."
- Set `{WORKTREE_PATH}` and `{BRANCH}` from the chosen worktree
- Get the PR: `gh pr list --head {BRANCH} --json number,url,state,title --jq '.[0]'`

## Step 2: Precondition Checks

Only two checks before proceeding — everything else fails naturally with clear errors from `gh pr merge`.

| Check | Detect | Action |
|---|---|---|
| Uncommitted changes in target worktree | `git -C {WORKTREE_PATH} status --porcelain` is non-empty | STOP — tell user to commit or stash |
| Unpushed commits | rev-list shows commit SHAs or NO_UPSTREAM | Run `git -C {WORKTREE_PATH} push -u origin HEAD`, then continue |

After pushing (if needed), ensure a PR exists:
- If no PR: create one with `gh pr create --head {BRANCH} --base main --fill`
- Re-fetch the PR number after creation

If any of these fail, STOP and show the error.

## Step 3: Merge the PR

```
gh pr merge {NUMBER} --squash
```

Do NOT use `--delete-branch` — it tries to switch branches locally, which fails when `main` is already checked out in the main worktree. Branch cleanup is handled in Step 4.

If this fails, STOP and show the error. Common causes: failing CI checks, merge conflicts, missing approvals. Show the PR URL so the user can investigate.

## Step 4: Cleanup + Update Main

**CRITICAL**: This MUST be a single Bash invocation. After `worktree remove` deletes `{WORKTREE_PATH}`, the shell's CWD no longer exists (if invoked from the worktree) and ALL subsequent Bash calls will fail. Every command uses `git -C {MAIN_WORKTREE}` to operate from the main worktree regardless of shell CWD state.

Do NOT split these into separate Bash calls. Do NOT remove or reorder commands.

```bash
git -C {MAIN_WORKTREE} worktree remove --force {WORKTREE_PATH}; git -C {MAIN_WORKTREE} worktree prune; git -C {MAIN_WORKTREE} branch -D {BRANCH} 2>/dev/null; git -C {MAIN_WORKTREE} fetch --prune && git -C {MAIN_WORKTREE} pull --ff-only; echo "===REMAINING WORKTREES==="; git -C {MAIN_WORKTREE} worktree list
```

Commands joined with `;` (continue regardless of errors) except `fetch && pull` which are dependent. Individual failures are tolerated — the branch or worktree directory may already be gone.

## Step 5: Report

Parse the output from Step 4. Everything after `===REMAINING WORKTREES===` is the current worktree list.

Summarize:
- PR was squash-merged (include title and URL from context)
- Worktree was removed
- Main branch was updated (or note if ff-only failed, based on Step 4 output)
- List remaining worktrees from Step 4 output

**If `{INVOKED_FROM}` = `"worktree"`**: End with:
> "The working directory has been deleted. Please close this session and open a new one from the main worktree."

Do NOT run any further Bash commands — the shell is broken because the CWD was deleted.

**If `{INVOKED_FROM}` = `"main"`**: No special warning needed. The shell is fine.

## Safety Rules

**Never:**
- Remove a worktree without merging its PR first
- Delete worktrees the user didn't confirm (when multiple exist)
- Split Step 4 into multiple Bash calls
- Run Bash commands after Step 4 completes when `{INVOKED_FROM}` = `"worktree"`
- Use `--delete-branch` with `gh pr merge`

**Always:**
- Use `git -C {MAIN_WORKTREE}` for all git commands in Steps 4+
- Keep all post-merge operations in a single Bash invocation
- Tolerate errors during cleanup (worktree remove, branch delete may partially succeed)
- Confirm with the user before merging if the target is ambiguous
