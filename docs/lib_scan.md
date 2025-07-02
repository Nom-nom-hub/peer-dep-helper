# Documentation for lib/scan.js

## Purpose
This module implements the scanning logic for peer dependencies. It detects missing, mismatched, or outdated peer dependencies in a project or monorepo.

## Main Exports
- `detectPeerDependencyIssues(cwd, config, cliArgs)`: Scans for peer dependency issues and returns a list of issues with status and details.

## Usage Example
```js
const { detectPeerDependencyIssues } = require('../lib/scan');
const issues = await detectPeerDependencyIssues(process.cwd(), config);
```

## Implementation Notes
- Supports caching for faster repeated scans.
- Handles monorepo/workspace detection.
- Classifies issues as `missing`, `version_mismatch`, `outdated`, or `valid`.
- Applies ignore filters from config.