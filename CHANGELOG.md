# Changelog

All notable changes to IP-Starling will be documented in this file.

This changelog is the canonical release history. Its format follows Keep a Changelog where practical, and releases follow Semantic Versioning.

## [Unreleased]

### Changed

- Began post-v1.0.0 development for version 1.1.0-dev.

## [1.0.0] - 2026-08-02

### Added

- Dashboard and operational analytics with filters, KPIs, charts, and recent activity.
- Product and Partner master-data management.
- Pickup and Return operational workflows.
- Purchasing and Expense workflows.
- Settings, audit Logs, and read-only Application Health diagnostics.
- Dark and light themes with persisted user preference.
- Development seed and guarded maintenance tools with preview, backup, and validation safeguards.

### Changed

- Modernized the application interface with responsive layouts, consistent forms, tables, states, pagination, and accessibility behavior.
- Separated spreadsheet access, business rules, server endpoints, and browser presentation through repository/service architecture boundaries.
- Strengthened idempotency and transaction boundaries for operational mutations.
- Centralized error handling with sanitized, browser-safe responses.
- Standardized unique source numbering and repository structure.
- Consolidated project documentation and bounded release-acceptance workflows.

### Fixed

- Pickup and Return quantity, historical-value, and restore consistency.
- Purchasing restore atomicity and transaction integrity.
- ID sequence collision protection across generated records.
- Date and nominal formatting consistency in forms and reports.
- Pagination, modal lifecycle, and dashboard rendering issues.
- Runtime initialization and test-registry ordering defects.
- Logs layout, pagination, and detail modal behavior.

### Security

- Sanitized unexpected server errors before returning browser responses.
- Sanitized spreadsheet-bound values to reduce formula-injection risk.
- Required explicit confirmation and backups for destructive maintenance, with development reset blocked in production.

## [0.1.0] - 2026-07-09

### Added

- Initial project, framework, repository, service, controller, and view layers.
- Dashboard, Product, Partner, Pickup, Return, Purchasing, and Expense services.
- Single-page frontend and initial architecture documentation.
- Git and GitHub repository setup.

### Changed

- Introduced the initial frontend architecture and Presenter pattern.

### Fixed

- Completed the initial repository setup.
