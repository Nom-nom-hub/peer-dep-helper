# Documentation for bin/index.js (CLI Entrypoint)

## Purpose
This file is the main entrypoint for the peer-dep-helper CLI tool. It parses command-line arguments, loads configuration, and invokes the core logic for auditing and fixing peer dependencies.

## Command Structure
- `peer-dep-helper audit [options]`: Scans for peer dependency issues and prints a report.
- `peer-dep-helper fix [options]`: Attempts to fix detected peer dependency issues.

## Global Options
- `--json`: Output report as JSON.
- `--silent`: Suppress all output except errors.
- `--cwd <path>`: Custom working directory.
- `--strategy <strategy>`: Version resolution strategy (`strict`, `compatible`, `latest`).
- `--dry-run`: Show what would be installed/changed without making changes.
- `--fail-on-issues`: Exit with non-zero code if issues are found.

## Audit Command Options
- `--fix`: Automatically fix issues after auditing.

## Fix Command Options
- `--write`: Write fixed dependencies to package.json.
- `--only <packages...>`: Fix only specified packages (comma-separated).

## Flow
1. Parses CLI arguments using `commander`.
2. Loads configuration from CLI and config files.
3. Runs the selected command (`audit` or `fix`).
4. Prints results using the output module.
5. Optionally applies fixes and re-audits.

## Usage Example
```sh
peer-dep-helper audit --json
peer-dep-helper fix --only react,react-dom --dry-run
```

## Implementation Notes
- Handles process exit codes for CI/CD.
- Supports monorepo and workspace scanning.
- Respects ignore lists and config overrides. 