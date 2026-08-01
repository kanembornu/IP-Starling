# IP-Starling Coding Rules

## Project

Google Apps Script application using numbered flat files.
Do not create folders or rename numbered files unless explicitly requested.

## Architecture

- Repository handles sheet access.
- Service handles business rules.
- Controller exposes server functions.
- Presenter handles module-specific UI behavior.
- Shared Presenter contains reusable helpers only.

Application flow:

`UI -> App -> Presenter -> Shared Presenter / Render / Components -> API -> Controller -> Service -> Repository -> Database`

- App coordinates application state and workflows.
- Presenters render module-specific UI.
- Components generate reusable UI.
- Repository accesses spreadsheets.
- Keep business logic out of Shared Presenter.

## Reference Modules

Inspect existing implementations in this preferred order when applicable:

1. Products
2. Partners
3. Expenses
4. Purchasing
5. Pickup
6. Return

## Change Rules

- Preserve existing behavior unless explicitly requested.
- Make minimal changes and follow existing style.
- Continue the existing architecture; do not redesign the project.
- Inspect similar modules and reuse established patterns before implementing.
- Prefer full-file replacement only when the target file is structurally broken.
- Do not perform large refactors or rewrite working code.
- Do not introduce new frameworks without explicit approval.
- Do not add unnecessary dependencies.
- Do not modify unrelated modules.
- Do not rename public APIs or introduce breaking changes.
- Do not change the backend, database, or schema unless explicitly requested.
- Do not reference undeclared schemas, fields, or services.
- Keep Apps Script V8 compatibility.
- Do not use Node-only APIs.

## Workflow

- Read this canonical instruction file and the current module before implementing.
- Self-review completed changes.
- Never commit, deploy, or push unless explicitly requested.

## Coding Priority

1. Consistency
2. Stability
3. Readability
4. Performance
5. Optimization

## Rendering and Search

- Reuse existing rendering and formatting helpers, including `Components.badge()`, `Components.empty()`, `Components.loading()`, `Components.tableRow()`, `Components.tableCell()`, `Format.currency()`, `Format.number()`, and `Utils.escapeHTML()`.
- Do not create alternative rendering styles when an established helper applies.
- Keep search client-side: filter application state without calling an API, then render through the module presenter.

## Validation

- Run available static tests.
- Apps Script runtime tests may require manual execution.
- Never claim runtime PASS unless the test was actually run.

Before completing a task, verify as applicable:

- No console errors.
- No undefined functions.
- Existing modules still work.
- Architecture is preserved.
- No duplicated logic was introduced.

## Required Final Response

Files changed

Tests run

PASS / FAIL

Issues found

## Addition

- Duplicate numeric prefixes are allowed.
- Ordering is determined by filename, not by numeric uniqueness.
- New files should use the next available logical number.
