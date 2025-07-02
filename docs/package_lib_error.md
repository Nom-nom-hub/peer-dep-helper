# Documentation for package/lib/error.js

## Purpose
Defines error creation and normalization logic for process execution errors.

## Main Exports
- `makeError({ ... })`: Creates a rich error object for failed processes, including stdout, stderr, exit code, and more.

## Usage Example
```js
import { makeError } from './error.js';
try {
  // ...
} catch (err) {
  throw makeError({ ... });
}
```

## Notes
- Used by execa to provide detailed error information.
- Handles signals, timeouts, and cancellation. 