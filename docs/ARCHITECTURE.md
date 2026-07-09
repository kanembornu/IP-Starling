# IP-Starling Architecture

Version : 1.0.0

---

# Overview

IP-Starling adopts a layered architecture inspired by modern enterprise applications.

The application separates Framework, Repository, Business Logic, Controller and Presentation Layer.

This separation keeps the project maintainable and scalable.

---

# Backend Architecture

```
Google Spreadsheet
        │
        ▼
Repository
        │
        ▼
Service
        │
        ▼
Controller
        │
        ▼
Frontend API
```

---

## Framework Layer

Responsible for reusable infrastructure.

```
Framework
├── Response
├── Logger
├── Validator
├── BaseService
├── EntityService
└── IDGenerator
```

---

## Repository Layer

Responsible for all Spreadsheet access.

```
Repository
├── Base
├── Reader
├── Writer
├── Query
└── Cache
```

Business Service MUST NOT access Spreadsheet directly.

---

## Service Layer

Contains all business logic.

```
ProductService

PartnerService

PickupService

ReturnService

PurchasingService

ExpenseService

DashboardService
```

---

## Controller Layer

Acts as API endpoint for Frontend.

```
Frontend

↓

Controller

↓

Business Service
```

Controllers must never contain business logic.

---

# Frontend Architecture

Frontend is implemented as a Single Page Application (SPA).

```
App

↓

Event

↓

Render

↓

Presenter

↓

UI

↓

DOM
```

---

## App

Responsible for

- Application lifecycle
- Navigation
- State management

---

## Event

Responsible for

- Click Event
- Keyboard Event
- Search Event
- Form Event

---

## Render

Responsible for

- Layout
- Sidebar
- Topbar
- Page Mounting

Render never renders business data.

---

## Presenter

Responsible for transforming data into Components.

Example

```
DashboardPresenter

ProductsPresenter

PartnersPresenter
```

---

## UI

Reusable UI Components

- Card
- Badge
- Table
- Modal
- Toast
- Pagination

---

## DOM

Thin wrapper around Browser DOM API.

---

# Naming Convention

```
00-99

Framework

100-199

Service

900+

View
```

---

# Git Strategy

```
main
```

Production branch.

```
develop
```

Daily development.

```
feature/*
```

Feature branches.

---

# Coding Standard

- One responsibility per file.
- Maximum 300 lines per file.
- No duplicated logic.
- Repository never contains business rules.
- Service never accesses HTML.
- View never accesses Spreadsheet.

---

# Deployment Flow

```
VS Code

↓

Git Commit

↓

GitHub

↓

clasp push

↓

Apps Script Deploy
```

---

# Future Improvements

- Authentication
- Role Permission
- Audit Trail
- Report Engine
- Notification
- REST API
- Unit Testing
