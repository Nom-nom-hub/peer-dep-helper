# Testing Documentation

## Overview
The project uses Jest for both unit and integration testing. Tests ensure the correctness of peer dependency scanning, fixing, and CLI behavior.

## Test Structure
- `tests/`: Contains unit tests for core modules (e.g., scan, utils).
- `test/integration.cli.js`: Integration tests for the CLI, simulating real user scenarios.
- `test/integration-tmp/`: Temporary directory for integration test runs.
- `fixtures/`: Contains sample projects used as test fixtures.

## Running Tests
To run all tests:
```sh
npm test
# or
yarn test
```

## Fixtures
- Located in `fixtures/`.
- Each subdirectory is a sample project with its own `package.json`.
- Used to simulate real-world dependency scenarios.

## Mocking
- `fs/promises` and `execa` are mocked in tests to avoid real file system or process changes.
- Mocks are set up in each test or in global `beforeEach` as needed.

## Adding New Tests
- Add new unit tests to `tests/`.
- Add new integration scenarios to `test/integration.cli.js` and create new fixture projects if needed. 