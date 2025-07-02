# Feature Roadmap: peer-dep-helper

This document outlines the implementation plan for three major features to enhance `peer-dep-helper`:

- **Interactive CLI (manual fix/approve flows)**
- **More “fix strategies” (suggest, auto-fix, PR creation, etc.)**
- **Better integration with package managers (auto-detect, seamless fixes)**

---

## 1. Interactive CLI (Manual Fix/Approve Flows)

**Goal:**
Enable users to review, approve, or manually fix peer dependency issues interactively, similar to `npm-check`.

### Steps

1. **Research & Design**
   - Review `npm-check` and similar tools for UX inspiration.
   - Choose a CLI prompt library (e.g., `inquirer`, `enquirer`, `prompts`).

2. **Refactor CLI Entrypoint**
   - Abstract current CLI logic to support both batch (current) and interactive modes.
   - Add a `--interactive` or `-i` flag.

3. **Implement Interactive Prompts**
   - For each detected issue, present a prompt:
     - Show issue details (package, required version, current version, etc.).
     - Offer options: Fix automatically, Ignore, Edit manually, More info.
   - Allow batch actions (e.g., “Fix all”, “Ignore all”).

4. **Apply User Choices**
   - Integrate prompt results into the fix logic.
   - Ensure manual edits are respected and validated.

5. **Testing**
   - Add integration tests for interactive flows (using tools like `expect` and `inquirer-test`).

6. **Documentation**
   - Update CLI docs and README with interactive usage instructions.

---

## 2. More “Fix Strategies” (Suggest, Auto-fix, PR Creation, etc.)

**Goal:**
Provide multiple strategies for resolving issues, from suggestions to automated fixes and PR creation.

### Steps

1. **Design Strategy Abstraction**
   - Define a “fix strategy” interface (e.g., suggest, auto-fix, PR).
   - Refactor fix logic to support pluggable strategies.

2. **Implement “Suggest” Mode**
   - Add a mode that only outputs recommended changes, without modifying files.
   - CLI flag: `--suggest` or `--dry-run`.

3. **Enhance “Auto-fix” Mode**
   - Ensure current auto-fix is robust and can be toggled (`--fix`).

4. **Implement “PR Creation” Strategy**
   - Use `simple-git` or `octokit` for GitHub PRs.
   - Steps:
     - Create a new branch.
     - Apply fixes.
     - Commit and push.
     - Open a PR with a summary of changes.
   - CLI flag: `--pr` or `--create-pr`.

5. **Strategy Selection**
   - Allow users to select strategy via CLI flags or interactive mode.

6. **Testing**
   - Add tests for each strategy, including PR creation (mock git/GitHub APIs).

7. **Documentation**
   - Document all strategies, flags, and workflows.

---

## 3. Better Integration with Package Managers

**Goal:**
Auto-detect npm/yarn/pnpm, use the correct commands, and make fixes seamless.

### Steps

1. **Auto-Detection Logic**
   - Detect package manager by presence of lockfiles (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`).
   - Optionally, allow override via CLI flag.

2. **Abstract Package Manager Operations**
   - Create a module to wrap install/update commands for each manager.
   - Ensure correct CLI commands are used (e.g., `npm install`, `yarn add`, `pnpm add`).

3. **Seamless Fixes**
   - When fixing, use the detected package manager to update dependencies.
   - Handle edge cases (e.g., workspaces, monorepos).

4. **Testing**
   - Add tests for detection and command execution (mock child_process).

5. **Documentation**
   - Document detection logic and how to override.

---

## Suggested Sequencing

1. **Start with Package Manager Integration**  
   (It's foundational for seamless fixes and will be used by other features.)

2. **Implement Fix Strategies**  
   (Refactor fix logic to support strategies, then add suggest/PR modes.)

3. **Add Interactive CLI**  
   (Build on top of the new fix strategies for a rich interactive experience.)

---

## Example Task Breakdown

| Feature                | Task Example                                      | Dependency         |
|------------------------|---------------------------------------------------|--------------------|
| Package Manager        | Detect lockfile, abstract install commands        | None               |
| Fix Strategies         | Refactor fix logic, add suggest/PR modes          | Package Manager    |
| Interactive CLI        | Add prompts, integrate with fix strategies        | Fix Strategies     |

---

For more details or to track progress, consider breaking these into TODOs or issues in your project tracker. 