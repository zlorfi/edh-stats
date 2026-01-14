# EDH/Commander Stats Tracker

A lightweight, responsive web application for tracking Magic: The Gathering EDH/Commander games with comprehensive statistics and analytics. Built with Fastify (Node.js), SQLite, and Alpine.js for optimal performance and simplicity.

## Features

- **Secure Authentication**: JWT-based login system with password hashing
- **Commander Management**: Track all your commanders with MTG color identity
- **Game Logging**: Detailed game statistics including:
  - Player count (2-8 players)
  - Commander played
  - Game date and duration
  - Win/loss tracking
  - Round count
  - Starting player advantage
  - Sol Ring turn one impact
- **Statistics Dashboard**: Visual analytics with Chart.js
- **Live Round Counter**: Track ongoing games in real-time
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS

## Technology Stack

- **Backend**: Fastify with JWT authentication (HS512)
- **Database**: SQLite with volume persistence
- **Frontend**: Alpine.js (~10KB) with Tailwind CSS
- **Deployment**: Docker Compose with multi-stage builds
- **Charts**: Chart.js with Alpine.js reactivity

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd edh-stats

# Start the application
docker-compose up -d

# Access the application
# Frontend: http://localhost:80
# Backend API: http://localhost:3000
```

## Project Structure

```
edh-stats/
├── README.md                     # This documentation
├── docker-compose.yml             # Development environment
├── docker-compose.prod.yml        # Production environment
├── .env.example                   # Environment variables template
├── .gitignore                     # Git ignore patterns
├── backend/
│   ├── Dockerfile                 # Multi-stage Docker build
│   ├── package.json               # Node.js dependencies
│   ├── .dockerignore              # Docker build optimizations
│   └── src/
│       ├── server.js              # Main application entry point
│       ├── config/
│       ├── models/
│       ├── routes/
│       ├── middleware/
│       ├── database/
│       └── utils/
├── frontend/
│   ├── public/                    # HTML pages
│   ├── css/                       # Compiled styles
│   └── js/                        # Alpine.js components
└── database/
    └── data/                      # SQLite data directory
```

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - JWT token generation
- `POST /refresh` - Token refresh

### Commanders (`/api/commanders`)
- `GET /` - List user's commanders
- `POST /` - Create new commander
- `PUT /:id` - Update commander
- `DELETE /:id` - Delete commander

### Games (`/api/games`)
- `GET /` - List games with filtering
- `POST /` - Log new game
- `PUT /:id` - Update game
- `DELETE /:id` - Delete game

### Statistics (`/api/stats`)
- `GET /overview` - Overall statistics
- `GET /commanders/:id` - Commander performance
- `GET /trends` - Performance trends
- `GET /comparison` - Commander comparison

## Database Schema

The application uses SQLite with the following main tables:

- `users` - User accounts and authentication
- `commanders` - Commander cards with color identity
- `games` - Game records with detailed statistics

## Development

### Prerequisites
- Docker and Docker Compose
- Node.js 20+ (for local development)
- Git

### Development Setup

```bash
# Install dependencies (backend)
cd backend
npm install

# Install dependencies (frontend)
cd ../frontend
npm install

# Start development environment
docker-compose up

# Or run locally
cd backend && npm run dev
cd frontend && npm run dev
```

### Environment Variables

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Configure the following variables:
- `JWT_SECRET` - JWT signing secret
- `DATABASE_PATH` - SQLite database file location
- `NODE_ENV` - Environment (development/production)
- `CORS_ORIGIN` - Frontend domain

## Deployment

### Production Deployment

```bash
# Build and deploy to production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f

# Stop application
docker-compose down
```

### Security Notes

- Use strong JWT secrets in production
- Enable HTTPS in production
- Regular database backups recommended
- Monitor resource usage and logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Create an issue in the repository
- Check the documentation in `/docs`
- Review API documentation at `/docs/API.md`