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

# Theme Customization

peer-dep-helper supports a fully customizable CLI theme with beautiful presets! You can control colors, box styles, emoji usage, and minimal mode via config files, CLI flags, environment variables, or predefined themes.

## Quick Start

Choose a theme preset:
```bash
peer-dep-helper audit --theme-preset dracula
```

List all available themes:
```bash
peer-dep-helper theme list
```

Preview a theme:
```bash
peer-dep-helper theme preview matrix
```

## Theme Presets

peer-dep-helper comes with 10 beautiful predefined themes:

| Preset | Description | Colors | Box Style | Emoji |
|--------|-------------|--------|-----------|-------|
| `default` | Clean and modern with cyan and green accents | cyan + green | round | ✅ |
| `dracula` | Dark and elegant with magenta and yellow | magenta + yellow | double | ✅ |
| `matrix` | Classic terminal green with no emoji | green + black | classic | ❌ |
| `pastel` | Soft and friendly with blue and magenta | blue + magenta | single | ✅ |
| `sunset` | Warm and vibrant with red and yellow | red + yellow | round | ✅ |
| `ocean` | Cool and calming with cyan and blue | cyan + blue | single | ✅ |
| `neon` | Bright and futuristic with green and cyan | green + cyan | double | ✅ |
| `classic` | Traditional terminal style with no emoji | white + gray | classic | ❌ |
| `minimal` | Plain text output for CI and accessibility | gray + gray | single | ❌ |
| `rainbow` | Colorful and playful with magenta and cyan | magenta + cyan | round | ✅ |

## Config File

You can create a `.peer-dep-helperrc` (JSON/YAML) or `peer-dep-helper.config.js` in your project root or home directory.

### Using a Preset
```json
{
  "theme": {
    "preset": "dracula"
  }
}
```

### Custom Theme
```json
{
  "theme": {
    "primaryColor": "magenta",
    "secondaryColor": "yellow",
    "boxStyle": "double",
    "useEmojis": false,
    "minimal": false
  }
}
```

### Override a Preset
```json
{
  "theme": {
    "preset": "dracula",
    "boxStyle": "round"
  }
}
```

## CLI Flags

Override theme options on the command line:

```bash
# Use a preset
peer-dep-helper audit --theme-preset matrix

# Custom colors and style
peer-dep-helper audit --theme-primary magenta --box-style double --no-emoji

# Minimal mode
peer-dep-helper fix --minimal
```

Available flags:
- `--theme-preset <preset>` - Use a predefined theme preset
- `--theme-primary <color>` - Primary theme color
- `--theme-secondary <color>` - Secondary theme color
- `--box-style <style>` - Box border style (round, single, double, classic, etc.)
- `--no-emoji` - Disable emoji in output
- `--minimal` - Minimal output (no color, no boxes, no emoji)

## Environment Variables

You can also set theme options via environment variables:

- `PEER_DEP_HELPER_THEME_PRESET` - Theme preset name
- `PEER_DEP_HELPER_THEME_PRIMARY_COLOR` - Primary color
- `PEER_DEP_HELPER_THEME_SECONDARY_COLOR` - Secondary color
- `PEER_DEP_HELPER_THEME_BOX_STYLE` - Box style
- `PEER_DEP_HELPER_THEME_USE_EMOJIS` - `false` to disable emoji
- `PEER_DEP_HELPER_THEME_MINIMAL` - `true` for minimal mode

## Theme Commands

### List Themes
```bash
peer-dep-helper theme list
```
Shows all available theme presets with descriptions and settings.

### Preview Theme
```bash
peer-dep-helper theme preview dracula
```
Shows a preview of how the theme will look in your terminal.

## Precedence

1. CLI flags
2. Environment variables
3. Config file
4. Defaults

## Minimal Mode

For CI or accessibility, use `--minimal` or set `minimal: true` in your config. This disables all color, boxes, and emoji for plain, script-friendly output.

## Creating Custom Themes

You can create your own themes by extending the existing system:

```javascript
// peer-dep-helper.config.js
module.exports = {
  theme: {
    primaryColor: 'your-color',
    secondaryColor: 'your-color',
    boxStyle: 'your-style',
    useEmojis: true,
    minimal: false
  }
};
```

Supported colors: Any chalk-supported color (red, green, blue, cyan, magenta, yellow, white, gray, black, etc.)

Supported box styles: `round`, `single`, `double`, `classic`, `bold`, `singleDouble`, `doubleSingle`, `arrow`