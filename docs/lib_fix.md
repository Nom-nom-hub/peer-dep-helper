# Documentation for lib/fix.js

## Purpose
This module contains the logic for fixing peer dependency issues detected by the scanner. It determines the correct install commands and can optionally update package.json files.

## Main Exports
- `applyFixes(issues, config)`: Attempts to fix the provided peer dependency issues according to the configuration. Supports dry-run and selective fixing.

## Usage Example
```js
const { applyFixes } = require('../lib/fix');
await applyFixes(issues, config);
```

## Implementation Notes
- Supports dry-run mode to preview changes.
- Can filter which packages to fix using config.
- Handles npm, yarn, and pnpm package managers.