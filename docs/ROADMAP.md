# Roadmap

## Completed foundations

- Workspace and repository cleanup.
- Spreadsheet structure and data cleanup.
- UI modernization and shared presentation consistency.
- Production stabilization and focused regression coverage.
- Architecture cleanup, including repository/service ownership boundaries.
- Targeted source renumbering and documented compatibility exceptions.

## Current work

- Consolidate detailed technical documentation under `docs/` and remove duplicate or obsolete documents.
- Reconcile the legacy `.ai/` guidance with canonical root documentation in a separate phase.

## Release path

- Complete documentation consolidation and validation.
- Complete `.ai/` reconciliation without reintroducing competing authority.
- Perform final release preparation: version metadata, changelog, full acceptance, Application Health, and browser smoke gates.
- Publish `v1.0.0` only after every release gate passes and release actions are explicitly approved.

## Post-v1.0 roadmap

Post-release priorities will be selected from production evidence rather than assumed in advance. Candidate work should be recorded under `[Unreleased]`, scoped through the established architecture, and classified as patch, minor, or major according to [Release](RELEASE.md). No unimplemented feature is promised by this roadmap.
