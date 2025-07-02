# Documentation for lib/utils.js

## Purpose
This module provides utility functions used throughout the peer-dep-helper tool, including file reading, version resolution, workspace detection, and semver helpers.

## Main Exports
- `readPackageJson(dir)`: Reads and parses a package.json file from the given directory.
- `scanNodeModules(dir)`: Scans node_modules to collect installed package versions.
- `resolveVersionRange(ranges, strategy)`: Resolves a version range from multiple demands and a strategy.
- `semver`: Exposes semver utilities.
- `detectWorkspaces(dir)`: Detects monorepo workspaces.
- `getLatestVersion(pkg)`: Gets the latest version of a package from the registry.

## Usage Example
```js
const { readPackageJson, scanNodeModules } = require('../lib/utils');
const pkg = await readPackageJson(process.cwd());
```

## Implementation Notes
- Used by scan, fix, and config modules.
- Handles edge cases for missing or malformed files.
- Uses async/await for all file and network operations.