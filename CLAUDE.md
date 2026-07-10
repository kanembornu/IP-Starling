# CLAUDE.md

# IP-Starling

This repository contains the source code for IP-Starling.

Before performing ANY task, read ALL project instructions in the following order.

---

## Required Reading Order

1. .ai/AGENTS.md

2. .ai/PROJECT_RULES.md

3. .ai/MODULE_TEMPLATE.md

4. .ai/TASK_TEMPLATE.md

5. .ai/REVIEW_TEMPLATE.md

6. .ai/ROADMAP.md

These files define the engineering standard for the entire project.

Do not skip them.

---

# Objective

Primary objective:

Finish the MVP as quickly as possible while keeping the application stable enough for daily operational use.

The project prioritizes:

1. Stability

2. Consistency

3. Minimal regression

4. Readability

5. Small incremental changes

Do not optimize prematurely.

Do not redesign the architecture.

---

# Architecture Overview

Application Layer

970.View.App.html

↓

Presenter Layer

↓

Shared Presenter

↓

Render / Components

↓

API

↓

Service

↓

Repository

↓

Google Apps Script

App coordinates.

Presenter renders.

Components generate reusable UI.

Repository accesses spreadsheet.

Never violate this responsibility.

---

# Development Rules

Always inspect an existing implementation before writing new code.

Preferred reference order:

Products

↓

Partners

↓

Expenses

↓

Purchasing

↓

Pickup

↓

Return

New modules should follow the same structure.

Do not invent a different pattern.

---

# Scope Control

Modify ONLY files required by the task.

Avoid touching unrelated modules.

Never perform project-wide refactoring unless explicitly requested.

---

# Forbidden

Never:

- Change backend architecture.

- Change spreadsheet schema.

- Rename public APIs.

- Break existing modules.

- Rewrite working code.

- Replace an implementation only because another style looks better.

- Introduce new frameworks.

- Add unnecessary dependencies.

---

# Required

Always:

Reuse existing code.

Preserve current behavior.

Keep commits small.

Keep changes localized.

Prefer consistency over cleverness.

---

# Presenter Standard

Each business module owns one presenter.

Example:

DashboardPresenter

ProductsPresenter

PartnersPresenter

ExpensesPresenter

PurchasingPresenter

PickupsPresenter

ReturnsPresenter

SharedPresenter contains ONLY reusable helpers.

Business logic must never live inside SharedPresenter.

---

# Rendering Standard

Always use existing helpers.

Examples:

Components.badge()

Components.empty()

Components.loading()

Components.tableRow()

Components.tableCell()

Format.currency()

Format.number()

Utils.escapeHTML()

Do not create alternative rendering styles.

---

# Search Standard

Search is client-side.

Never call API while searching.

Always filter from application state.

Render using the module presenter.

---

# Review Before Completion

Before finishing any task verify:

✓ No console errors

✓ No undefined function

✓ Existing modules still work

✓ Architecture preserved

✓ No duplicated logic

✓ SharedPresenter contains only reusable helpers

---

# Expected Output

Unless instructed otherwise, return only:

1. Files changed

2. git diff --stat

3. PASS / FAIL

4. Issues found

Do not include long explanations.

Do not commit.

Do not deploy.

Do not push.

Stop after implementation and self-review.

Human review will be performed before testing and commit.
