# Documentation for package/lib/command.js

## Purpose
Provides argument normalization and command string utilities for process execution.

## Main Exports
- `joinCommand(file, args)`: Joins file and arguments into a command string.
- `getEscapedCommand(file, args)`: Joins and escapes arguments for safe shell usage.
- `parseCommand(command)`: Parses a command string into tokens, handling escaped spaces.

## Usage Example
```js
import { joinCommand, getEscapedCommand, parseCommand } from './command.js';
const cmd = joinCommand('echo', ['hello world']);
```

## Notes
- Used internally by execa for safe process spawning. 