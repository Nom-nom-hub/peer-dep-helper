# Documentation for package/lib/stream.js

## Purpose
Handles input/output streams for spawned processes, including piping, merging, and buffering.

## Main Exports
- `handleInput(spawned, input)`: Pipes or writes input to a process.
- `makeAllStream(spawned, options)`: Merges stdout and stderr into a single stream.
- `getSpawnedResult(spawned, options, processDone)`: Collects process results and buffered output.
- `validateInputSync(options)`: Validates input for sync processes.

## Usage Example
```js
import { handleInput, makeAllStream } from './stream.js';
handleInput(proc, input);
```

## Notes
- Used by execa for advanced stream handling. 