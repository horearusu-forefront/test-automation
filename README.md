# TRR website tests

This repository contains Playwright tests for accessibility and mobile orientation behavior on trr.se. The tests use `@playwright/test` and Axe.

## Requirements

- Node.js and npm
- A Chromium browser supported by Playwright, or a local Chromium executable configured with `CHROMIUM_PATH`

Install the project dependencies with:

```sh
npm ci
```

## Running tests

Run the complete suite:

```sh
npm test
```

Run only the accessibility test:

```sh
npm run test:a11y
```

You can also run a specific test file directly:

```sh
npx playwright test tests/orientation.spec.ts
npx playwright test tests/helpers.selfcheck.spec.ts
```

By default, the Playwright `baseURL` is `https://www.trr.se`. Override it for tests that use a relative path with the `BASE_URL` environment variable:

```sh
BASE_URL=https://staging.example.com npm test
```

Set `CHROMIUM_PATH` to use a specific Chromium executable:

```sh
CHROMIUM_PATH=/path/to/chromium npm test
```

The suite uses the Playwright list reporter and also writes an HTML report. Open the report with:

```sh
npx playwright show-report
```

## Test coverage

### `tests/a11y.spec.ts`

Loads the home page (`/`) and checks it with Axe for violations tagged WCAG 2.0 and 2.1, Level A and AA. The test expects the violations list to be empty.

### `tests/orientation.spec.ts`

Checks the TRR career guidance page (`https://www.trr.se/privatperson/karriarvagledning/`) in mobile portrait and landscape viewports. It checks for CSS patterns that lock the page to one orientation and compares visible text and interactive elements between the two viewports. The page URL is configured directly in this test; `BASE_URL` does not change it.

### `tests/helpers.selfcheck.spec.ts`

Tests the orientation helpers against local HTML content rather than the live website. It verifies that a clean page has no detected orientation locks and equivalent portrait/landscape snapshots, and that sample CSS which rotates the page or hides an interactive element is detected.

### `tests/helpers/orientation.ts`

Shared test utilities used by the orientation tests:

- `snapshot` collects visible interactive elements and text.
- `findOrientationLocks` checks stylesheets and computed root styles for common orientation-locking patterns.
- `diff` returns entries present in one snapshot but not another.
