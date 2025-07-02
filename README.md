<p align="center">
  <img src="assets/logo.svg" alt="peer-dep-helper logo" width="120" />
</p>


# Peer Dependency Helper CLI Tool

## Table of Contents
- [Introduction](#introduction)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
  - [Commands](#commands)
  - [Global Options](#global-options)
  - [Audit Command](#audit-command)
  - [Fix Command](#fix-command)
- [Configuration](#configuration)
- [Core Concepts](#core-concepts)
  - [How it Works](#how-it-works)
  - [Version Resolution Strategies](#version-resolution-strategies)
- [Advanced Features](#advanced-features)
  - [Caching](#caching)
  - [Monorepo Support](#monorepo-support)
- [Testing](#testing)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Introduction
`peer-dep-helper` is a powerful Command Line Interface (CLI) tool designed to streamline the management of peer dependencies in Node.js projects. It helps developers detect, audit, and automatically fix common issues related to peer dependencies, ensuring project stability and preventing unexpected runtime errors.

## Features
- **Comprehensive Auditing**: Scans your project's `node_modules` and `package.json` to identify missing or mismatched peer dependencies.
- **Automated Fixing**: Automatically installs correct versions of missing or mismatched peer dependencies.
- **Flexible Configuration**: Supports configuration via CLI flags and a `.peer-dep-helperrc` file.
- **Multiple Strategies**: Offers different version resolution strategies (`strict`, `compatible`, `latest`) to suit various project needs.
- **JSON Output**: Provides an option to output reports in JSON format for integration with other tools.
- **Monorepo Awareness**: Designed with future support for monorepo structures.
- **Caching**: Includes a caching mechanism for faster subsequent scans.

## Installation
To install `peer-dep-helper` globally, use your preferred package manager:

```bash
npm install -g peer-dep-helper
# OR
yarn global add peer-dep-helper
# OR
pnpm add -g peer-dep-helper
```

## Usage
The `peer-dep-helper` tool provides two main commands: `audit` and `fix`.

### Commands

#### `peer-dep-helper audit`
Scans your project for peer dependency issues and prints a detailed report. This is the default command if no other command is specified.

#### `peer-dep-helper fix`
Detects peer dependency issues and attempts to automatically install or suggest the correct versions.

### Global Options
These options can be used with any command.

- `--json`: Output the report as JSON.
  - Example: `peer-dep-helper audit --json`
- `--silent`: Suppress all terminal output except errors.
  - Example: `peer-dep-helper audit --silent`
- `--cwd <path>`: Specify a custom working directory for the scan. Defaults to the current working directory.
  - Example: `peer-dep-helper audit --cwd ./my-project`
- `--strategy <strategy>`: Define the version resolution strategy.
  - Accepted values: `strict`, `compatible` (default), `latest`.
  - Example: `peer-dep-helper audit --strategy strict`
- `--dry-run`: (Applicable to `fix` command) Show what would be installed/changed without making any actual modifications.
  - Example: `peer-dep-helper fix --dry-run`
- `--fail-on-issues`: Exit with a non-zero code if issues are found. Useful for CI/CD pipelines.
  - Example: `peer-dep-helper audit --fail-on-issues`

### Audit Command Options

- `--fix`: Automatically apply fixes after auditing. This is a convenience flag for the `audit` command that triggers the `fix` logic.
  - Example: `peer-dep-helper audit --fix`

### Fix Command Options

- `--write`: Write fixed dependencies to the root `package.json` file.
  - Example: `peer-dep-helper fix --write`
- `--only <packages...>`: Fix only specified packages. Provide a comma-separated list of package names.
  - Example: `peer-dep-helper fix --only react,react-dom`

## Configuration
`peer-dep-helper` can be configured using a `.peer-dep-helperrc` file (JSON or YAML format) in your project's root directory. CLI flags will always override settings from the configuration file.

The following configuration options are available:

- `cwd`: Specify a custom working directory for the scan. Defaults to the current working directory.
- `ignore`: Specify an array of packages to ignore during the scan.


Example `.peer-dep-helperrc.json`:
```json
{
  "strategy": "strict",
  "silent": false,
  "ignore": [
    "some-package-to-ignore",
    "another-package-to-ignore"
  ]
}
```
**Note**: The `ignore` option is mentioned in `bin/index.js` but not explicitly defined in `PLAN.md` or `REFINEMENT_PLAN.md` as a configurable option. Its behavior should be clarified.

## Core Concepts

### How it Works
The tool operates by:
1.  **Parsing Configuration**: Loads CLI arguments and merges them with settings from `.peer-dep-helperrc`.
2.  **Scanning**: Reads the root `package.json` and recursively scans the `node_modules` directory to identify all installed packages and their declared `peerDependencies`.
3.  **Issue Detection**: For each `peerDependency`, it checks if the required peer is:
    *   Missing from the root `node_modules`.
    *   Installed but with a version that does not satisfy the declared range (using semantic versioning).
4.  **Issue Classification**: Issues are classified as `missing` or `version_mismatch`.
5.  **Version Resolution**: Determines the correct version range based on the chosen `--strategy`.
6.  **Reporting**: Formats and outputs the detected issues to the console or as JSON.
7.  **Fixing (Optional)**: If the `fix` command or `--fix` flag is used, it constructs and executes appropriate package manager commands (`npm install`, `yarn add`, `pnpm add`) to resolve the issues. It can optionally update the root `package.json`.

### Version Resolution Strategies
The `--strategy` option dictates how `peer-dep-helper` resolves required peer dependency versions.

-   **`compatible` (Default)**: Aims to find a version that satisfies all declared peer dependency ranges. If multiple ranges exist for the same peer, it attempts to find the broadest compatible version.
-   **`strict`**: Requires that the installed peer dependency exactly matches the version specified by the peer dependency range. This strategy is less forgiving and will flag more issues.
-   **`latest`**: Attempts to resolve the peer dependency to its latest available version that still satisfies the declared range. (Further refinement needed: Currently, this might rely on locally installed versions or require network calls, which are generally out of scope for this tool's current design. Its exact behavior should be clarified and documented.)

## Advanced Features

### Caching
`peer-dep-helper` utilizes a caching mechanism to speed up repeated scans. Analysis results are stored in a `.peer-dep-helper-cache.json` file.

-   **Invalidation**: The cache invalidation logic is designed to be robust, using content hashing of `package.json` and lock files. See [lib/scan.js documentation](./lib_scan.md) for details.
-   **Clearing Cache**: To clear the cache, manually delete `.peer-dep-helper-cache.json` in your project root. (A CLI option for clearing cache may be added in the future.)

### Monorepo Support
The tool is being developed with monorepo environments in mind. It aims to:

-   **Detect Workspaces**: Identify workspaces configured by package managers like Yarn, pnpm, or Lerna.
-   **Scan Nested `package.json` files**: Ensure all relevant `package.json` files within a monorepo are scanned for peer dependencies.
-   **Pnpm Workspaces**: Specifically, it will consider parsing `pnpm-workspace.yaml` for accurate workspace path determination.
-   See [lib/utils.js documentation](./lib_utils.md) for workspace detection details.

## Testing
The project uses `jest` for comprehensive testing. See [Testing Documentation](./testing.md).

-   **Unit Tests**: Cover individual modules (`scan.js`, `fix.js`, `utils.js`, `config.js`, `output.js`).
-   **Integration Tests**: Utilize a `fixtures/` directory containing various test projects to simulate real-world scenarios (e.g., projects with missing peers, version mismatches, no issues, monorepo examples). See [Fixtures Documentation](./fixtures.md).
-   **Mocking**: `fs/promises` and `execa` are mocked to prevent actual file system changes or command executions during tests.

## Contributing
See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on setting up the development environment, running tests, and submitting pull requests.

## Troubleshooting
-   **"Error: Command not found"**: Ensure `peer-dep-helper` is installed globally and your system's PATH includes the global npm/yarn/pnpm bin directory.
-   **Unexpected Issues**: If you encounter unexpected issues, try running the command with `--silent` removed to see debug logs.
-   **Cache Issues**: If results seem stale, manually delete `.peer-dep-helper-cache.json` to clear the cache.

## License
This project is licensed under the MIT License. See the `package/license` file for details.

## Further Documentation
- [CLI Entrypoint Documentation](./bin_index.md)
- [lib/scan.js](./lib_scan.md)
- [lib/fix.js](./lib_fix.md)
- [lib/output.js](./lib_output.md)
- [lib/utils.js](./lib_utils.md)
- [lib/config.js](./lib_config.md)
- [package/lib/command.js](./package_lib_command.md)
- [package/lib/error.js](./package_lib_error.md)
- [package/lib/kill.js](./package_lib_kill.md)
- [package/lib/promise.js](./package_lib_promise.md)
- [package/lib/stdio.js](./package_lib_stdio.md)
- [package/lib/stream.js](./package_lib_stream.md)

<p align="center">
  Made with ❤️ by Teck
</p>