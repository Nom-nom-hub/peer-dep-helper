# Documentation for lib/output.js

## Purpose
This module handles output formatting and reporting for the peer-dep-helper CLI tool. It is responsible for presenting audit and fix results in a user-friendly way, supporting both human-readable and JSON output.

## Main Exports
- `formatReport(issues, config)`: Formats and prints the peer dependency issues report. Supports JSON and pretty output based on config.

## Usage Example
```js
const { formatReport } = require('../lib/output');
formatReport(issues, config);
```

## Implementation Notes
- Respects config options such as `json` and `silent`.
- Handles different issue statuses: `missing`, `version_mismatch`, `outdated`, `valid`.
- Designed to be called from CLI commands after scanning or fixing.