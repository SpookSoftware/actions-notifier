# CICD Workflow Notifications - Developer Guide

## Build Commands
- `bun run build`: Build the Chrome extension for development
- `bun run build:production`: Build Chrome extension with minification and console.log removal
- `bun run build:firefox`: Build Firefox extension for development
- `bun run build:firefox:production`: Build Firefox extension with minification and console.log removal
- `bun run dev`: Start a watcher that rebuilds on file changes

## Test Commands
- `bun test`: Run unit tests
- `bun test tests/unit/helpers.test.ts`: Run a specific unit test file
- `playwright test`: Run all integration tests
- `playwright test tests/integration/selectors.spec.ts`: Run specific integration tests

## Environment Setup
- Install Bun: https://bun.sh/
- Requires [Extensions Reloader](https://chromewebstore.google.com/detail/extensions-reloader/fimgfedafeadlieiabdeeaodndnlbhid) for `bun run dev`
- For integration tests set `SANDBOX_REPO_GITHUB_TOKEN` environment variable

## Code Style Guidelines
- Use TypeScript for type safety
- Imports: group imports by source (internal, external)
- Use async/await rather than promises
- Error handling: always use try/catch blocks with descriptive error messages
- Use descriptive variable and function names
- Add tests for all new functionality
- Use functional programming style where appropriate

## Project Structure
- `/src`: Source code
- `/tests/unit`: Unit tests using Bun test
- `/tests/integration`: Integration tests using Playwright
- `/scripts`: Build and utility scripts