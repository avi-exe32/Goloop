# Goloop: Travel Booking Marketplace & Real-Time Telemetry Platform

Goloop is a full-stack travel booking web application inspired by MakeMyTrip and Booking.com, designed as a clean, production-grade learning architecture. It provides an end-to-end travel booking workflow, strict database-level concurrency protection against double-booking, and a real-time event streaming platform powered by Server-Sent Events (SSE) and an in-process asyncio event pipe.

Everything runs 100% locally with zero paid services, zero external database instances, and no Docker.

---

## 1. Core Architecture Overview

```
                      Browser Clients (React 18 + Vite)
                                    |
          +-------------------------+-------------------------+
          |                                                   |
   Public / Customer Flow                             Admin Dashboard
 (Search, View, Reserve)                             (CRUD, SSE Stream, Sim)
          |                                                   |
          | HTTP REST API (/api/*)                            | SSE (/api/events/stream)
          v                                                   v
   +---------------------------------------------------------------+
   |               FastAPI Application Layer (Port 8000)           |
   |                                                               |
   |  Routers:                                                     |
   |    - /auth        : JWT token issuance & verification         |
   |    - /hotels      : Indexed search, filters, pricing         |
   |    - /bookings    : Concurrency-guarded reservations          |
   |    - /admin       : Inventory control & ledger oversight      |
   |    - /events      : Real-time telemetry & simulator engine    |
   |                                                               |
   |  Services:                                                    |
   |    - booking.py   : Atomic overlap queries & transactions     |
   |    - auth.py      : Bcrypt salted password hashing            |
   |                                                               |
   |  In-Process SSE Engine:                                       |
   |    - Broadcaster  : asyncio.Queue fan-out (No Redis/Kafka)   |
   |    - Simulator    : Weighted autonomous traffic generator     |
   +---------------------------------------------------------------+
                                    |
                            SQLAlchemy ORM
                                    |
                     SQLite WAL Database (travel.db)
```

---

## 2. Tech Stack

### Backend
* **Python 3.13+** with **FastAPI**: Modern, type-annotated, asynchronous REST framework.
* **SQLAlchemy 2.0**: Declarative ORM abstracting database operations with model swapping readiness.
* **SQLite (Single-File DB)**: Local database engine configured in WAL (Write-Ahead Logging) mode with strict foreign key constraints.
* **Pydantic v2**: Strict schema validation, request deserialization, and serialization.
* **PyJWT & Bcrypt**: Stateless JSON Web Token authentication with salted cryptographic password hashing.
* **Pytest & HTTPX**: Comprehensive automated test suite exercising unit and integration workflows.

### Frontend
* **React 18** with **Vite**: Fast, modern Single-Page Application (SPA) development workflow.
* **React Router v6**: Client-side routing with nested admin shells and authenticated route guards.
* **Plain Modular CSS**: Custom design system modeled after dense travel marketplaces (Booking.com color palette). Zero heavy UI component library bloat.
* **Native Web APIs**: `fetch` API wrapper and native `EventSource` for Server-Sent Events streaming.

---

## 3. Directory Map

```
Goloop/
|-- backend/
|   |-- app/
|   |   |-- config.py            # Global settings, JWT secrets, database URLs
|   |   |-- database.py          # SQLAlchemy engine, connection listeners (WAL pragma)
|   |   |-- main.py              # FastAPI application factory, CORS, router mounts
|   |   |-- seed.py              # Automated database seeder (8 cities, 32 hotels, 65 rooms)
|   |   |-- models/              # SQLAlchemy declarative ORM models
|   |   |   |-- user.py          # User accounts and admin role flags
|   |   |   |-- hotel.py         # Hotels and secondary image attachments
|   |   |   |-- room.py          # Room inventory, nightly rates, guest capacities
|   |   |   +-- booking.py       # Reservation records with confirmation statuses
|   |   |-- schemas/             # Pydantic data validation contracts
|   |   |   |-- user.py          # Signup, login, and user profile schemas
|   |   |   |-- hotel.py         # Search parameters, summaries, room definitions
|   |   |   +-- booking.py       # Reservation creation and output projections
|   |   |-- services/            # Reusable business logic layer
|   |   |   |-- auth.py          # JWT creation/verification & bcrypt helpers
|   |   |   +-- booking.py       # Atomic overlap verification & double-booking engine
|   |   |-- routers/             # API HTTP endpoints
|   |   |   |-- auth.py          # /auth/signup, /auth/login, /auth/me
|   |   |   |-- hotels.py        # /hotels/search, /hotels/popular, /hotels/{id}
|   |   |   |-- bookings.py      # /bookings, /bookings/my, /bookings/{id}/cancel
|   |   |   |-- admin.py         # /admin/hotels, /admin/rooms, /admin/bookings
|   |   |   +-- events.py        # /events/stream, /admin/simulator/*
|   |   +-- simulator/           # Background autonomous traffic engine
|   |       |-- events.py        # EventBroadcaster with asyncio.Queue subscriber pipes
|   |       +-- simulator.py     # Traffic simulator generating realistic customer actions
|   +-- tests/                   # Automated pytest suite (31 tests)
|       |-- conftest.py          # In-memory test database fixtures and client overrides
|       |-- test_auth.py         # Sign-in, sign-up, and JWT decoding validation
|       |-- test_hotels.py       # Destination search, filtering, and detail lookups
|       |-- test_bookings.py     # Double-booking guard, date overlap, and cancellations
|       |-- test_admin.py        # Inventory CRUD permissions and ledger oversight
|       +-- test_simulator.py    # Simulator lifecycle, speed adjustments, SSE auth
|
|-- frontend/
|   |-- index.html               # SPA entry point with responsive viewport metadata
|   |-- package.json             # React 18, Vite, React Router dependencies
|   |-- vite.config.js           # Development server proxy (/api -> http://127.0.0.1:8000)
|   +-- src/
|       |-- App.jsx              # Main router definition wrapped in ErrorBoundary
|       |-- main.jsx             # React DOM root initialization
|       |-- api/
|       |   +-- client.js        # Centralized fetch wrapper with automatic JWT injection
|       |-- context/
|       |   +-- AuthContext.jsx  # Global authentication state provider and useAuth() hook
|       |-- components/
|       |   |-- ErrorBoundary.jsx# Class-based crash recovery boundary
|       |   |-- Navbar.jsx       # Two-row navy header with category sub-navigation
|       |   |-- Footer.jsx       # Marketplace footer with currency and policy links
|       |   +-- HotelCard.jsx    # Dual-mode card (vertical grid / horizontal search card)
|       |-- pages/
|       |   |-- HomePage.jsx     # Hero search bar, trending destinations, categories
|       |   |-- SearchPage.jsx   # 25/75 filter sidebar and horizontal search listing
|       |   |-- HotelDetailPage.jsx # Image gallery, room options, sticky reserve widget
|       |   |-- LoginPage.jsx    # Authentication portal with post-login redirect
|       |   |-- SignupPage.jsx   # New customer registration
|       |   |-- MyBookingsPage.jsx # Active and past booking ledger with cancel modal
|       |   |-- AdminPage.jsx    # Admin layout shell with security guard
|       |   |-- AdminHotelsPage.jsx # Hotel catalogue management and modals
|       |   |-- AdminRoomsPage.jsx  # Room inventory, capacity, and rate controller
|       |   |-- AdminBookingsPage.jsx # System-wide booking manager
|       |   |-- AdminDashboardPage.jsx # SSE Live Telemetry, velocity chart, stream toggle
|       |   +-- NotFoundPage.jsx # Clean 404 fallback page
|       +-- styles/
|           +-- global.css       # Design tokens (Booking.com color palette, typography)
|
+-- README.md                    # Architectural blueprint and operational manual
```

---

## 4. Key Architectural Concepts

### 1. SQLite WAL Mode and Write Concurrency
By default, SQLite uses a rollback journal that acquires exclusive file locks during write transactions, preventing concurrent read access. Goloop initializes the database with:
```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;
PRAGMA foreign_keys = ON;
```
* **WAL (Write-Ahead Logging)** allows multiple background readers to query hotels and check availability while a booking write transaction proceeds concurrently.
* **busy_timeout (5000ms)** ensures that if a momentary lock collision occurs during high simulation traffic, the worker waits up to 5 seconds rather than immediately raising an operational error.

### 2. Atomic Double-Booking Prevention Algorithm
Double-booking is prevented using strict date-range overlap verification evaluated inside a database transaction before committing.

#### The Overlap Condition
Two date ranges `[check_in, check_out)` and `[existing_in, existing_out)` overlap if and only if:
$$\text{check\_in} < \text{existing\_out} \quad \text{AND} \quad \text{check\_out} > \text{existing\_in}$$

Because departure day represents morning checkout, strict inequalities are enforced: a booking checking out on `2026-12-05` does not conflict with a new booking checking in on `2026-12-05`.

#### The Transaction Flow (`backend/app/services/booking.py`)
1. Begin a write transaction on `backend/travel.db`.
2. Count existing `confirmed` reservations for the requested `room_id` matching the overlap criteria.
3. Compare the overlap count against `room.total_rooms` (the property's physical room unit capacity).
4. If `overlap_count >= room.total_rooms`, reject the transaction immediately with `HTTP 409 Conflict`.
5. If inventory is available, insert the new booking row with status `confirmed` and commit the transaction.

### 3. Stateless JWT Authentication & Bcrypt Hashing
* Passwords are never stored in plaintext. They are salted and hashed using `bcrypt` (work factor 12).
* Upon successful authentication, the server signs a JSON Web Token containing the user ID (`sub`) and expiration timestamp (`exp`) using `HS256`.
* Client requests pass the token via the HTTP standard `Authorization: Bearer <token>` header.
* Endpoints inspect the token statelessly without hitting the database on every lookup, while dependency injection (`get_current_admin`) enforces role-based authorization for administrative controls.

### 4. In-Process Event Broadcaster & Server-Sent Events (SSE)
Instead of relying on heavy message brokers like Redis Pub/Sub or Kafka:
* An in-process `EventBroadcaster` singleton maintains a registry of client-specific `asyncio.Queue` instances.
* When an event occurs (via API or background simulator), `broadcaster.broadcast(event_type, payload)` publishes the payload non-blockingly to all active subscriber queues.
* The `/events/stream` endpoint consumes from the caller's queue and emits standards-compliant SSE chunks (`data: {...}\n\n`).
* An automated 15-second heartbeat comment (`: keep-alive\n\n`) keeps connection sockets healthy across reverse proxies and firewalls.
* The frontend includes an on/off stream toggle allowing administrators to disconnect or resume listening at will without losing historical state.

---

## 5. Local Setup and Execution Guide

### Prerequisites
* **Python 3.10+** (Python 3.13 recommended)
* **Node.js 18+** and **npm**

### Step 1: Clone the Repository
```bash
git clone https://github.com/avi-exe32/Goloop.git
cd Goloop
```

### Step 2: Install Backend Dependencies & Seed Database
From the project root:
```powershell
pip install -r backend/requirements.txt
python -m backend.app.seed
```
*The seed script populates 8 major destinations (Goa, Mumbai, Delhi, Jaipur, Kerala, Udaipur, Rishikesh, Manali), 32 hotels, 65 rooms, 128 curated photos, and creates the default user accounts.*

### Step 3: Run Backend Server
```powershell
python -m uvicorn backend.app.main:app --reload --port 8000
```
*API documentation and interactive Swagger UI become available at `http://127.0.0.1:8000/docs`.*

### Step 4: Install Frontend Dependencies & Start Client
In a separate terminal window:
```powershell
cd frontend
npm install
npm run dev
```
*The web client opens at `http://localhost:5173`.*

---

## 6. Running the Automated Test Suite

The backend includes a comprehensive pytest suite (31 tests) exercising authentication, search filters, booking concurrency, admin controls, and the SSE engine against an isolated in-memory SQLite database.

From the project root:
```powershell
python -m pytest backend/tests/ -v
```

---

## 7. Default Test Accounts

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@travel.local` | `admin123` | Full access to `/admin` (Hotel/Room CRUD, Booking ledger, Simulator controls, Live Telemetry) |
| **Demo Customer** | `demo@travel.local` | `demo123` | Standard guest access (Search, instant reservation, "My Bookings" management) |

---

## 8. Real-Time Telemetry & Simulator Controls

The administrative dashboard (`/admin/dashboard`) provides real-time visibility into traffic and reservations:

1. **Simulator Engine Controls**:
   * **Start / Stop Simulator**: Toggles the background event generation loop.
   * **Speed Multipliers**: Selectable between `1x` (1 action every 1-5 seconds), `5x`, and `20x` (high load testing).
2. **Data Stream Toggle (ON / OFF)**:
   * **STREAM ON**: Connects the native `EventSource` to `/api/events/stream`, displaying live booking velocity and feed items.
   * **STREAM PAUSED**: Gracefully closes the SSE connection, freezing all visualizations in place for manual inspection while saving network bandwidth.
3. **Live Telemetry Visualizations**:
   * **Velocity Chart**: Dynamic SVG histogram calculating bookings per minute over a rolling 10-minute window.
   * **Demand Bars**: Real-time distribution showing top booking destinations.
   * **Activity Feed**: Live event cards for confirmed bookings, cancellations, customer signups, and double-booking conflict interceptions.
