# IP-Starling — Project History and Development Summary

## Purpose

This document records the development journey of IP-Starling from its initial Google Apps Script and Google Sheets foundation through the stable `v1.0.0` release and the transition to `1.1.0-dev`. It is intended as the primary reference when development resumes after a pause.

## Current State

- Latest stable release: `v1.0.0`
- Stable Git release commit: `73fc422`
- Stable Apps Script immutable version: `233`
- Production versioned deployment: pinned to Apps Script version `233`
- Current branch: `main`
- Current development version: `1.1.0-dev`
- Current development build: `Development`
- Release Readiness at release: `PASS`
- Application Health at release: `FAIL = 0`
- Browser acceptance at release: `PASS`
- Browser console at release: clean

Production must remain pinned to version `233` until a future release is explicitly prepared, tested, and approved.

## Product Scope

IP-Starling is a Google Apps Script web application backed by Google Sheets. The stable release includes:

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
- Development and guarded maintenance utilities

## Technology Stack

- Google Apps Script
- Google Sheets
- HTML templates
- TailwindCSS
- Chart.js
- Git and GitHub
- clasp

## Final Architecture

The final dependency direction is:

`UI → App → Presenter → Shared Presenter / Render / Components → API → Controller → Service → Repository → Database`

Key ownership rules:

- Controllers own transport and sanitized error boundaries.
- Services own business rules and orchestration.
- Repositories own persistence and physical data access.
- Presenters remain render-focused.
- Maintenance functions are isolated from tests and never run automatically.
- Application Health is a documented diagnostic exception.

## Core Data Model

### Products

Core fields include ID, name, category, unit, price, deletion state, activity state, and audit fields.

### Partners

Core fields include ID, name, address, phone, type, deletion state, activity state, and audit fields.

### Pickup Headers and Details

Pickup uses header/detail records. Pickup Details store immutable historical `Harga` and `Total` values so later Product price changes cannot alter historical transaction value.

### Returns

Returns reference both Pickup Header and Pickup Detail and enforce ownership and quantity integrity.

### Purchases

Purchasing stores date, supplier, product, quantity, price, total, state, and audit fields.

### Expenses

Expenses store date, category, description, nominal value, state, and audit fields.

### Settings, Logs, and Idempotency

Settings store application configuration. Logs store audit and system events. Idempotency records protect critical create operations from duplicate submissions and conflicting replay.

## Development Phases

## Foundation

The initial foundation established configuration, schema, database access, repositories, framework services, ID generation, validation, response envelopes, caching, and base CRUD behavior.

Important outcomes:

- reusable repository access
- soft delete and restore
- audit fields
- deterministic IDs
- cache support
- validation and response contracts
- service hooks

## Business Services

The following services were implemented and stabilized:

- ProductService
- PartnerService
- PickupService
- ReturnService
- PurchasingService
- ExpenseService
- SettingsService
- LogsService
- DashboardService
- ApplicationHealthService
- IdempotencyService

Safeguards include validation before mutation, lock-based writes, rollback behavior, cache invalidation after successful persistence, historical valuation, duplicate-write protection, and atomic transaction boundaries.

## Frontend Development

The browser application was organized into page templates, runtime modules, presenters, forms, validators, API bridge, modal/dialog/toast utilities, pagination, rendering, and shared components.

The authoritative include order is defined in `900.View.Index.html`.

Important runtime rule:

- `993.View.Events.Runtime.html` immediately precedes
- `994.View.App.Runtime.html`
- App remains the final browser runtime module

App and Events have a deliberate deferred runtime cycle. Event handlers call App only after initialization; App calls `Events.init()` after `window.load`.

## Dashboard and UI Modernization

The application received:

- a modern full-width workspace
- aligned sidebar and header
- responsive KPI cards
- dark and light themes
- synchronized filters
- line, bar, and donut charts
- improved loading and error states
- modal-based details
- consistent forms and page headers
- nominal input formatting
- date handling corrections
- improved pagination
- improved grid readability

## Phase 5A — Stabilization

### Lazy Test Registries

Eager test registries were replaced with lazy accessors while preserving runner names, group names, counts, order, duplicate-registration checks, and fail-fast behavior.

### Initialization Order

Cross-file eager initialization and load-time Apps Script service acquisition were removed. Config, Schema, repositories, ID generation, Logs metadata, Application Health, and seed metadata now initialize safely.

### Global Namespace

A strict audit confirmed no remaining duplicate global declarations.

### Error Handling

Unexpected errors are sanitized for browser callers, logged internally once, and no raw stack trace is exposed publicly. Existing validation and business-rule errors remain deterministic.

### Data Integrity

Key corrections included:

- atomic Purchasing restore
- lock-safe Return mutations
- historical price and total validation
- sequence repair
- dynamic Return PickupID repair
- browser-safe date serialization
- no partial mutation after failure

## Phase 5B — Architecture Cleanup

### Idempotency Split

`IdempotencyRepository` now owns persistence only. `IdempotencyService` owns validation, hashing, state transitions, replay, recovery, timeout, retention, locks, and response reconstruction.

### Logs Split

`LogsRepository` owns physical Logs storage and inspection. `LogsService` owns filtering, classification, pagination, summaries, response construction, and audit semantics.

### Logs–Settings Decoupling

The previous service cycle was removed through a narrow log-level provider seam.

### Maintenance Extraction

Operational diagnostics and migrations were moved from test files into dedicated maintenance modules.

### Controller Invariant Consolidation

Pickup and Return create invariants moved into Services. Public and internal create paths now converge on a single canonical implementation.

## Phase 5C — Repository Normalization

Final source ranges:

- `000–039` project, config, schema, database, bootstrap
- `040–069` repositories
- `070–099` server framework and utilities
- `100–135` services
- `136–149` maintenance and development
- `150–169` controller boundaries
- `800–899` tests and acceptance
- `900–949` page and layout templates
- `950–969` shared frontend and API infrastructure
- `970–999` presenters, forms, validators, components, and browser runtime

Final guarantees:

- every clasp-tracked `.js` and `.html` source has a numeric prefix
- every source prefix is unique
- no tests remain in the frontend range
- no frontend files remain in the test range
- all Index includes resolve exactly once
- Git and clasp source inventories match

Important renames include:

- `820.Tests.Aggregates.js` for aggregate/shared test runners
- `825.Tests.Acceptance.js` for bounded acceptance orchestration
- all tests migrated into `800–899`
- Dashboard moved to `915.View.Dashboard.html`
- browser runtime filenames normalized for clearer ownership

## Testing and Acceptance

Permanent bounded entry points:

- `runAcceptanceFast()`
- `runAcceptanceStandard()`
- `runAcceptanceFrontend()`
- `runAcceptanceHealth()`
- `runAcceptanceRelease()`

The system is stateless, bounded, deterministic, fail-fast, and does not persist progress in ScriptProperties.

Release gate:

1. `runAcceptanceFast()`
2. `runAcceptanceStandard()`
3. `runAcceptanceFrontend()`
4. `runAcceptanceHealth()`
5. `runReleaseReadinessTests()`
6. `runApplicationHealthCheckSummary()`

Required outcome:

- all runners PASS
- Release Readiness PASS
- Application Health `FAIL = 0`
- browser smoke PASS
- console clean

## Maintenance and Development Safety

Guarded utilities include:

- Return PickupID repair
- ID sequence repair
- Settings migration
- live diagnostics
- Development Seed

Rules:

- preview before mutation
- explicit confirmation
- production guard
- backup before destructive action
- lock and verification
- no startup execution
- no automatic invocation

Development Seed is destructive and must never be run automatically.

## Release History

## v1.0.0

Released: `2026-08-02`

- Git release commit: `73fc422`
- Apps Script immutable version: `233`
- Production deployment: pinned to `233`
- Runtime acceptance: PASS
- Application Health: `FAIL = 0`
- Browser acceptance: PASS
- Console: clean

## Post-release State

The repository transitioned to:

- version `1.1.0-dev`
- build `Development`

The production deployment remains pinned to `v1.0.0` / Apps Script version `233`.

## Git and Release Workflow

- `main` is the permanent branch.
- Temporary branches may be used for risky work.
- Files are staged explicitly; `git add .` is prohibited.
- A Git commit records source history.
- A Git tag identifies the release commit.
- A GitHub Release publishes notes and source archives.
- `clasp push` updates mutable Apps Script HEAD.
- An Apps Script version is an immutable snapshot.
- A deployment selects the served version.

## Resume Checklist

Before resuming development:

1. Confirm the working tree is clean.
2. Confirm branch `main`.
3. Confirm `HEAD == origin/main`.
4. Read `AGENTS.md`.
5. Read `docs/ARCHITECTURE.md`.
6. Read `docs/DEVELOPMENT.md`.
7. Read `docs/TESTING_AND_ACCEPTANCE.md`.
8. Read `docs/MAINTENANCE.md`.
9. Read `docs/FILE_NUMBERING.md`.
10. Read `docs/ROADMAP.md`.
11. Confirm production remains on Apps Script version `233`.
12. Do not run destructive tools without preview and approval.
13. Record new work under `[Unreleased]`.
14. Use bounded acceptance wrappers.
15. Keep production unchanged until a future release is approved.

## Development Pause Decision

Development is intentionally paused because `v1.0.0` is stable and supports current operational work. Future development should begin from `1.1.0-dev` and address one clearly defined operational problem at a time.
