# File Numbering

Numbered flat filenames are architecture ownership and Apps Script load-order aids. They are not strict sequence IDs, and numeric uniqueness is not required.

## Accepted ranges

| Range | Ownership |
| --- | --- |
| `00`-`39` | Project metadata, configuration, schema, database, bootstrap, and routing. |
| `40`-`69` | Repositories. |
| `70`-`99` | Server framework. |
| `100`-`135` | Services. |
| `136`-`149` | Isolated maintenance and development utilities. |
| `150`-`199` | Controllers and server boundaries. |
| `900`-`989` | Frontend templates and browser runtime. |
| `990`-`999` | Retained compatibility zone for frontend shared modules and tests. |

The `990`-`999` overlap is intentional historical compatibility. New files should avoid adding mixed production/test collisions there where practical.

## Policy

- Duplicate numeric prefixes are allowed when file roles and ordering are clear.
- Ordering is determined by the complete filename, not numeric-prefix uniqueness.
- Do not cosmetically renumber working files or fill gaps merely to make the inventory sequential.
- New files use the next available logical number in the owning range and should avoid confusing production/test collisions where practical.
- Renumber only for a concrete architecture or load-order reason, with an explicit allowlist and runtime validation.
- Browser load order is explicit in `900.View.Index.html`; filename order alone does not load HTML modules.
- Apps Script server file order can affect eager initialization, so server renames require source-contract, load-order, and Apps Script runtime validation.

## Rename rules

An HTML rename must atomically update `900.View.Index.html`, Application Health frontend registries, all `HtmlService` file references, and tests/source contracts. A server rename must update every symbol/file-name reference and validate forward/reverse initialization assumptions and test registries. Renames must not silently change public APIs, schemas, UI behavior, or deployment metadata.

Current duplicate prefixes are accepted inventory, not defects by themselves. Their different full filenames define deterministic order.
