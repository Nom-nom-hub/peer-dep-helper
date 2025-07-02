# Fixtures Documentation

## Purpose
The `fixtures/` directory contains sample projects used for integration and unit testing. These projects simulate real-world dependency scenarios, such as missing peers, version mismatches, and monorepo setups.

## Structure
- Each subdirectory in `fixtures/` is a standalone Node.js project with its own `package.json`.
- Used by integration and some unit tests to verify tool behavior.

## Adding a New Fixture
1. Create a new subdirectory under `fixtures/` (e.g., `fixtures/my-new-project/`).
2. Add a `package.json` and any other files needed to simulate the scenario.
3. Reference the new fixture in your test code as needed.

## Best Practices
- Keep fixtures minimal and focused on the scenario being tested.
- Use descriptive names for fixture directories. 