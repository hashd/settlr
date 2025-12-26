# Settlr

A modern, offline-first expense sharing app.

## Tech Stack

- **Frontend**: Vue 3 + TypeScript + Vite
- **Backend**: Node.js + GraphQL Yoga + Prisma
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- Supabase account

### Installation

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev
```

### Development

```bash
# Run frontend only
pnpm dev:web

# Run backend only
pnpm dev:api
```

## Project Structure

```
settlr/
├── apps/
│   ├── web/          # Vue 3 PWA
│   └── api/          # GraphQL API
├── packages/
│   └── shared/       # Shared types
└── pnpm-workspace.yaml
```
