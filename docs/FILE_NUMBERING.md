# File Numbering

Numbered flat filenames are architecture ownership and Apps Script load-order aids. Every clasp-tracked root `.js` and `.html` file must have a numeric prefix, and every numeric prefix must be unique across those files.

## Accepted ranges

| Range | Ownership |
| --- | --- |
| `000`-`039` | Project metadata, configuration, schema, database, and bootstrap. |
| `040`-`069` | Repositories. |
| `070`-`099` | Server framework and utilities. |
| `100`-`135` | Services. |
| `136`-`149` | Maintenance and development utilities. |
| `150`-`169` | Controllers and server boundaries. |
| `800`-`899` | Tests and acceptance orchestration. |
| `900`-`949` | Page and layout templates. |
| `950`-`969` | Shared frontend and API infrastructure. |
| `970`-`999` | Presenters, forms, validators, components, and browser runtime. |

Documentation, tooling, `docs/`, `.ai/`, `.vscode/`, `appsscript.json`, and repository metadata do not require numeric prefixes.

## Policy

- Numeric prefixes must be unique; duplicate prefixes and production/test or frontend/test collisions are not allowed.
- Do not cosmetically renumber working files or fill gaps merely to make the inventory sequential.
- New clasp-tracked root `.js` and `.html` files use the next available unique logical number in the owning range.
- Renumber only for a concrete architecture or load-order reason, with an explicit allowlist and runtime validation.
- Numeric order remains an ownership and load-order aid, while explicit HTML include order in `900.View.Index.html` is authoritative for browser modules.
- Apps Script server file order can affect eager initialization, so server renames require source-contract, load-order, and Apps Script runtime validation.

`820.Tests.Aggregates.js` owns aggregate and shared test runners. `825.Tests.Acceptance.js` owns bounded acceptance orchestration.

## Rename rules

An HTML rename must atomically update `900.View.Index.html`, Application Health frontend registries, all `HtmlService` file references, and tests/source contracts. A server rename must update every symbol/file-name reference and validate forward/reverse initialization assumptions and test registries. Renames must not silently change public APIs, schemas, UI behavior, or deployment metadata.
