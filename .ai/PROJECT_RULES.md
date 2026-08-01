# AI Execution Guidance

[`AGENTS.md`](../AGENTS.md) is the canonical repository instruction file. Read it before starting work and follow the owning technical document when the task involves [architecture](../docs/ARCHITECTURE.md), [file numbering](../docs/FILE_NUMBERING.md), [testing and acceptance](../docs/TESTING_AND_ACCEPTANCE.md), [maintenance](../docs/MAINTENANCE.md), or [release work](../docs/RELEASE.md).

AI agents should also:

- Inspect the current module and similar established modules before editing.
- Make minimal, explicitly scoped changes and preserve public contracts.
- Never commit, push, deploy, or execute destructive operations without explicit user approval.
- Stage only explicitly approved file paths when staging is authorized.
- Stop on the first concrete validation failure and report it.
- Report static validation, Apps Script runtime validation, upload or deployment evidence, and browser validation separately.
