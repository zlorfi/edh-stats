# EDH/Commander Stats Tracker

A lightweight, responsive web application for tracking Magic: The Gathering EDH/Commander games with comprehensive statistics and analytics. Built with Fastify (Node.js), SQLite, and Alpine.js for optimal performance and simplicity.

## Features

### ✅ Implemented
- **Secure Authentication**: JWT-based login/registration system with password hashing (HS512).
- **Commander Management**:
  - CRUD operations for Commanders.
  - MTG Color Identity picker (WUBRG).
  - Search and filter functionality.
  - Validation for names and colors.
- **Game Logging**:
  - Log game results (Win/Loss).
  - Track player count, rounds, and specific win conditions (Starting Player, Sol Ring T1).
  - Associate games with specific Commanders.
- **Statistics Dashboard**:
  - **Overview**: Total games, win rate, active decks, average rounds.
  - **Visualizations**:
    - Win Rate by Color Identity (Chart.js Doughnut).
    - Win Rate by Player Count (Chart.js Bar).
  - **Detailed Tables**: Per-commander performance metrics.
- **Responsive UI**: Mobile-friendly design using Tailwind CSS and Alpine.js.
- **Infrastructure**: Docker Compose setup for development and production.

### 🚧 Pending / Roadmap
- **Live Round Counter**: Interactive real-time counter during games (currently post-game entry only).
- **Advanced Trends**: Historical performance trends over time (endpoints `/api/stats/trends` not yet implemented).
- **Commander Comparison**: Direct head-to-head comparison tool.
- **HTTPS Configuration**: Production Nginx setup with SSL.
- **Unit/Integration Tests**: Comprehensive test suite (currently partial).

## Technology Stack

- **Backend**: Fastify (Node.js v20+)
- **Database**: SQLite (better-sqlite3) with WAL mode
- **Frontend**: Alpine.js, Tailwind CSS (CDN)
- **Visualization**: Chart.js
- **Containerization**: Docker & Docker Compose

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Git

### Running with Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd edh-stats

# Start the application
docker-compose up -d

# Access the application
# Frontend: http://localhost:8081
# Backend API: http://localhost:3002
```

> **Note:** Default ports are `8081` (Frontend) and `3002` (Backend) to avoid conflicts.

### Local Development

If you prefer running without Docker:

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (served via simple HTTP server or Nginx)
cd frontend
# Use any static file server, e.g., 'serve'
npx serve public -p 8081
```

## Project Structure

```
edh-stats/
├── backend/
│   ├── src/
│   │   ├── config/         # DB & Auth config
│   │   ├── database/       # Migrations & Seeds
│   │   ├── models/         # Data access layer (Commander, Game, User)
│   │   ├── routes/         # API endpoints
│   │   └── server.js       # App entry point
│   └── Dockerfile
├── frontend/
│   ├── public/             # Static assets
│   │   ├── css/            # Custom styles
│   │   ├── js/             # Alpine.js logic
│   │   └── *.html          # Views
│   └── Dockerfile
├── database/               # Persisted SQLite data
├── docker-compose.yml      # Dev orchestration
└── README.md
```

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register`
- `POST /login`
- `GET /me`

### Commanders (`/api/commanders`)
- `GET /` - List/Search
- `POST /` - Create
- `GET /popular` - Top commanders
- `GET /:id` - Details
- `PUT /:id` - Update
- `DELETE /:id` - Remove

### Games (`/api/games`)
- `GET /` - History
- `POST /` - Log result
- `PUT /:id` - Edit record
- `DELETE /:id` - Remove record

### Statistics (`/api/stats`)
- `GET /overview` - KPI cards
- `GET /commanders` - Detailed breakdown & charts

## Development Notes

### Database
The SQLite database file is stored in `./database/data/edh-stats.db`. It uses `PRAGMA journal_mode = WAL` for performance.
Migrations are run automatically on server start if `NODE_ENV != 'test'`.

### Frontend State
State management is handled by Alpine.js components (`commanderManager`, `gameManager`, `statsManager`).
Authentication tokens are stored in `localStorage` or `sessionStorage`.

## License
MIT
