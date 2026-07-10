# Module Template

## Presenter Structure

Header

↓

Constants

↓

Public Render

↓

Row Render

↓

Empty State

↓

Info

↓

Status

↓

Actions

↓

Helper

↓

Public API

---

## Naming

DashboardPresenter

ProductsPresenter

PartnersPresenter

ExpensesPresenter

PurchasingPresenter

PickupsPresenter

ReturnsPresenter

---

## Public API

render()

Only expose public functions.

Everything else private.

---

## Table

Render using Components.

Never build HTML differently between modules.

---

## Status

Always use:

Components.badge()

---

## Currency

Always use:

Format.currency()

---

## Number

Always use:

Format.number()

---

## Empty State

Always use:

Components.empty()

---

## Escape

Always use:

Utils.escapeHTML()

---

## State

Always read from App state.

Never duplicate state.
