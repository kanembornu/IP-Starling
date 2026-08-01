# Development

## Prerequisites

- Git.
- Node.js and npm, or another supported way to install the Google `clasp` CLI.
- A Google account authorized for the intended Apps Script project and backing spreadsheet.
- A local `.clasp.json` linked to the intended script project.

The repository does not contain Google credentials. Do not commit clasp login state, tokens, service-account material, or spreadsheet exports containing sensitive data.

## Initial setup

```sh
git clone <repository-url>
cd IP-Starling
npx @google/clasp login
```

This checkout already contains `.clasp.json`. Before any synchronization, inspect it and confirm that its `scriptId` is the intended environment. For a different authorized project, use clasp's project-linking workflow without publishing credentials or casually replacing the tracked production linkage.

## Source synchronization

- `clasp pull` downloads the linked Apps Script source and can overwrite local files. Start from a clean tree and review the resulting diff.
- `clasp push` uploads local source to the linked Apps Script project. It does not create a Git commit, Apps Script deployment, tag, or release, and it does not prove runtime correctness.
- Use `clasp push --force` only when the complete upload is intentional and authorized.

See [Deployment](DEPLOYMENT.md) before touching a shared or production script.

## Safe development loop

1. Read `AGENTS.md`, inspect the target module, and compare the established reference modules.
2. Confirm `git status --short` and preserve unrelated worktree changes.
3. Make the smallest behavior-compatible change in the owning layer.
4. Run focused syntax, source-contract, and static checks.
5. Review `git diff`, run `git diff --check`, and check for undefined references.
6. If upload is authorized, verify `.clasp.json`, push, and run the relevant functions in the Apps Script editor.
7. Smoke-test affected browser workflows and inspect the browser console.
8. Report static, Apps Script runtime, upload, deployment, and browser results separately.

## Git workflow

`main` is the only permanent branch. Temporary branches are appropriate for risky or review-heavy changes and should be removed after integration. There is no permanent `develop` branch workflow.

Stage approved paths explicitly:

```sh
git add path/to/approved-file
git diff --cached --name-only
git diff --cached --check
```

Do not use `git add .`. Automated contributors must not commit, push, deploy, tag, or publish a release without explicit approval.

## Validation levels

Static validation includes syntax checks, source-contract scans, link/reference checks, focused local harnesses, and `git diff --check`. It does not prove Apps Script behavior.

Runtime validation requires executing the relevant global functions in the Apps Script editor. Browser acceptance requires opening the deployed web app, exercising affected workflows, and confirming no console errors or undefined functions. See [Testing and Acceptance](TESTING_AND_ACCEPTANCE.md).
