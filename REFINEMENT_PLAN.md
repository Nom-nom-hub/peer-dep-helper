# Refinement Plan for Advanced Features: `peer-dep-helper`

This document outlines the plan for refining existing advanced features of the `peer-dep-helper` CLI tool.

## 1. `--strategy` Implementation (in `lib/utils.js`)

*   **Refinement Goal:** Improve the robustness of `strict` and `compatible` strategies to handle more complex semver ranges and provide a more accurate intersection. For `latest`, re-evaluate if a network call is truly out of scope or if a more sophisticated local resolution (e.g., based on installed versions) could be implemented.
*   **Action:**
    *   Review `semver` library capabilities for advanced range intersection.
    *   Consider edge cases for `strict` and `compatible` strategies (e.g., disjoint ranges).
    *   If network access is still out of scope for `latest`, document this limitation clearly and perhaps suggest a future enhancement.
*   **Testing:** Add new unit tests to `tests/utils.test.js` to cover the refined logic for `strict` and `compatible` strategies, including edge cases.

## 2. Caching (in `lib/scan.js`)

*   **Refinement Goal:** Enhance cache invalidation logic. The current timestamp-based invalidation might not be sufficient if `package.json` files or `node_modules` change within the 5-minute window.
*   **Action:**
    *   Implement a more robust cache invalidation mechanism, possibly by hashing `package.json` contents or checking file modification times of relevant files (`package.json`, lock files, `node_modules` directories).
    *   Consider a mechanism to explicitly clear the cache via a CLI option.
*   **Testing:** Add unit tests to `tests/scan.test.js` (or create if it doesn't exist) to verify cache reading, writing, and invalidation logic.

## 3. Monorepo Support (in `lib/utils.js` and `lib/scan.js`)

*   **Refinement Goal:** Improve the accuracy and completeness of monorepo detection, especially for pnpm, which can have more complex workspace configurations. Ensure all relevant `package.json` files within a monorepo are scanned for peer dependencies.
*   **Action:**
    *   For pnpm, consider parsing `pnpm-workspace.yaml` to accurately determine workspace paths, rather than relying on common directory names.
    *   Ensure that nested workspaces (if supported by package managers) are correctly handled.
    *   Verify that peer dependencies declared in root `package.json` and hoisted dependencies are correctly identified and resolved across the monorepo.
*   **Testing:** Add new test cases to `tests/utils.test.js` for improved monorepo detection, including pnpm-specific scenarios and nested workspaces.