# Server API Layer

This project now includes a runnable Express + Prisma scaffold inside `src/server`.

## Main entry points
- `src/server/index.ts`: boot server and connect Prisma
- `src/server/app.ts`: express app config
- `src/server/db/prisma.ts`: Prisma client singleton
- `src/server/config/env.ts`: environment validation

## Available routes
- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/admin/dashboard`

## Quick start
1. Create `.env` from `.env.example`
2. Start MySQL and make sure `DATABASE_URL` is correct
3. Run `npm install`
4. Run `npm run prisma:generate`
5. Run `npm run dev:server`
6. Run frontend with `npm run dev`
