# Testing and Acceptance

## Permanent wrappers

The global wrappers in `995.Tests.Acceptance.js` provide bounded manual Apps Script runs:

| Wrapper | Purpose |
| --- | --- |
| `runAcceptanceFast()` | Runs the focused Phase 5B.6 create-invariant acceptance runner for a quick high-value signal. |
| `runAcceptanceStandard()` | Runs core regression, backend contract, mutation-integrity, Application Health contract, and metadata tests. |
| `runAcceptanceFrontend()` | Runs frontend integration source and contract tests. |
| `runAcceptanceHealth()` | Runs health, metadata, and release-readiness contracts, then live Application Health reports. |
| `runAcceptanceRelease()` | Returns and logs the required manual wrapper order. It does not execute the other wrappers. |

Each executable wrapper builds a fixed stage list, resolves child functions at runtime, records timing, and stops on the first missing runner, thrown error, `success: false`, or `status: "FAIL"`. The wrappers are intentionally split so each Apps Script execution stays bounded and avoids a single release-sized timeout.

## Release sequence

Run these manually and separately in the Apps Script editor:

1. `runAcceptanceFast()`
2. `runAcceptanceStandard()`
3. `runAcceptanceFrontend()`
4. `runAcceptanceHealth()`

`runAcceptanceRelease()` can be used to print this plan, but it is not a substitute for the four executions. Application Health must finish with `FAIL = 0`.

## Focused runners

Use focused runners while developing or diagnosing a module, after a wrapper failure, or when a wrapper does not cover the changed contract. Examples include the child runners named in the wrapper source and maintenance-specific contract runners. Focused success does not replace the full release sequence.

## Evidence levels

- Static validation checks syntax, source contracts, references, and diffs without Apps Script services.
- Apps Script runtime validation is evidence only when the function was actually executed in the target script project.
- Browser acceptance requires testing the deployed web app and checking visible behavior plus the browser console.
- `clasp push` is upload evidence only.
- Application Health is a read-only live diagnostic gate, not a replacement for browser workflows.

Report these evidence levels separately. Never call static checks a runtime pass or assume the deployed web app changed after a source upload.

## Safety exclusions

Automatic acceptance must not execute reset, seed, repair, migration, cleanup, or other destructive functions. In particular, functions documented as mutating in [Maintenance](MAINTENANCE.md) require deliberate operator review and must remain outside acceptance pipelines.
