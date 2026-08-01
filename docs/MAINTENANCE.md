# Maintenance

Maintenance functions are global so an authorized operator can run them in the Apps Script editor. They are isolated from normal request paths and automatic acceptance. Always verify the script project and spreadsheet first, run the read-only option where available, inspect the result, and obtain explicit approval before mutation.

## Operation matrix

| Area | Public function | Mode | Confirmation | Backup / rollback | Production guard | Execution rule |
| --- | --- | --- | --- | --- | --- | --- |
| Return PickupID repair | `previewRepairBlankReturnPickupIds()` | Read-only preview | Not required | None needed | No explicit environment guard | Run first; inspect every eligible or invalid row. |
| Return PickupID repair | `repairBlankReturnPickupIds()` | Mutates only `Return.PickupID` | Operator confirmation required outside code | In-memory before-values are returned; write failure attempts rollback | No explicit environment guard | Manual, scoped maintenance window only; never automatic. |
| ID sequences | `repairCurrentIdSequences()` | Mutates current-date Script Properties counters; no business rows | Operator confirmation required outside code | No automatic backup; repair is monotonic from stored and physical maxima | No explicit environment guard | After direct-ID seed/import or suspected stale counters; never automatic. |
| Settings diagnosis | `settingsSchemaCompatibilityDiagnostic()` | Read-only | Not required | None needed | Not applicable | Run before considering migration. Output redacts sensitive-looking fields. |
| Settings migration | `settingsLegacySchemaMigration()` | Mutates the legacy Settings sheet and Script Properties marker | Operator confirmation required outside code | Creates/verifies `Settings.Legacy.Backup`; attempts rollback after a write failure | Strict legacy-shape preflight, but no environment-name guard | Only for the exact supported legacy schema after diagnostic review; never automatic. |
| Expense live audit | `auditExpenseLiveData()` | Read-only | Not required | None needed | Not applicable | Diagnostic use. |
| Expense cleanup diagnosis | `diagnoseExpenseNominalCleanup()` | Read-only | Not required | None needed | Not applicable | Run before any controlled fixture cleanup. |
| Expense fixture cleanup | `cleanupExpenseControlledFixtures()` | Mutates only strictly recognized controlled fixtures | Operator confirmation required outside code | Revalidates row identity and protected fields; no general spreadsheet backup | Fail-closed target checks, but no environment-name guard | Exceptional manual cleanup only; never automatic. |
| Purchasing audit | `auditPurchasingData()` | Read-only | Not required | None needed | Not applicable | Diagnostic use. |
| Dashboard audit | `auditDashboardLiveData()` | Read-only | Not required | None needed | Not applicable | Diagnostic use. |
| Pickup/Return integrity | `runPickupReturnIntegrityDiagnostic()` | Read-only with before/after safety check | Not required | None needed | Not applicable | Diagnostic use. |
| Development seed | `previewDevelopmentSeed()` | Read-only preview | Not required | None needed | Reports and blocks production | Always run first. |
| Development backup | `backupDevelopmentData()` | Creates a timestamped spreadsheet copy | Operator confirmation required | The copy is the backup | Blocks production | Development environments only. |
| Development seed | `resetAndSeedDevelopmentData(token)` | Destructive reset and deterministic seed | Exact token from preview plus operator confirmation | Creates a backup before clearing data | Blocks production and validates environment/headers | Development environments only; never automatic. |
| Development seed shortcut | `runResetAndSeedDevelopmentData()` | Same destructive reset with token embedded | Operator confirmation required | Same backup behavior | Same production block | Manual editor use only; never automatic. |

## Return PickupID repair

The preview dynamically finds Return rows whose `PickupID` is blank or inconsistent and derives ownership through `PickupDetailID`. The repair acquires a lock, revalidates immediately before writing, changes only `PickupID`, verifies persisted values, logs the maintenance event, and rolls back from captured values on failure. Its returned backup is an in-memory record, not a separate spreadsheet copy.

## ID sequence repair

`repairCurrentIdSequences()` scans physical allocated IDs for every configured ID schema and reconciles the current-date `SEQ_<PREFIX>_<YYMMDD>` Script Property. It must never move a counter backward. Use it after utilities that insert explicit IDs or when collision risk is suspected.

## Settings migration

Run `settingsSchemaCompatibilityDiagnostic()` first. `settingsLegacySchemaMigration()` accepts only the exact supported eight-row `Key`/`Value` legacy layout, creates or verifies a backup sheet, migrates supported values, seeds canonical settings, verifies the final state, and preserves unsupported legacy values in the backup. Do not use it as a generic schema repair.

## Development seed

The seed is destructive by design. `previewDevelopmentSeed()` reports scope, environment, headers, estimated volumes, warning text, and the required token. Execution clears configured non-header rows only after production checks, header validation, lock acquisition, and a timestamped spreadsheet-copy backup. Never schedule, expose through the UI, or include any seed/reset function in automatic acceptance.
