# IP-Starling Project Rules

## Backend

Frozen.

Never modify unless explicitly requested.

Files:

15.Schema.js

20.Database.js

40-95 Repository

100-130 Services

---

## Frontend Architecture

970.View.App.html

↓

Presenter

↓

Shared Presenter

↓

Components

↓

Render

---

## Presenter Rule

One Presenter

One Module

Examples

DashboardPresenter

ProductsPresenter

PartnersPresenter

ExpensesPresenter

PurchasingPresenter

PickupsPresenter

ReturnsPresenter

---

## Shared Presenter

Contains ONLY reusable helper.

Never place module-specific logic here.

---

## App

App only orchestrates.

No rendering logic.

No HTML generation.

---

## Event

Event only handles events.

Never render UI.

---

## Components

Reusable UI only.

No business logic.

---

## Search

Client-side.

Never call API again.

Use state.

---

## CRUD

Presenter

↓

App

↓

API

↓

Service

↓

Repository

---

## Regression Rule

Dashboard must continue working.

Products must continue working.

Partners must continue working.

Expenses must continue working.

Purchasing must continue working.

Pickup must continue working.

Return must continue working.

No Console Error.
