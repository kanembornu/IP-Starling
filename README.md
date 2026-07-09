# IP-Starling

> Inventory & Purchasing Management System built with Google Apps Script.

---

## Overview

IP-Starling is a modular Inventory & Purchasing Management System developed using Google Apps Script.

The project follows a layered architecture inspired by modern backend frameworks.

```
Framework
Repository
Service
Controller
View
```

The frontend is designed as a Single Page Application (SPA).

---

## Features

- Dashboard
- Product Management
- Partner Management
- Pickup Management
- Return Management
- Purchasing Management
- Expense Management
- Dashboard Statistics
- Responsive UI
- Repository Pattern
- Service Layer
- Clean Architecture

---

## Technology

- Google Apps Script
- HTML
- JavaScript
- Tailwind CSS
- Chart.js
- Git
- GitHub

---

## Architecture

```
Apps Script

Framework
│
├── Repository
├── Service
├── Controller
└── View

Frontend

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

## Project Structure

```
00.Project.Spec

Framework

Repository

Service

Controller

View

Tests
```

---

## Branch Strategy

```
main
```

Stable Production

```
develop
```

Daily Development

```
feature/*
```

Feature Development

---

## Development Workflow

```
VS Code

↓

Git Commit

↓

GitHub

↓

clasp push

↓

Apps Script
```

---

## License

MIT License
