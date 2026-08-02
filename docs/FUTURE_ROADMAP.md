# IP-Starling — Future Roadmap and Recommendations

## Purpose

This document records recommended future work after the stable `v1.0.0` release. It separates immediate maintenance, usability, UI/UX, reporting, operational reliability, and longer-term feature ideas.

No item is approved automatically. Every future task should define scope, business value, risk, acceptance criteria, and rollback strategy before implementation.

## Current Baseline

- Stable release: `v1.0.0`
- Stable Git release commit: `73fc422`
- Production Apps Script version: `233`
- Development version: `1.1.0-dev`
- Application Health at release: `FAIL = 0`
- Production deployment: pinned to immutable version `233`

## Guiding Principles

Future work should preserve:

1. Service-owned business rules
2. Repository-owned persistence
3. Controller-only transport/error boundaries
4. Presenter render-only responsibility
5. Stateless bounded acceptance wrappers
6. Unique numeric source prefixes
7. Explicit file staging
8. Production deployment immutability
9. Preview/confirmation/backup for destructive operations
10. Application Health `FAIL = 0` before release

## Priority Levels

- **P0** — critical production defect
- **P1** — important operational improvement
- **P2** — meaningful usability or reporting improvement
- **P3** — optional enhancement

## Recommended v1.1.0 Direction

The best first objective is operational productivity, not another architecture rewrite.

Recommended theme:

> Reduce the effort required for daily transaction entry, improve visibility of operational exceptions, and make the Dashboard more actionable.

## P1 — Usability Improvements

### Faster Transaction Entry

Potential improvements:

- keyboard-first navigation
- automatic focus on the next required field
- Enter-to-add-line behavior
- inline validation near the affected field
- preserve safe form values after validation failure
- visible unsaved-change warning
- optional “Save and Add Another”
- clearer quantity and nominal feedback

Safeguards:

- no duplicate transactions
- idempotency remains mandatory
- modal close behavior remains deterministic
- keyboard operation remains accessible

### Better Search and Filters

Recommended additions:

- multi-column search
- persistent date-range filters
- active-filter chips
- saved filter presets
- clear reset action
- filter count indicator
- consistent behavior across modules

### Table Usability

Potential improvements:

- user-selectable visible columns
- compact and comfortable density modes
- sticky headers
- improved small-screen fallback
- sort indicators
- export filtered rows
- safe row selection for future batch actions

Batch actions should only be introduced where audit and rollback are well defined.

## P1 — Operational Reliability

### Operational Exception Center

Create a read-only view based on Application Health and diagnostics.

Possible sections:

- relationship issues
- sequence issues
- invalid historical values
- stale pending idempotency requests
- schema drift
- incomplete settings
- failed actions

Recommended behavior:

- show severity
- show affected IDs
- explain the next safe action
- link to preview-only maintenance tools
- never auto-repair data

### Scheduled Health Summary

Potential enhancement:

- daily or weekly summary
- report only WARN/FAIL changes
- store a small historical health trend
- notify when a new FAIL appears

This must remain read-only.

### Audit and Logs Improvements

Potential improvements:

- clearer action labels
- actor and entity filters
- date-range filtering
- export filtered logs
- link logs to related records
- optional before/after comparison
- documented retention policy

## P1 — Dashboard and Analytics

### Actionable KPIs

Possible KPIs:

- pickups pending return
- return ratio
- top partner activity
- product movement velocity
- purchase-to-pickup variance
- expense trend deviation
- inactive products still referenced
- days since last transaction

Every KPI must define:

- canonical source
- formula
- filter behavior
- empty-data behavior
- business meaning
- acceptance test

### Comparison Modes

Potential comparisons:

- current period vs previous period
- current month vs previous month
- current year vs previous year
- selected range vs equal preceding range

Display:

- absolute difference
- percentage difference
- positive/negative direction
- neutral state when comparison is not meaningful

### Dashboard Drill-down

Allow KPI cards and charts to open already-filtered module views.

Examples:

- category chart → Purchasing
- return KPI → Returns
- partner activity → Pickups
- expense category → Expenses
- recent activity → related detail modal

Drill-down should reuse canonical module filters.

## P2 — Functional Enhancements

### Inventory or Availability Projection

A future projection may calculate:

- purchased quantity
- picked-up quantity
- returned quantity
- net distributed quantity
- estimated available quantity

This requires a formal business definition. Do not call a value “stock” unless all relevant adjustment events are represented.

### Partner Performance

Possible metrics:

- pickup frequency
- quantity received
- return rate
- last activity
- product mix
- monthly trend

Avoid subjective scoring until the business owner defines the criteria.

### Product Performance

Possible metrics:

- pickup quantity
- return quantity and rate
- purchase cost trend
- transaction frequency
- active partner count
- recent movement

### Export and Reporting

Potential exports:

- filtered CSV
- printable PDF summary
- monthly operational report
- partner statement
- product movement report
- expense summary
- audit report

Exports must preserve filters, canonical totals, timezone behavior, and Indonesian number/date formatting.

## P2 — Settings

### UI Preferences

Possible additions:

- table density
- default landing page
- preferred page size
- default date range
- reduced motion
- system theme
- remembered sidebar state

Classify settings as user-specific, application-wide, or system-controlled.

### Operational Settings

Potential controlled settings:

- log level
- default page size
- dashboard default range
- maintenance banner

Any setting affecting business calculations requires stricter validation and testing.

## P2 — UI/UX

### Design System Consolidation

Formalize:

- spacing scale
- typography scale
- radius scale
- elevation rules
- button hierarchy
- form states
- table patterns
- modal patterns
- feedback patterns
- dark/light theme tokens

Goal: consistency without another broad rewrite.

### Accessibility

Recommended work:

- systematic keyboard navigation
- visible focus states
- ARIA labels
- modal focus verification
- contrast validation
- non-color status indicators
- reduced motion
- form error announcements
- accessible chart summaries

### Responsive Behavior

Focus on:

- small laptop widths
- tablet landscape
- mobile list fallback
- modal dimensions
- chart label density
- sidebar behavior
- long Indonesian text wrapping

Do not hide critical data merely to avoid horizontal scrolling.

## P2 — Notifications and Feedback

### Notification Center

Only add this if it has real operational value.

Possible sources:

- new Application Health FAIL
- maintenance completion
- export completion
- critical validation issue
- pending action

Avoid decorative icons without a real handler.

### Toast and Dialog Improvements

Potential improvements:

- grouped validation summary
- retry for transient failure
- consistent destructive confirmations
- progress state for long operations
- undo only for truly reversible UI actions

## P2 — Controlled Import

Potential import targets:

- Products
- Partners
- Purchases
- Expenses

Required flow:

1. upload
2. parse
3. preview
4. validate
5. show errors
6. confirm
7. backup
8. commit
9. verify
10. audit

Never import directly into business sheets.

## P2 — Security and Access

### Role-Based Access

Potential roles:

- Administrator
- Operator
- Viewer

Possible controls:

- module visibility
- create/update/delete/restore
- maintenance access
- Logs access
- Settings access
- export permission

Authorization must be enforced server-side, not only by hiding UI controls.

### Sensitive Log Redaction

Continue preserving:

- no raw stack in browser responses
- formula-injection protection
- bounded log payloads
- no secrets in audit context
- redaction where appropriate

## P3 — Integrations

Potential future integrations:

- email summaries
- Google Drive exports
- calendar reminders
- external BI export
- webhook or API integration after security review

These should remain lower priority until a concrete operational need exists.

## Engineering Recommendations

### Preserve the Stable Architecture

Avoid another broad architecture rewrite. Future refactoring should address concrete defects only.

### Manage Test Duration

Continue using bounded wrappers:

- Fast after focused changes
- Standard before commit
- Frontend after browser-source changes
- Health after source or metadata changes
- full release gate before versioning and tagging

When a wrapper approaches the execution limit:

- split by responsibility
- prove coverage equivalence
- do not persist progress in ScriptProperties
- do not treat timeout as PASS

### Performance Baseline

Measure before optimizing:

- Dashboard load
- Products list
- Pickup list
- Return create
- Purchasing list
- Logs list
- Application Health
- acceptance wrappers

### Health Trend Tests

Potential enhancement:

- detect unexpected registry-count drift
- track known WARN categories
- prevent WARN-to-FAIL classification regression
- compare health snapshots in fixtures

## Release Recommendations

### Patch: `1.0.x`

Use for production defects without new functionality.

### Minor: `1.1.0`

Use for backward-compatible features and meaningful usability improvements.

### Major: `2.0.0`

Use only for incompatible data model, API, or workflow changes requiring migration.

## Suggested Future Work Sequence

### Stage 1 — Reorientation

1. Confirm production remains on version `233`.
2. Read `PROJECT_HISTORY.md` and this document.
3. Review `[Unreleased]`.
4. Select one specific operational problem.

### Stage 2 — Discovery

1. Observe the current workflow.
2. Measure frequency and impact.
3. Define expected behavior.
4. Define exclusions.
5. Define acceptance criteria.
6. Select patch or minor release target.

### Stage 3 — Implementation

1. Create a scoped task.
2. Preserve architecture boundaries.
3. Add focused tests.
4. Run Fast acceptance.
5. Run browser checks for UI work.
6. Commit only after acceptance.

### Stage 4 — Release

1. Complete changelog.
2. Promote metadata.
3. Push Apps Script HEAD.
4. Run release acceptance.
5. Create immutable Apps Script version.
6. Verify versioned deployment.
7. Commit and push release preparation.
8. Tag and publish GitHub Release.

## Recommended First Backlog for 1.1.0

1. Keyboard-first transaction entry
2. Persistent filters
3. Operational exception center
4. Dashboard comparison mode
5. Dashboard drill-down
6. Export filtered records
7. Table density and visible-column preferences
8. Accessibility review
9. Performance baseline
10. Improved health and release reporting

Begin with one tightly scoped item only.

## Hold-State Checklist

While development is paused:

- do not move production away from version `233`
- do not run destructive maintenance without preview
- preserve tag `v1.0.0`
- record operational issues before changing code
- distinguish data defects from code defects
- run Application Health when integrity is questioned
- do not upload `1.1.0-dev` metadata to production unless development intentionally resumes

## Resume Decision Template

- Problem:
- Affected users:
- Current workflow:
- Expected workflow:
- Frequency:
- Business impact:
- Proposed scope:
- Excluded scope:
- Data/API/schema impact:
- UI impact:
- Acceptance tests:
- Browser tests:
- Release target:
- Rollback plan:
