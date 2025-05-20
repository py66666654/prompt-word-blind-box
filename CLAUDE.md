# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Prompt Word Blind Box is a web application that allows users to randomly draw AI prompt cards with different rarity levels in a "blind box" style. The app features a collection system, social interactions, achievements, and more.

## Development Commands

### Server Development

```bash
# Install dependencies
npm install

# Start development server with hot-reload
npm run dev

# Start production server
npm start

# Run auth test script
npm run test:auth
```

### Database Setup

```bash
# Initialize the database (run MySQL client)
mysql -u your_username -p < database_schema_updated.sql
```

## Environment Configuration

Create a `.env` file in the root directory using `.env.example` as a template:

```
# Database configuration
DB_HOST=localhost
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=prompt_blind_box_db
DB_PORT=3306

# Server configuration
PORT=3000

# JWT secret for authentication
JWT_SECRET=your_jwt_secret_key

# Email configuration for password reset and verification
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_app_password

# Frontend URL for email links
FRONTEND_URL=http://localhost:3000
```

## Architecture

### Backend

- **Framework**: Node.js with Express.js
- **Database**: MySQL
- **Authentication**: JWT-based auth system
- **Real-time**: WebSocket support for notifications

### Frontend

- **Stack**: Vanilla JavaScript, HTML5, CSS3
- **Authentication**: JWT stored in localStorage
- **UI Components**: Custom components for cards, filters, and blind box animations

## Core Components

### Database Structure

- **prompt_cards**: Stores all prompt cards with text, preview URL, quality score, and rarity
- **users**: User accounts with authentication information
- **user_collections**: Links users to their collected prompt cards
- **rarity_levels**: Defines the rarity tiers and their probabilities
- **categories** and **prompt_types**: Categorization for prompts

### Key Features

1. **Blind Box System**: Random drawing of prompt cards with weighted probability by rarity
2. **AI Generation**: System can generate new prompts using templates and vocabulary
3. **Collection System**: Users can collect and manage their favorite prompts
4. **Social Features**: Comments, ratings, shares, and follows
5. **Achievement System**: Rewards for different user activities
6. **Leaderboards**: Rankings for active users

### API Structure

- **/api/prompts**: Endpoints for retrieving and categorizing prompts
- **/api/users**: User registration, authentication, and profile management
- **/api/collections**: User collection management
- **/api/ratings**, **/api/comments**: Social interaction endpoints

## Important Files

- **server.js**: Main entry point for the application
- **config/database.js**: Database connection configuration
- **routes/index.js**: Central router configuration
- **controllers/**: Business logic handlers for API endpoints
- **services/ai-prompt-generator.js**: Service for generating AI prompts
- **middlewares/auth.middleware.js**: JWT authentication middleware
- **public/**: Frontend assets including HTML, CSS, and client-side JavaScript

## Development Workflow

1. Start the development server with `npm run dev`
2. Make backend changes in the appropriate controllers or services
3. API endpoints are available at `http://localhost:3000/api`
4. Frontend code is in the `public/` directory
5. Database schema changes should be made in `database_schema_updated.sql`

## Common Development Tasks

### Adding New Prompt Types

1. Update the `prompt_types` table in the database
2. Add corresponding templates in `services/ai-prompt-generator.js`
3. Update the frontend to display the new type properly

### Adding New Rarity Levels

1. Update the `rarity_levels` table in the database
2. Adjust the CSS styles in `public/styles.css` for the new rarity

### Implementing New Social Features

1. Create database tables for the new feature
2. Add controller and routes for the API endpoints
3. Implement frontend components in the public directory