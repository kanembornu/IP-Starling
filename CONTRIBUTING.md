# Contributing to IP-Starling

## Branch and commit policy

`main` is the only permanent branch. A temporary branch may be used for risky or review-heavy work and should be removed after integration.

Use concise conventional commit subjects such as `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, or `chore:`. Stage approved paths explicitly; never use `git add .`. Automation must not commit or push unless the user explicitly approves that action.

## Coding and layering

[AGENTS.md](AGENTS.md) is the canonical repository instruction file. Preserve the numbered flat-file structure and existing behavior. Follow this flow:

```text
UI → App → Presenter → API → Controller → Service → Repository → Database
```

Repositories own sheet access, services own business rules, controllers expose server functions, and presenters own module-specific UI behavior. Reuse established components and reference modules before introducing new patterns.

## Verification sequence

1. Run focused static and source-contract checks for the changed files.
2. Run `git diff --check` and review the complete diff.
3. If Apps Script files changed and upload is authorized, push them with `clasp`.
4. In Apps Script, run `runAcceptanceFast()`, `runAcceptanceStandard()`, `runAcceptanceFrontend()`, and `runAcceptanceHealth()` as applicable.
5. Use `runAcceptanceRelease()` as the manual ordered release plan; it does not run its child acceptance functions.
6. Smoke-test affected browser workflows and confirm there are no console errors or undefined functions.
7. Require Application Health `FAIL = 0` before release preparation.

A successful `clasp push` proves upload only. Report static checks, Apps Script runtime results, and browser results separately; never claim a runtime pass for checks that were not run.

## Changelog and versioning

Keep current work under `[Unreleased]` in the root [CHANGELOG.md](CHANGELOG.md). Do not duplicate entries or rewrite historical releases. [`VERSION`](VERSION) is the canonical release-development version, `APP_CONFIG.VERSION` must match it, and `APP_CONFIG.BUILD` remains descriptive. Releases follow Semantic Versioning.

## Release preparation

Before proposing a release, confirm a clean reviewed diff, synchronized version metadata, the complete acceptance sequence, browser smoke results, Application Health `FAIL = 0`, and an accurate changelog. Tags, GitHub Releases, deployments, commits, and pushes require explicit approval.
