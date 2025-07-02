# Documentation for lib/config.js

## Purpose
This module is responsible for loading and merging configuration options for the peer-dep-helper tool. It supports config files and CLI overrides.

## Main Exports
- `loadConfig(cliOptions, commandOptions)`: Loads and merges configuration from .peer-dep-helperrc and CLI flags.

## Usage Example
```js
const { loadConfig } = require('../lib/config');
const config = await loadConfig(cliOptions, commandOptions);
```

## Implementation Notes
- Uses cosmiconfig to load config files.
- CLI flags always override config file values.
- Supports options: `cwd`, `ignore`, `strategy`, `silent`, etc.
- Returns a normalized config object for use by scan/fix/output modules.

This file is responsible for loading and merging configuration options.

It uses `cosmiconfig` to load configuration from `.peer-dep-helperrc` files and merges them with command-line options.

The configuration options are:

*   `cwd`: Current working directory.
*   `ignore`: List of packages to ignore.