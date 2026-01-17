# EDH/Commander Stats Tracker

A lightweight, responsive web application for tracking Magic: The Gathering EDH/Commander games with comprehensive statistics and analytics. Built with Fastify (Node.js), PostgreSQL, and Alpine.js for optimal performance and scalability.

## Features

### ✅ Implemented

#### Authentication & Users
- **Secure Authentication**: JWT-based login/registration system with password hashing (HS512).
- **User Profile Management**: View and edit user profile information.
- **Session Management**: Persistent authentication with localStorage/sessionStorage support.
- **Configurable Registration**: Toggle user registration on/off via `ALLOW_REGISTRATION` environment variable for controlled access.

#### Commander Management
- **CRUD Operations**: Create, read, update, and delete Commander decks.
- **MTG Color Identity Picker**: Interactive WUBRG color selection with visual indicators.
- **Search & Filter**: Find commanders by name with real-time search.
- **Validation**: Comprehensive name and color validation.
- **Popular Commanders**: View your most-played commanders at a glance.

#### Game Logging
- **Game Result Tracking**: Log wins and losses with detailed statistics.
- **Round Tracking**: Record the number of rounds each game lasted.
- **Player Count**: Track games with 2-8 players.
- **Special Conditions**: Record specific win conditions:
  - Did the starting player win?
  - Did a Turn 1 Sol Ring player win?
- **Game Notes**: Add custom notes to each game record (full-width text area with auto-sizing).
- **Commander Association**: Link games to specific Commanders with automatic name/color display.
- **Edit History**: Modify game records after logging with real-time UI updates.

#### Live Round Counter ⭐ (NEW)
- **Real-Time Tracking**: Interactive counter with live elapsed time (HH:MM:SS).
- **Round Management**: Increment/decrement rounds with large, easy-to-use buttons.
- **Game Duration**: Automatic calculation of game elapsed time.
- **Average Time Calculation**: Track average time per round.
- **Quick Jump**: Jump to specific rounds (5, 7, 10) quickly.
- **Fullscreen Mode**: Expand counter for better visibility during gameplay.
- **Persistent State**: Game progress saved to localStorage and survives page refreshes.
- **24-Hour Auto-Reset**: Counters older than 24 hours automatically reset.
- **Seamless Integration**: Directly log games from the round counter with prefilled data.

#### Game Logging Workflow Integration ⭐ (NEW)
- **Smart Prefill**: When ending a game from the round counter, the game logging form automatically populates with:
  - Actual round count from the counter
  - Game date (today's date)
  - Auto-generated notes showing duration and round count
- **Auto-Open Form**: Game logging form automatically displays when returning from the round counter.
- **Auto-Scroll**: Form scrolls into view automatically for seamless UX.
- **One-Click Logging**: Minimize manual data entry by prefilling common fields.

#### Statistics Dashboard
- **KPI Overview**: Display total games, win rate, active decks, average rounds (dynamically loaded).
- **Commander Stats**: Top commanders (5+ games) with game counts and win rates, sorted by most-played.
- **Recent Games**: Latest 5 games with commander colors and results displayed.
- **Game Statistics**: View statistics for individual commanders with comprehensive metrics.

#### Visualizations (Chart.js)
- **Win Rate by Color Identity**: Doughnut chart showing performance by color combination.
- **Win Rate by Player Count**: Bar chart showing win rates across different player counts.
- **Detailed Tables**: Per-commander performance metrics and trends.

#### User Interface
- **Responsive Design**: Mobile-friendly layout using Tailwind CSS.
- **Dark Theme**: Professional dark color scheme with proper contrast.
- **Alpine.js Components**: Lightweight, reactive UI without heavy frameworks.
- **Professional Navigation**: Easy access to all major features.
- **Accessibility**: Semantic HTML and accessible form controls.

#### Infrastructure & Deployment
- **Docker Support**: Complete Docker and Docker Compose setup.
- **Development Environment**: Pre-configured with hot-reload and logging.
- **Database**: PostgreSQL 16 with connection pooling and automated migrations.
- **Automated Migrations**: Database schema management on startup.
- **Rate Limiting**: Configurable global rate limiting with per-endpoint overrides.
- **Request Logging**: Comprehensive request/response logging for debugging.

### 🚧 Pending / Roadmap

#### Analytics & Insights
- **Advanced Trends**: Historical performance trends over time (endpoints `/api/stats/trends` not yet implemented).
- **Win Rate Trends**: Visualize win rate changes over weeks/months.
- **Player Count Analysis**: Identify which player counts you perform best in.

#### Features
- **Commander Comparison**: Direct head-to-head comparison tool (stats, win rates, matchups).
- **Deck Notes**: Add longer notes/strategy notes to Commander decks.
- **Game Filters**: Advanced filtering by date range, player count, color, etc.
- **Export Data**: CSV/JSON export for external analysis.

#### System Features
- **Unit/Integration Tests**: Comprehensive test suite for backend and frontend.
- **API Documentation**: Swagger/OpenAPI documentation.
- **Performance Optimization**: Database query optimization and caching.

#### Deployment & Security
- **HTTPS Configuration**: Production-ready Nginx setup with SSL/TLS.
- **User Preferences**: Store user settings (theme, preferences).
- **Password Reset**: Forgot password functionality with email verification.

## Technology Stack

- **Backend**: Fastify (Node.js v20+)
- **Database**: PostgreSQL 16 with connection pooling (pg library)
- **Frontend**: Alpine.js, Tailwind CSS (CDN)
- **Visualization**: Chart.js
- **Containerization**: Docker & Docker Compose
- **Authentication**: JWT with HS512 hashing
- **Password Security**: bcryptjs with 12-round hashing
- **Rate Limiting**: @fastify/rate-limit plugin with configurable limits

## Quick Start

### Prerequisites
- Docker & Docker Compose (recommended)
- Or: Node.js v20+, npm, and Python 3

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

> **Note:** Default ports are `8081` (Frontend) and `3002` (Backend) to avoid conflicts. PostgreSQL runs on `5432`.

#### Custom Environment Variables

You can customize the database and other settings by creating or editing `.env`:

```bash
# Copy the example to create your own
cp .env.example .env

# Edit .env with your preferred settings
nano .env

# Start with custom environment
docker-compose up -d
```

Common customizations:

```env
# Change PostgreSQL password
DB_PASSWORD=your_secure_password

# Enable debug logging
LOG_LEVEL=debug

# Tighten rate limiting
RATE_LIMIT_WINDOW=5
RATE_LIMIT_MAX=50

# Disable user registration
ALLOW_REGISTRATION=false
```

#### Environment Variables Reference

Key environment variables you can configure in `.env`:

```env
# PostgreSQL Database Configuration
DB_HOST=localhost                    # Database server hostname/IP
DB_NAME=edh_stats                    # Database name
DB_USER=postgres                     # Database user (must be superuser for migrations)
DB_PASSWORD=edh_password             # Database password (MUST be changed in production)
# PostgreSQL always uses standard port 5432 (not configurable)

# Application Configuration
NODE_ENV=development                 # Set to 'production' in production
LOG_LEVEL=info                       # Log level: debug, info, warn, error

# Security
JWT_SECRET=your-super-secure-jwt-secret-key-change-this-in-production

# CORS Configuration
CORS_ORIGIN=http://localhost:80

# User Registration - Set to 'true' to enable signup, 'false' to disable
ALLOW_REGISTRATION=true

# Rate Limiting (optional - default: 100 requests per 15 minutes)
RATE_LIMIT_WINDOW=15                 # Time window in MINUTES
RATE_LIMIT_MAX=100                   # Max requests per window

# Database Seeding (optional - for development only)
DB_SEED=false                        # Set to 'true' to auto-seed sample data on startup

# Database Connection Pooling (Advanced - optional)
# DB_POOL_MIN=2
# DB_POOL_MAX=10
```

### Local Development

If you prefer running without Docker:

```bash
# Create .env file in root directory
cp .env.example .env
# Edit .env with your configuration

# Backend
cd backend
npm install
npm run dev  # Starts with hot-reload

# Frontend (in another terminal)
cd frontend
# Use any static file server, e.g., 'serve' or Python's http.server
npx serve public -p 8081
# OR
python3 -m http.server 8081 --directory public
```

> **Important**: The `.env` file must be in the root project directory, not in the backend folder. The application will automatically load it from there.

## Project Structure

```
edh-stats/
├── backend/
│   ├── src/
│   │   ├── config/         # Database & Auth configuration
│   │   ├── database/       # Migrations & Seeds
│   │   ├── middleware/     # Fastify middleware
│   │   ├── models/         # Data access layer (Commander, Game, User)
│   │   ├── routes/         # API endpoint handlers
│   │   ├── utils/          # Utility functions
│   │   └── server.js       # Application entry point
│   ├── package.json        # Node.js dependencies
│   └── Dockerfile
├── frontend/
│   ├── public/
│   │   ├── css/            # Tailwind styles
│   │   ├── js/             # Alpine.js components
│   │   ├── components/     # Reusable HTML components
│   │   ├── *.html          # View files
│   │   └── round-counter.html  # Live round counter (NEW)
│   ├── tailwind.config.js  # Tailwind configuration
│   ├── package.json        # Node.js dependencies
│   └── Dockerfile
├── postgres_data/          # Persisted PostgreSQL data (Docker volume)
├── docs/                   # Documentation
├── FIXES.md                # Detailed list of fixes applied
├── FEATURES.md             # Feature documentation
├── docker-compose.yml      # Development orchestration
├── deploy.sh               # Production deployment script
└── README.md
```

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - Login user
- `GET /me` - Get current user profile
- `PATCH /me` - Update user profile
- `POST /change-password` - Change password
- `POST /refresh` - Refresh authentication token

### Commanders (`/api/commanders`)
- `GET /` - List/Search commanders
- `POST /` - Create new commander
- `GET /popular` - Get top commanders by games played
- `GET /:id` - Get commander details
- `GET /:id/stats` - Get commander statistics
- `PUT /:id` - Update commander
- `DELETE /:id` - Delete commander

### Games (`/api/games`)
- `GET /` - List games with pagination and filtering
- `POST /` - Log new game result
- `GET /:id` - Get game details
- `PUT /:id` - Edit game record
- `DELETE /:id` - Delete game record

### Statistics (`/api/stats`)
- `GET /overview` - Get user overview statistics (total games, win rate, etc.)
- `GET /commanders` - Get detailed commander statistics with charts

### Health Check
- `GET /api/health` - Server and database health status

## Usage Guide

### Logging Into the Application
1. Navigate to http://localhost:8081
2. Use the registration or login form
3. After authentication, you'll be redirected to the dashboard

### Managing Commanders
1. Click "Commanders" in the navigation
2. Click "Add Commander" to create a new deck
3. Select the color identity (WUBRG)
4. Edit or delete existing commanders from the list

### Logging Games
1. Click "Log Game" in the navigation
2. Fill in the game details:
   - Select your commander
   - Choose number of players (2-8)
   - Mark if you won or lost
   - Record the number of rounds
   - Check special conditions if applicable
3. Click "Log Game"

### Using the Round Counter
1. Click "Start Round Counter" on the dashboard
2. Click "Start Game" to begin tracking
3. Use the large **+** button to increment rounds
4. Use the large **−** button to decrement rounds
5. View real-time elapsed time and average time per round
6. Click "End Game & Log Results" when finished
7. The game logging form will open with prefilled values

### Viewing Statistics
1. Click "Statistics" in the navigation
2. View your KPI cards (Total Games, Win Rate, etc.)
3. See charts for win rate by color and player count
4. View detailed commander statistics

## Development Notes

### PostgreSQL Database Setup

#### Connection Details
- **Database**: PostgreSQL 16 (containerized in Docker)
- **Connection Library**: Node.js `pg` library (async/await)
- **Host**: postgres (configurable via `DB_HOST`)
- **Port**: 5432 (PostgreSQL standard port, not configurable)
- **Name**: edh_stats (configurable via `DB_NAME`)
- **User**: postgres (configured via `DB_USER`)
- **Connection Pool**: Automatic pooling (configurable via `DB_POOL_MIN`/`DB_POOL_MAX`)

#### Migrations & Schema
- **Auto-migrations**: Database schema automatically created on server startup
- **Migration File**: `src/database/migrations.sql`
- **Seed Data**: Optional test data can be seeded via `DB_SEED=true`
- **Foreign Keys**: Enabled for data integrity

#### Database Objects
- **Tables**: users, commanders, games, user_stats (summary)
- **Views**: 
  - `user_stats`: Aggregates user-level statistics (total games, win rate, etc.)
  - `commander_stats`: Aggregates per-commander statistics (shown for commanders with 5+ games)
- **JSONB Fields**:
  - `commanders.colors`: Color identity array stored as JSONB
  - Automatically parsed by pg driver - no JSON.parse() needed in code

#### Tips & Common Operations

**Reset Database**
```bash
# Remove PostgreSQL volume to reset all data
docker compose down -v
docker compose up -d
```

**View Database Directly**
```bash
# Connect to PostgreSQL container
docker compose exec postgres psql -U postgres -d edh_stats

# List tables
\dt

# Exit
\q
```

**Check Connection Pool Status**
The application logs connection pool info at startup. To debug connection issues, set `LOG_LEVEL=debug` to see detailed connection logging.

### Frontend State Management
- Alpine.js components handle all state management
- No external state management library needed
- Components: 
  - `app()`: Main dashboard and page initialization
  - `commanderManager()`: Commander CRUD operations
  - `gameManager()`: Game logging and editing
  - `roundCounterApp()`: Real-time round counter with game timing
- Authentication tokens stored in `localStorage` (persistent) or `sessionStorage` (session-only)
- Data persistence: `localStorage` for round counter state
- Dynamic content loading: Partial HTML pages loaded and inserted via loaders

### Authentication Flow
1. User registers with username and password
2. Password hashed with bcryptjs (12 rounds)
3. JWT token generated (HS512 algorithm)
4. Token stored in browser (localStorage/sessionStorage)
5. Token validated on protected routes
6. Automatic token validation on component initialization

### Error Handling
- All API errors return appropriate HTTP status codes
- Validation errors provide detailed feedback
- Database errors logged but generic messages sent to client
- Frontend gracefully handles network failures

## Recent Changes & Fixes

### Latest Updates (Session 3 - PostgreSQL Migration & Refinements)

#### Major: SQLite → PostgreSQL Migration ✅
- **Database**: Migrated from SQLite (better-sqlite3) to PostgreSQL 16
- **Async/Await**: Converted all database operations to async/await pattern
- **Connection Pooling**: Uses pg library with automatic connection pooling
- **JSONB Support**: Color arrays now stored as PostgreSQL JSONB type (auto-parsed by pg driver)
- **No Breaking Changes**: Fully backward compatible with existing frontend

#### Configuration Simplification
- **Removed DB_PORT**: Now uses PostgreSQL standard port 5432 (not configurable)
- **Cleaner Environment**: Only essential variables need configuration
- **Security**: PostgreSQL port no longer exposed to host network
- **Simplified Docs**: Better clarity on what settings are configurable vs. standard

#### Rate Limiting & Logging
- **Global Rate Limiting**: Configurable via `RATE_LIMIT_WINDOW` (minutes) and `RATE_LIMIT_MAX` (requests)
- **Default**: 100 requests per 15 minutes (per IP address)
- **Per-Endpoint Limits**: Individual endpoints have their own stricter limits
- **Request Logging**: Comprehensive request/response logging at debug level
- **Logs Include**: Method, URL, IP, status code, response time

#### Environment Variables (Simplified)
- **All configuration**: Centralized in `.env` file
- **PostgreSQL Connection**: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (port is standard 5432)
- **Rate Limiting**: `RATE_LIMIT_WINDOW`, `RATE_LIMIT_MAX` (optional)
- **Logging**: `LOG_LEVEL` (debug, info, warn, error)
- **Database Seeding**: `DB_SEED` (optional, for development)

### Previous Updates (Session 2)
- **Top Commanders Display**: Fixed filtering to show all commanders with 5+ games, sorted by most-played first
- **Game Notes UI**: Expanded textarea width to full width with improved sizing (5 rows)
- **Data Consistency**: Fixed camelCase/snake_case field naming throughout API and frontend
- **Environment Configuration**: Fixed .env file loading from root directory in Docker containers
- **Registration Control**: Added `ALLOW_REGISTRATION` environment variable to toggle signup availability
- **Game API Response**: Ensured all game endpoints return complete commander information (name, colors)
- **Form Validation**: Improved notes field handling to prevent null value validation errors
- **Frontend Error Handling**: Fixed Alpine.js key binding issues in top commanders template

### Previous Session Fixes
This version includes **19+ bug fixes and improvements** addressing:
- SQL parameter mismatches and injection vulnerabilities
- Boolean type conversion issues in form submissions
- Invalid Alpine.js expressions and duplicate elements
- Corrupted SVG paths in UI components
- Field name mismatches between frontend and backend
- Color parsing and null/undefined value handling
- Tailwind dark mode conflicts with system theme
- Navbar text visibility issues

See `FIXES.md` for detailed documentation of all fixes.

## Future Enhancements

- Real-time multiplayer game tracking
- Advanced statistical analysis and trends
- Integration with MTG databases for card suggestions
- Mobile native application
- Live notifications for game updates
- Keyboard shortcuts for faster game logging
- Voice commands for hands-free operation
- Cloud backup and sync

## License

MIT

## Support

For bug reports or feature requests, please create an issue in the repository.
