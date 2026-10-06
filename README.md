# EdVyro Internship Board REST API

> **EdVyro Full Stack Development Task 3**: *REST API and Persistent Data*  
> A beginner-friendly, robust Node.js + Express REST API backed by a persistent SQLite database for managing internship opportunities.

---

## Table of Contents
- [Overview](#overview)
- [Project Structure](#project-structure)
- [Database Schema & Reconciliation](#database-schema--reconciliation)
- [Installation & Getting Started](#installation--getting-started)
- [Seed Data Instructions](#seed-data-instructions)
- [Running the API](#running-the-api)
- [Running Automated Tests](#running-automated-tests)
- [API Endpoints Reference](#api-endpoints-reference)
  - [1. List Internships (with Pagination)](#1-list-internships-with-pagination)
  - [2. Get Internship by ID](#2-get-internship-by-id)
  - [3. Create Internship](#3-create-internship)
  - [4. Update Internship](#4-update-internship)
  - [5. Delete Internship](#5-delete-internship)
  - [6. Health Check](#6-health-check)
- [HTTP Status Codes & Response Formats](#http-status-codes--response-formats)

---

## Overview

This project implements a persistent REST API for managing internship postings. It is built strictly using **Node.js**, **Express**, and **SQLite** (`better-sqlite3`), without unnecessary frameworks, frontend bloat, or external database engines.

### Key Features
- **Persistent Storage**: Uses SQLite database (`data/internships.db`) with foreign key enforcement and automatic schema initialization.
- **Data Reconciliation**: Seamlessly harmonizes differences between EdVyro's SQL starter (`internship-board-sample.sql`) and JSON sample records (`internship-records-sample.json`) with zero data loss.
- **Pagination**: Built-in query parameter pagination (`?page=1&limit=5`) returning page metadata (`page`, `limit`, `total`, `totalPages`).
- **Complete CRUD**: Full endpoints for listing, viewing, creating, updating, and deleting records.
- **Robust Validation**: Enforces required fields, data types, query parameter sanitization, and prevents duplicate IDs.
- **Consistent JSON Responses**: Standardized `{ success: true, data: ... }` and `{ success: false, error: ... }` envelopes across all routes.
- **Comprehensive Testing**: Includes an automated 17-point test suite (`npm test`) covering all endpoints, edge cases, error codes, and server restart persistence.

---

## Project Structure

```
internship-api/
├── src/
│   ├── server.js                     # Express application, routes mounting & error handlers
│   ├── db.js                         # SQLite connection, schema init & data normalization
│   ├── routes/
│   │   └── internships.js            # REST API endpoints (GET, POST, PUT, DELETE)
│   └── validators/
│       └── internshipValidator.js    # Request body & query parameter validation
├── data/
│   └── internships.db                # SQLite persistent database file
├── seed.js                           # Seeding script reconciling SQL & JSON data
├── test.js                           # Automated end-to-end test suite
├── internship-board-sample.sql       # Official EdVyro starter SQL schema and records
├── internship-records-sample.json    # Official EdVyro sample JSON records
├── package.json                      # Project dependencies & npm scripts
├── .gitignore                        # Git exclusion rules
└── README.md                         # Project documentation
```

---

## Database Schema & Reconciliation

The database uses SQLite and models two tables:

### 1. `internships` Table
```sql
CREATE TABLE IF NOT EXISTS internships (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    domain TEXT NOT NULL,
    mode TEXT NOT NULL,
    duration_weeks INTEGER NOT NULL DEFAULT 4,
    applications_open INTEGER NOT NULL DEFAULT 1,
    location TEXT,
    skills TEXT,
    openings INTEGER DEFAULT 1
);
```

### 2. `applications` Table
```sql
CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    internship_id TEXT NOT NULL,
    applicant_name TEXT NOT NULL,
    applicant_email TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (internship_id, applicant_email),
    FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE
);
```

### Reconciling the SQL and JSON Data Files

The supplied `internship-board-sample.sql` and `internship-records-sample.json` contain complementary information with schema variations:

| Field | Source: SQL | Source: JSON | Reconciled Database Implementation |
| :--- | :--- | :--- | :--- |
| `id` | `TEXT PRIMARY KEY` (e.g. `INT-001`) | `string` (e.g. `INT-101`) | Preserved as primary key `TEXT PRIMARY KEY` |
| `title` | `TEXT NOT NULL` | `string` | Stored as `TEXT NOT NULL` |
| `domain` | `TEXT NOT NULL` | `string` | Stored as `TEXT NOT NULL` |
| `mode` | `TEXT NOT NULL` | `string` | Stored as `TEXT NOT NULL` |
| `duration_weeks` | `INTEGER NOT NULL` | *Not present* | Preserved from SQL; seeded JSON records default to `4` weeks |
| `applications_open` | `INTEGER NOT NULL DEFAULT 1` | *Not present* | Preserved from SQL; seeded JSON records map `openings > 0 ? 1 : 0` |
| `location` | *Not present* | `string` (e.g. "Pune", "India") | Stored as `TEXT`, preserved in responses |
| `skills` | *Not present* | `array` of strings | Stored as JSON string in SQLite; parsed and returned as an `Array` in API responses |
| `openings` | *Not present* | `number` | Stored as `INTEGER DEFAULT 1`, preserved in responses |

**Summary of Decisions:**
1. **Zero Data Loss**: No fields from either source are discarded. Columns accommodate both SQL columns (`duration_weeks`, `applications_open`) and JSON columns (`location`, `skills`, `openings`).
2. **Type Safety & Array Handling**: The `skills` field is serialized as JSON in SQLite and automatically deserialized into an array for API consumers.
3. **Idempotent Seeding**: Seeding inserts or updates (`ON CONFLICT(id) DO UPDATE`), making it safe to re-run anytime.

---

## Installation & Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- `npm` (bundled with Node.js)

### Step 1: Clone and Install Dependencies
```bash
git clone <your-repository-url>
cd internship-api
npm install
```

---

## Seed Data Instructions

To populate the SQLite database with the initial 9 records (4 from `internship-board-sample.sql` and 5 from `internship-records-sample.json`):

```bash
npm run seed
```

Or for a fresh reset and re-seed:
```bash
npm run seed:fresh
```

**Output:**
```
--- Starting Database Seeding Process ---
Successfully seeded:
- 4 records from internship-board-sample.sql (INT-001 to INT-004)
- 5 records from internship-records-sample.json (INT-101 to INT-105)
- Total internships in database: 9
--- Database Seeding Complete ---
```

---

## Running the API

### Start the Server (Production Mode)
```bash
npm start
```

### Start the Server (Development Mode with auto-reload)
```bash
npm run dev
```

The server starts on port `3000` (or `process.env.PORT`):
- **Base URL**: `http://localhost:3000`
- **Internships Endpoint**: `http://localhost:3000/api/internships`

---

## Running Automated Tests

Run the complete 17-point test suite:
```bash
npm test
```

This verifies:
1. Root informational endpoint (`GET /`)
2. Health check (`GET /api/health`)
3. Default pagination (`GET /api/internships` - 5 items, total 9, totalPages 2)
4. Secondary page pagination (`?page=2&limit=5` - 4 items)
5. Query parameter validation (`?page=-1` -> 400 Bad Request)
6. SQL seed record retrieval (`INT-001`)
7. JSON seed record retrieval with skills & location (`INT-101`)
8. Nonexistent ID lookup (`INT-999` -> 404 Not Found)
9. Creation validation on missing required fields (`POST` -> 400 Bad Request)
10. Valid internship creation (`POST` -> 201 Created)
11. Duplicate ID rejection (`POST` -> 409 Conflict)
12. Auto-generating sequential ID when ID is omitted
13. Updating internship records (`PUT` -> 200 OK)
14. Updating nonexistent record (`PUT` -> 404 Not Found)
15. Deleting internship record (`DELETE` -> 200 OK)
16. Deleting nonexistent record (`DELETE` -> 404 Not Found)
17. Database persistence across server restart

---

## API Endpoints Reference

### 1. List Internships (with Pagination)

- **Method**: `GET`
- **URL**: `/api/internships`
- **Query Parameters**:
  - `page` *(optional, default: 1)*: Current page number (must be integer >= 1).
  - `limit` *(optional, default: 5)*: Number of items per page (must be between 1 and 100).
  - `domain` *(optional)*: Filter by domain (e.g. `Full Stack Development`).
  - `mode` *(optional)*: Filter by work mode (e.g. `Remote`, `Hybrid`, `On-site`).

#### Example Request
```bash
curl -s "http://localhost:3000/api/internships?page=1&limit=5"
```

#### Example Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "INT-001",
      "title": "Frontend Practice Internship",
      "domain": "Web Development",
      "mode": "Remote",
      "duration_weeks": 4,
      "applications_open": 1,
      "location": "Remote",
      "skills": [],
      "openings": 1
    },
    {
      "id": "INT-002",
      "title": "Data Dashboard Internship",
      "domain": "Data Analytics",
      "mode": "Remote",
      "duration_weeks": 6,
      "applications_open": 1,
      "location": "Remote",
      "skills": [],
      "openings": 1
    },
    {
      "id": "INT-003",
      "title": "Product Design Internship",
      "domain": "UI/UX",
      "mode": "Hybrid",
      "duration_weeks": 4,
      "applications_open": 1,
      "location": "India",
      "skills": [],
      "openings": 1
    },
    {
      "id": "INT-004",
      "title": "C++ Utility Internship",
      "domain": "C++ Programming",
      "mode": "Remote",
      "duration_weeks": 5,
      "applications_open": 0,
      "location": "Remote",
      "skills": [],
      "openings": 1
    },
    {
      "id": "INT-101",
      "title": "Frontend Intern",
      "domain": "Full Stack Development",
      "mode": "Remote",
      "duration_weeks": 4,
      "applications_open": 1,
      "location": "India",
      "skills": [
        "HTML",
        "CSS",
        "JavaScript"
      ],
      "openings": 3
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 9,
    "totalPages": 2
  }
}
```

---

### 2. Get Internship by ID

- **Method**: `GET`
- **URL**: `/api/internships/:id`

#### Example Request
```bash
curl -s "http://localhost:3000/api/internships/INT-102"
```

#### Example Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "id": "INT-102",
    "title": "API Engineering Intern",
    "domain": "Full Stack Development",
    "mode": "Hybrid",
    "duration_weeks": 4,
    "applications_open": 1,
    "location": "Pune",
    "skills": [
      "Node.js",
      "SQL",
      "Testing"
    ],
    "openings": 2
  }
}
```

#### Not Found Response (`404 Not Found`)
```json
{
  "success": false,
  "error": {
    "message": "Internship with ID 'INT-999' not found"
  }
}
```

---

### 3. Create Internship

- **Method**: `POST`
- **URL**: `/api/internships`
- **Headers**: `Content-Type: application/json`
- **Required Fields**: `title`, `domain`, `mode`
- **Optional Fields**: `id`, `duration_weeks`, `applications_open`, `location`, `skills`, `openings`

#### Example Request
```bash
curl -X POST "http://localhost:3000/api/internships" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "INT-201",
    "title": "Cloud DevOps Intern",
    "domain": "Cloud & Infrastructure",
    "mode": "Remote",
    "duration_weeks": 8,
    "applications_open": 1,
    "location": "Remote",
    "skills": ["Docker", "Kubernetes", "AWS"],
    "openings": 2
  }'
```

#### Example Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "id": "INT-201",
    "title": "Cloud DevOps Intern",
    "domain": "Cloud & Infrastructure",
    "mode": "Remote",
    "duration_weeks": 8,
    "applications_open": 1,
    "location": "Remote",
    "skills": [
      "Docker",
      "Kubernetes",
      "AWS"
    ],
    "openings": 2
  }
}
```

#### Duplicate ID Response (`409 Conflict`)
```json
{
  "success": false,
  "error": {
    "message": "Internship with ID 'INT-201' already exists"
  }
}
```

#### Missing Required Fields Response (`400 Bad Request`)
```json
{
  "success": false,
  "error": {
    "message": "Field 'title' is required and must be a non-empty string; Field 'domain' is required and must be a non-empty string; Field 'mode' is required and must be a non-empty string",
    "details": [
      "Field 'title' is required and must be a non-empty string",
      "Field 'domain' is required and must be a non-empty string",
      "Field 'mode' is required and must be a non-empty string"
    ]
  }
}
```

---

### 4. Update Internship

- **Method**: `PUT`
- **URL**: `/api/internships/:id`
- **Headers**: `Content-Type: application/json`
- **Body**: Partial or full update containing at least one valid field.

#### Example Request
```bash
curl -X PUT "http://localhost:3000/api/internships/INT-201" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior Cloud DevOps Intern",
    "duration_weeks": 12,
    "openings": 5
  }'
```

#### Example Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "id": "INT-201",
    "title": "Senior Cloud DevOps Intern",
    "domain": "Cloud & Infrastructure",
    "mode": "Remote",
    "duration_weeks": 12,
    "applications_open": 1,
    "location": "Remote",
    "skills": [
      "Docker",
      "Kubernetes",
      "AWS"
    ],
    "openings": 5
  }
}
```

---

### 5. Delete Internship

- **Method**: `DELETE`
- **URL**: `/api/internships/:id`

#### Example Request
```bash
curl -X DELETE "http://localhost:3000/api/internships/INT-201"
```

#### Example Response (`200 OK`)
```json
{
  "success": true,
  "message": "Internship with ID 'INT-201' deleted successfully",
  "data": {
    "id": "INT-201"
  }
}
```

---

### 6. Health Check

- **Method**: `GET`
- **URL**: `/api/health`

#### Example Response (`200 OK`)
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-10-06T11:47:00.000Z"
}
```

---

## HTTP Status Codes & Response Formats

| Status Code | Meaning | When Returned |
| :--- | :--- | :--- |
| **200 OK** | Success | Successful `GET`, `PUT`, `DELETE` operations |
| **201 Created** | Created | Successful `POST /api/internships` operation |
| **400 Bad Request** | Validation Error | Missing required fields, invalid types, or bad pagination query parameters |
| **404 Not Found** | Not Found | Requested internship ID or route does not exist |
| **409 Conflict** | Conflict | Attempted to create an internship with an ID that already exists |
| **500 Server Error** | Server Error | Unexpected database or runtime error |

### Standard Success Response Pattern
```json
{
  "success": true,
  "data": { ... }
}
```

### Standard Error Response Pattern
```json
{
  "success": false,
  "error": {
    "message": "Detailed error description"
  }
}
```

---

## License
Educational use for EdVyro Full Stack Development Program.
