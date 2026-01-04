# AGENTS.md

## Development Workflow

* Set up your environment with `pnpm install`. Do not use `npm install`.
* Run the project unit tests with `pnpm test`.
* Run the integration tests with `pnpm test:live`.
* Lint your changes with `pnpm lint`.
* Start a local development server (blocking) with `pnpm dev`.

## Requirements

* Always unit test changes for logic you introduce.
* Do not introduce new lint errors.

## Pull Requests

* Make sure all tests pass and lint is clean before opening a pull request.
