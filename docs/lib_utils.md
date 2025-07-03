# Documentation for lib/utils.js

## Purpose
This module provides utility functions used throughout the peer-dep-helper tool, including file reading, version resolution, workspace detection, and semver helpers.

## Main Exports
- `readPackageJson(dir)`: Reads and parses a package.json file from the given directory.
- `scanNodeModules(dir)`: Scans node_modules to collect installed package versions.
- `resolveVersionRange(ranges, strategy)`: Resolves a version range from multiple demands and a strategy.
- `semver`: Exposes semver utilities.
- `detectWorkspaces(dir)`: Detects monorepo workspaces.
- `getLatestVersion(pkg)`: Gets the latest version of a package from the registry.

## Usage Example
```js
const { readPackageJson, scanNodeModules } = require('../lib/utils');
const pkg = await readPackageJson(process.cwd());
```

## Implementation Notes
- Used by scan, fix, and config modules.
- Handles edge cases for missing or malformed files.
- Uses async/await for all file and network operations.

# Utils Module

The utils module provides core utility functions for the peer dependency helper tool.

## Functions

### `loadTheme(configPath, cliFlags, envVars)`

Loads and merges theme configuration from multiple sources with priority order:
1. CLI flags (highest priority)
2. Environment variables
3. Config file
4. Default theme (lowest priority)

**Parameters:**
- `configPath` (string): Path to config file
- `cliFlags` (object): CLI flags object
- `envVars` (object): Environment variables object

**Returns:** Theme object with merged configuration

**Example:**
```javascript
const theme = loadTheme('./config.json', { theme: 'dark' }, { THEME_MINIMAL: 'true' });
```

### `getThemePreset(presetName)`

Gets a predefined theme preset by name.

**Parameters:**
- `presetName` (string): Name of the theme preset

**Returns:** Theme object or null if preset not found

**Available Presets:**

#### Popular Themes
- **dark** - Dark theme: blue, cyan, white
- **light** - Light theme: white, blue, gray  
- **minimal** - Minimal theme: gray, no emoji, minimal output
- **colorful** - Colorful theme: rainbow colors, emoji enabled
- **monokai** - Monokai: green, pink, yellow, black (bold boxes)
- **githubdark** - GitHub dark: gray, blue, white (double boxes)
- **githublight** - GitHub light: white, blue, gray (single boxes)
- **tokyonight** - Tokyo Night: indigo, cyan, magenta (double boxes)
- **ayudark** - Ayu dark: orange, yellow, gray (classic boxes)
- **ayulight** - Ayu light: light yellow, blue, gray (single boxes)

#### Nature-Inspired Themes
- **forest** - Forest: green, brown, beige (round boxes)
- **rosepine** - Rose Pine: rose, pine green, gold (double boxes)
- **catppuccin** - Catppuccin: mauve, peach, teal, latte (round boxes)
- **everforest** - Everforest: green, brown, yellow (classic boxes)

#### Professional Themes
- **nightowl** - Night Owl: blue, green, yellow (double boxes)
- **onedark** - One Dark: blue, cyan, magenta, gray (bold boxes)
- **draculapro** - Dracula Pro: pink, purple, cyan, yellow (double boxes)
- **arcdark** - Arc Dark: blue, teal, gray (single boxes)
- **material** - Material: blue, teal, orange (double boxes)
- **highcontrast** - High contrast: black, white, yellow (bold boxes, no emoji)

#### Special Themes
- **peerdephelper** - **Signature theme**: modern cyan & magenta, round boxes, and a friendly vibe!
- **retro** - Retro terminal: yellow, green, classic boxes, no emoji
- **elegant** - Elegant: white, gray, single-double boxes, no emoji
- **playful** - Playful: magenta, cyan, arrow boxes, with emoji
- **corporate** - Corporate: blue, gray, double-single boxes, no emoji

### Box Styles

The tool supports various box styles for output formatting:

- **round** - Rounded corners (default)
- **single** - Single line borders
- **double** - Double line borders  
- **bold** - Bold borders
- **classic** - Classic ASCII box style
- **singleDouble** - Single top/bottom, double sides
- **doubleSingle** - Double top/bottom, single sides
- **arrow** - Arrow-style borders

**Example:**
```javascript
// Using different box styles
const theme = {
  primaryColor: 'cyan',
  secondaryColor: 'magenta', 
  boxStyle: 'arrow',  // Try 'round', 'bold', 'double', etc.
  useEmojis: true,
  minimal: false
};
```

### Theme Configuration

Each theme object contains:

```javascript
{
  primaryColor: 'cyan',      // Main color for headers and important info
  secondaryColor: 'magenta', // Secondary color for details
  boxStyle: 'round',         // Box border style
  useEmojis: true,          // Whether to use emoji icons
  minimal: false,           // Minimal output mode
  name: 'Theme Name',       // Display name
  description: 'Description' // Theme description
}
```

### Configuration Sources

#### 1. Config File
Create a JSON file (e.g., `peer-dep-helper.json`):
```json
{
  "theme": "peerdephelper",
  "primaryColor": "cyan",
  "secondaryColor": "magenta",
  "boxStyle": "round",
  "useEmojis": true,
  "minimal": false
}
```

#### 2. Environment Variables
```bash
export THEME_NAME="peerdephelper"
export THEME_PRIMARY_COLOR="cyan"
export THEME_SECONDARY_COLOR="magenta"
export THEME_BOX_STYLE="round"
export THEME_USE_EMOJIS="true"
export THEME_MINIMAL="false"
```

#### 3. CLI Flags
```bash
peer-dep-helper audit --theme peerdephelper --primary-color cyan --box-style round
```

### Branded Theme: Peer Dep Helper

The signature **"Peer Dep Helper"** theme features:
- **Primary Color**: Cyan - for headers and important information
- **Secondary Color**: Magenta - for details and secondary text
- **Box Style**: Round - modern rounded corners for a friendly feel
- **Emojis**: Enabled - adds personality and visual appeal
- **Minimal**: Disabled - provides rich, informative output

This theme embodies the tool's philosophy of being both powerful and user-friendly, with a modern aesthetic that stands out while remaining professional.

**Usage:**
```bash
# Use the branded theme
peer-dep-helper audit --theme peerdephelper

# Or set it as default in config
echo '{"theme": "peerdephelper"}' > peer-dep-helper.json
```

### Creating Custom Themes

You can create custom themes by extending existing presets or defining new ones:

```javascript
// Extend the branded theme
const customTheme = {
  ...getThemePreset('peerdephelper'),
  primaryColor: 'green',
  boxStyle: 'bold'
};

// Or create from scratch
const myTheme = {
  primaryColor: 'yellow',
  secondaryColor: 'blue', 
  boxStyle: 'double',
  useEmojis: true,
  minimal: false,
  name: 'My Custom Theme',
  description: 'A custom theme I created'
};
```