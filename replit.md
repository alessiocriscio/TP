# TripPulse

## Overview
TripPulse is an AI-powered travel planner web application. Users can describe their dream trip and get personalized flight options. The app supports multiple languages (IT, EN, ES, DE, FR) and covers 75+ airports worldwide.

## Architecture
- **Frontend**: React 19 + Vite 7 + TailwindCSS 4 + Radix UI components
- **Backend**: Express + tRPC (single server serves both)
- **Database**: PostgreSQL (via Drizzle ORM + @neondatabase/serverless)
- **Package Manager**: pnpm
- **Language**: TypeScript

## Project Structure
```
client/          - React frontend (Vite)
  src/
    _core/       - Core hooks (auth, etc.)
    components/  - UI components (shadcn/radix-based)
    contexts/    - React contexts
    hooks/       - Custom hooks
    lib/         - Utilities (trpc client, etc.)
    pages/       - Page components
server/          - Express backend
  _core/         - Core server setup (index, vite, oauth, chat, etc.)
  db.ts          - Database access layer
  routers.ts     - tRPC routers
shared/          - Shared types/constants between client and server
drizzle/         - Database schema and migrations
```

## Key Configuration
- Server binds to 0.0.0.0:5000 (frontend + backend on same port)
- Vite dev server runs in middleware mode within Express
- Database: PostgreSQL (Replit built-in, originally MySQL - converted)
- OAuth: Requires VITE_OAUTH_PORTAL_URL and VITE_APP_ID env vars for login

## Scripts
- `pnpm dev` - Development server with hot reload
- `pnpm build` - Build for production (Vite + esbuild)
- `pnpm start` - Production server
- `pnpm db:push` - Generate and run database migrations

## Recent Changes
- 2026-02-21: Imported from GitHub, converted MySQL to PostgreSQL, configured for Replit environment
