# Project Plan: `peer-dep-helper` CLI Tool

## 1. Project Setup and Core Dependencies

*   **Initialize Node.js Project:** Create a `package.json` file.
*   **Install Core Dependencies:**
    *   `commander` (or `yargs`): For CLI parsing. I will choose `commander` for its simplicity.
    *   `chalk`: For color-coded terminal output.
    *   `semver`: For semantic version comparisons.
    *   `execa` (or `child_process`): For running `npm install` commands. I will choose `execa` for better promise-based API and error handling.
    *   `cosmiconfig`: For loading configuration files (`.peer-dep-helperrc`).
    *   `fs/promises`, `path`: Built-in Node.js modules for file system operations.
*   **Set up `bin` entry point:** Configure `package.json` to link `bin/index.js` as the `peer-dep-helper` command.

## 2. CLI Design (`bin/index.js`)

*   **Main Command:** `peer-dep-helper`
*   **Subcommands:**
    *   `audit`: Default subcommand if no other is specified. Scans and prints issues.
    *   `fix`: Scans, detects, and applies fixes.
*   **Global Options:**
    *   `--fix`: Boolean flag to automatically apply fixes (for `audit` command).
    *   `--json`: Boolean flag to output report as JSON.
    *   `--silent`: Boolean flag to suppress all terminal output except errors.
    *   `--cwd <path>`: String option to specify a custom working directory.
    *   `--strategy <strict|compatible|latest>`: String option for version resolution strategy (Advanced Feature).
*   **Configuration Loading:** Use `cosmiconfig` to load `.peer-dep-helperrc` (JSON/YAML) and merge with CLI flags.

## 3. Modular Code Structure (`lib/`)

*   **`lib/config.js`:**
    *   Responsible for parsing CLI arguments using `commander`.
    *   Loads configuration from `.peer-dep-helperrc` using `cosmiconfig`.
    *   Merges CLI arguments with config file settings, prioritizing CLI arguments.
    *   Exports a configuration object.
*   **`lib/utils.js`:**
    *   `detectPackageManager()`: Detects `npm`, `yarn`, or `pnpm` based on lock files or user preference.
    *   `semverCompare()`: Wrapper around `semver` functions for version comparison.
    *   `resolveVersionRange()`: Logic to compute the correct version range based on multiple demands and the chosen `--strategy`.
    *   `readPackageJson(path)`: Reads and parses a `package.json` file.
    *   `scanNodeModules(cwd)`: Recursively scans `node_modules` to find installed packages and their `package.json` files.
*   **`lib/scan.js`:**
    *   `detectPeerDependencyIssues(cwd)`:
        *   Reads the root `package.json`.
        *   Scans `node_modules` to identify all installed packages and their declared `peerDependencies`.
        *   For each `peerDependency`, checks if it's:
            *   Present in the root `node_modules`.
            *   Missing.
            *   Installed but with a wrong version (using `semver`).
        *   Classifies issues as `missing` or `version_mismatch`.
        *   Aggregates all detected issues into a structured array.
        *   Handles the `--strategy` for version resolution.
*   **`lib/fix.js`:**
    *   `applyFixes(issues, config)`:
        *   Filters issues that can be fixed (missing or version mismatch).
        *   Groups issues by package to install.
        *   Constructs appropriate `npm install`, `yarn add`, or `pnpm add` commands using `execa`.
        *   Executes commands.
        *   If `--write` is enabled, updates the root `package.json` with the new dependencies.
*   **`lib/output.js`:**
    *   `formatReport(issues, config)`:
        *   If `--json` is true, outputs the JSON structure as specified.
        *   Otherwise, generates clear, color-coded terminal output using `chalk`:
            *   Green ✅ for valid (if showing all).
            *   Yellow ⚠️ for version mismatches.
            *   Red ❌ for missing.
        *   Handles `--silent` flag to suppress output.

## 4. Workflow and Data Flow

```mermaid
graph TD
    A[CLI Entry Point: bin/index.js] --> B{Parse CLI Args & Load Config};
    B --> C[lib/config.js];
    C --> D{Command: audit or fix?};

    D -- audit --> E[lib/scan.js: detectPeerDependencyIssues];
    D -- fix --> E;

    E --> F[Scan node_modules & package.json];
    F --> G[Detect Peer Dependency Issues];
    G --> H[Classify Issues: missing, version_mismatch];
    H --> I[Resolve Correct Versions];

    I --> J{Output Mode: JSON or Terminal?};
    J -- JSON --> K[lib/output.js: JSON Format];
    J -- Terminal --> L[lib/output.js: Color-coded Terminal Format];

    H -- If fix command & --fix flag --> M[lib/fix.js: applyFixes];
    M --> N[Install Missing/Mismatched Dependencies];
    N --> O{Update package.json if --write};

    K --> P[End];
    L --> P;
    O --> P;
```

## 5. Testing Strategy (`tests/`)

*   **Unit Tests:** Use `jest` for unit testing individual modules (`scan.js`, `fix.js`, `utils.js`, `config.js`, `output.js`).
*   **Fixtures:** Create a `fixtures/` directory with various test projects (e.g., a project with missing peers, a project with version mismatches, a project with no issues, a monorepo example).
*   **Mocking:** Mock `fs/promises` and `child_process` (or `execa`) to simulate file system structures and command execution without actual file changes or installations.
*   **Test Cases:**
    *   Verify correct parsing of CLI arguments and config files.
    *   Test accurate detection and classification of peer dependency issues.
    *   Test version resolution logic with different strategies.
    *   Verify correct `npm install` commands are generated and executed (mocked).
    *   Test `package.json` updates in fix mode.
    *   Verify correct JSON and terminal output formats.

## 6. Advanced Features (Optional Phases)

*   **`--strategy` Implementation:** Integrate `strict`, `compatible`, and `latest` strategies into `lib/utils.js`'s `resolveVersionRange` function.
*   **Caching:** Implement caching of analysis results in `.peer-dep-helper-cache.json` to speed up repeated runs. This would involve `lib/scan.js` reading/writing to this file.
*   **Monorepo Support:** Extend `lib/scan.js` to detect workspaces (e.g., `yarn workspaces`, `pnpm workspaces`, `lerna`) and scan `package.json` files within them.

## 7. Documentation

*   **README.md:** Comprehensive documentation covering installation, usage, commands, options, configuration, and examples.