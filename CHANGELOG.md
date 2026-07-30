# Changelog

All notable changes to IP-Starling will be documented in this file.

The project follows Semantic Versioning.

## [Unreleased]

### Added

- Development seed utility with deterministic test data, backup protection, and integrity validation.
- Runtime ID sequence inspection and repair utility.
- Application Health checks for schema, IDs, relationships, audit coverage, and release readiness.
- Dark and light application themes with persisted user preference.
- Responsive dashboard charts and adaptive trend aggregation.
- Shared Indonesian monetary input formatting.

### Changed

- Modernized and standardized the application interface.
- Improved dashboard KPI, chart, filter, and recent-activity presentation.
- Standardized modal forms, loading states, empty states, pagination, and accessibility behavior.
- Reorganized Theme configuration under UI Settings.
- Standardized Settings page header with other application menus.
- Pickup header totals now follow the sum of active detail quantities.
- Pickup historical pricing is stored on detail records for consistent value reporting.
- Canonical ID generation now uses synchronized ScriptProperties sequences.

### Fixed

- Pickup Add modal remaining open after successful save.
- Pickup Edit modal remaining open after successful save.
- Pickup quantity totals not updating when detail items changed.
- Duplicate PickupHeader and PickupDetail ID risks caused by stale sequences.
- Purchase dates shifting one day backward when reopened for editing.
- Logs pagination and presenter-boundary regressions.
- Monetary fields displaying unformatted raw values.
- Dashboard and chart behavior across dark and light themes.

### Security

- Development reset remains blocked in production environments.
- Destructive seed operations require explicit confirmation and create backups first.
