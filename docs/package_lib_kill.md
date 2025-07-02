# Documentation for package/lib/kill.js

## Purpose
Implements process killing, timeout, and cleanup logic for spawned processes.

## Main Exports
- `spawnedKill(kill, signal, options)`: Kills a process, optionally with force after a timeout.
- `spawnedCancel(spawned, context)`: Cancels a spawned process.
- `setupTimeout(spawned, options, spawnedPromise)`: Sets up a timeout for a process.
- `validateTimeout(options)`: Validates timeout options.
- `setExitHandler(spawned, options, timedPromise)`: Ensures cleanup on process exit.

## Usage Example
```js
import { spawnedKill, setupTimeout } from './kill.js';
spawnedKill(proc.kill.bind(proc));
```

## Notes
- Used by execa for robust process management. 