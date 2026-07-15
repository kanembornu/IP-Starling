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

## Change Rules

- Preserve existing behavior unless explicitly requested.
- Prefer full-file replacement only when the target file is structurally broken.
- Do not introduce new frameworks without explicit approval.
- Do not modify unrelated modules.
- Do not reference undeclared schemas, fields, or services.
- Keep Apps Script V8 compatibility.
- Do not use Node-only APIs.

## Validation

- Run available static tests.
- Apps Script runtime tests may require manual execution.
- Never claim runtime PASS unless the test was actually run.

## Required Final Response

Files changed

Tests run

PASS / FAIL

Issues found
