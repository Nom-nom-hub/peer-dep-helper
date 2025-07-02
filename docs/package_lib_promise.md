# Documentation for package/lib/promise.js

## Purpose
Provides utilities to merge child process and Promise interfaces, and to handle process completion as a promise.

## Main Exports
- `mergePromise(spawned, promise)`: Mixes Promise methods into a child process object.
- `getSpawnedPromise(spawned)`: Returns a promise that resolves/rejects on process exit/error.

## Usage Example
```js
import { mergePromise, getSpawnedPromise } from './promise.js';
const proc = ...;
mergePromise(proc, promise);
```

## Notes
- Used by execa to allow `await` on spawned processes. 