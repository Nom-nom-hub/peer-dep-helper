# Documentation for package/lib/stdio.js

## Purpose
Normalizes stdio options for process spawning, supporting aliases and IPC.

## Main Exports
- `normalizeStdio(options)`: Normalizes stdio settings for child processes.
- `normalizeStdioNode(options)`: Ensures IPC is included in stdio array.

## Usage Example
```js
import { normalizeStdio } from './stdio.js';
const stdio = normalizeStdio({ stdout: 'pipe' });
```

## Notes
- Used by execa to handle stdio configuration. 