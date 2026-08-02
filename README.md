# IP-Starling

IP-Starling is an inventory, purchasing, and operational management application built on Google Apps Script with Google Sheets as its database. The browser client is a single-page interface backed by layered server-side services.

## Current status

The current development version is **1.1.0-dev**. The latest stable release is **1.0.0**, and the production deployment remains on v1.0.0. Development source may be ahead of production and does not imply that 1.1.0 has been released.

## Core features

- Inventory and partner master-data management
- Pickup, return, purchasing, and expense workflows
- Dashboard summaries and operational activity views
- Soft-delete and restore flows, audit logging, settings, and diagnostics
- Application Health and staged acceptance checks
- Controlled development seed and maintenance utilities

## Current modules

- Dashboard
- Products
- Partners
- Pickups
- Returns
- Purchasing
- Expenses
- Settings
- Logs
- Application Health

## Architecture

The primary request flow is:

```text
UI → App → Presenter → API → Controller → Service → Repository → Database
```

Repositories own spreadsheet access, services own business rules, controllers expose server functions, and presenters own module-specific rendering. See [AGENTS.md](AGENTS.md) for the canonical repository rules and [Architecture](docs/ARCHITECTURE.md) for the detailed current design.

## Technology stack

- Google Apps Script (V8 runtime)
- Google Sheets
- HTML, CSS, and browser JavaScript
- Tailwind CSS and Chart.js
- Git and `clasp`

## Repository structure

The project uses numbered flat files because Apps Script ordering is filename-based:

- `00`-`39`: project metadata, configuration, schema, database, and bootstrap
- `40`-`69`: repositories
- `70`-`99`: server framework
- `100`-`135`: services
- `136`-`149`: maintenance and development utilities
- `150`-`199`: controllers and server boundaries
- `900`-`989`: frontend templates and browser runtime
- `990`-`999`: retained compatibility zone for frontend shared modules and tests
- `docs/`: authoritative detailed technical documentation

Duplicate prefixes are allowed; full filenames determine order. Do not cosmetically renumber files or create source folders. See [File Numbering](docs/FILE_NUMBERING.md).

## Setup prerequisites

- A Google account with access to an Apps Script project and its backing spreadsheet
- Node.js and npm, used to install the Google clasp CLI
- `clasp` authenticated for the intended Google account
- A local `.clasp.json` that points to the intended script project

This repository does not provide credentials or create the production spreadsheet automatically.

## Local development with clasp

1. Clone the repository and enter its directory.
2. Install or make `clasp` available locally.
3. Authenticate with `clasp login` if needed.
4. Confirm `.clasp.json` targets the intended Apps Script project.
5. Review changes and run the relevant static checks before upload.
6. Use `clasp push` only when you are authorized to update that script project.

Detailed workflows: [Development](docs/DEVELOPMENT.md) and [Deployment](docs/DEPLOYMENT.md).

## Apps Script deployment overview

`clasp push` uploads source; it does not prove runtime acceptance and does not create a release by itself. Web-app deployment and version creation are explicit Apps Script release operations and should be performed only after the acceptance gates pass.

## Testing and acceptance

Run the following functions manually in Apps Script, in order as appropriate:

- `runAcceptanceFast()` — focused fast checks
- `runAcceptanceStandard()` — core, backend, and health contracts
- `runAcceptanceFrontend()` — frontend integration contracts
- `runAcceptanceHealth()` — health contracts and live health reports
- `runAcceptanceRelease()` — returns the manual release acceptance plan; it does not execute the plan

Browser smoke testing is still required for user-visible workflows. Before release preparation, Application Health must report `FAIL = 0`.

See [Testing and Acceptance](docs/TESTING_AND_ACCEPTANCE.md).

## Maintenance and seed safety

Maintenance, repair, reset, and seed functions may affect spreadsheet data or Script Properties. Preview first where supported, verify the target environment and scope, preserve backups, and never run destructive functions automatically.

See [Maintenance](docs/MAINTENANCE.md) for the source-grounded function matrix.

## Release and versioning

- [`VERSION`](VERSION) is the canonical release-development version.
- `APP_CONFIG.VERSION` must match `VERSION` for runtime display.
- `APP_CONFIG.BUILD` is a descriptive build label.
- [`CHANGELOG.md`](CHANGELOG.md) is the canonical changelog.
- Releases follow [Semantic Versioning](https://semver.org/).

The full release checklist is in [Release](docs/RELEASE.md). Current and future project phases are tracked in the [Roadmap](docs/ROADMAP.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the branch, coding, testing, and release workflow. The canonical repository instructions are in [AGENTS.md](AGENTS.md).

## License

Licensed under the [MIT License](LICENSE).
