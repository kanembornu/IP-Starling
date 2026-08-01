# Architecture

## System flow

IP-Starling is a Google Apps Script web application backed by Google Sheets. Its primary dependency direction is:

```text
UI
  -> App
  -> Presenter
  -> Shared Presenter / Render / Components
  -> API
  -> Controller
  -> Service
  -> Repository
  -> Database
```

The browser/server boundary sits between `965.View.API.html` and the public functions in `150.Controller.js`. Browser calls use `google.script.run`; server responses cross the boundary as serializable data.

## Layer responsibilities

| Layer | Responsibility |
| --- | --- |
| UI | Templates and DOM surfaces presented to the user. |
| App | Application lifecycle, navigation, client state, asynchronous workflows, filters, pagination, and mutations. |
| Presenter | Module-specific rendering and presentation transformations. Presenters do not own API calls or application state. |
| Shared Presenter | Reusable presentation helpers only; no module-specific or business logic. |
| Render | Shared page mounting and render facades. |
| Components | Reusable HTML fragments and UI primitives with no business logic. |
| API | Promise-based browser adapter over `google.script.run`. |
| Controller | Public Apps Script server functions and the sanitized response boundary. |
| Service | Business rules, validation, transaction orchestration, and domain-level responses. |
| Repository | Spreadsheet persistence, row mapping, queries, and physical-store inspection. |
| Database | Spreadsheet and sheet acquisition/bootstrap primitives. |

Dependencies move only downward through this flow. A repository must not call a service or browser layer; a service must not access browser HTML; a presenter must not call a repository or service; and the browser must not bypass controllers to access server internals.

## Browser architecture

`35.Code.js#doGet()` evaluates `900.View.Index.html`. The index explicitly includes the browser modules; HTML load order is therefore defined by those includes, not inferred from numeric prefixes.

`994.View.App.Runtime.html` owns state and workflows. Module presenters render their own views. `976.View.Shared.Presenter.html`, `975.View.Render.html`, and `987.View.Components.html` provide reusable presentation capabilities. `993.View.Events.Runtime.html` delegates browser events into App actions and does not render business data. Compatibility facades such as `Render` and the shared frontend framework files retain stable call sites while delegating to the current implementation.

## Server architecture

Public browser-facing Apps Script functions live in `150.Controller.js`. `_controllerResponse()` serializes successful results, logs internal failures through `AppLogger`, and returns a sanitized public error. Controllers should coordinate calls and protect the public boundary; business rules belong in services.

### Controller error boundary

The controller error boundary keeps internal exception details out of browser response envelopes while preserving structured service failures where the public contract requires them. Internal messages are logged server-side; raw stacks and infrastructure details must not be returned to the browser.

Services own domain validation and orchestration. Repositories own Google Sheets access. `20.Database.js` and repository framework files provide the physical database boundary. Direct spreadsheet access outside repositories is limited to explicit setup, diagnostics, tests, and isolated maintenance utilities.

### Idempotency

Idempotency is intentionally split. `65.Repository.Idempotency.js` owns durable reservation storage. `127.Service.Idempotency.js` owns key validation, payload hashing, reservation state transitions, locking, replay, recovery, and expiry cleanup. Transaction services consume the service contract rather than reproducing storage rules.

### Logs and settings

`67.Repository.Logs.js` owns persisted log rows and physical-store inspection. `129.Service.Logs.js` owns sanitization, filtering, pagination, summaries, audit classification, and application/audit log adapters.

Log-level resolution is deliberately decoupled from both `SettingsService` and `LogsService`. `LogLevelProvider` reads the persisted `LOG_LEVEL` setting through repository primitives, preventing a logging-to-settings-to-logging dependency cycle.

### Maintenance and diagnostics

Files `136`-`140` isolate development, repair, migration, and live-diagnostic operations from normal request flows. They are editor-run entry points and must never execute at file load or from automatic acceptance. See [Maintenance](MAINTENANCE.md).

`ApplicationHealth` (Application Health) is a deliberate diagnostic exception: it reads across schemas, registries, repositories, services, source files, and live data to report system integrity. It must remain read-only and must not become a business-service dependency.

## Public Apps Script entry points

- `doGet(e)` is the web-app HTTP entry point.
- Functions in `150.Controller.js` are the browser-callable application API.
- `runAcceptanceFast()`, `runAcceptanceStandard()`, `runAcceptanceFrontend()`, `runAcceptanceHealth()`, and `runAcceptanceRelease()` are manual acceptance entry points.
- Application Health and maintenance functions are manual editor entry points documented in [Testing and Acceptance](TESTING_AND_ACCEPTANCE.md) and [Maintenance](MAINTENANCE.md).

Test and maintenance functions are public only because Apps Script editor execution requires global functions; they are not browser APIs.

## Prohibited dependencies

- UI, App, presenters, renderers, and components must not access Google Sheets directly.
- Browser code must not call repositories or services directly.
- Controllers must not contain domain rules or spreadsheet logic.
- Services must not render HTML or manipulate the DOM.
- Repositories must not own business policy or call services/controllers.
- Shared Presenter must not contain module-specific behavior.
- Events must not own rendering or state.
- Production request paths must not invoke development seed, repair, migration, or diagnostic mutations.
- Application Health must not mutate application data.
