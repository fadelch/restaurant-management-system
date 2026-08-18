# AGENTS

## Purpose

This repository is a Next.js 15 application using the App Router and Prisma. The file is intended to help AI coding agents understand the project's structure, conventions, and how to stay productive quickly.

## Project type

- Next.js 15 app router project
- Uses Turbopack for local development and production builds
- Uses PostgreSQL via Prisma
- Code is organized under `src/`
- Uses `@/*` path alias to reference files from `src/`

## Key commands

- `npm run dev` — start local development server
- `npm run build` — production build
- `npm run start` — start built app

## Important directories

- `src/app/` — Next.js app routes and layouts
  - `src/app/(auth)/` — login and signup pages
  - `src/app/(main)/` — public home pages
  - `src/app/Admin/` — admin pages for food, order, user management
  - `src/app/cart/` — shopping cart UI
- `src/components/` — reusable UI components
- `src/context/CartContext.tsx` — cart context provider
- `src/lib/prisma.tsx` — Prisma client singleton setup
- `src/server/` — server-side actions and database queries
- `src/generated/prisma/` — generated Prisma client output
- `prisma/schema.prisma` — database schema and models

## Data model overview

The Prisma schema defines these models:

- `User` with admin/banned flags and relation to `Order`
- `FoodType` and `Food` with type relations
- `Order` with status, payment, address, and user relation
- `OrderItem` linking orders and foods

## Conventions

- Server-side database logic lives in `src/server/*`
- Server action files use `"use server"`
- Client UI pages use `"use client"` when needed
- Use `prisma` imported from `src/lib/prisma.tsx` for database access
- Authentication state is stored in browser `sessionStorage` for client pages
- Admin and user roles are gated by session values stored under `Admin` / `SuperAdmin`

## Agent guidance

- Preserve App Router conventions; do not convert pages to the old pages-router style
- Keep server-only code out of client components
- Prefer updating `src/server/*` actions for database mutations and queries instead of adding raw fetch logic where a server action is appropriate
- Avoid modifying generated Prisma client files in `src/generated/prisma/`

## What is not present

- No explicit test framework or test scripts currently configured
- No dedicated lint command in `package.json`

## Notes for new tasks

- If working on database changes, update `prisma/schema.prisma` and regenerate Prisma client
- If adding new routes, place them under `src/app/` and follow the existing `use client` / server action split
- Keep UI styling consistent with Tailwind CSS utility classes already in use
