# Settlr

**Settlr** is a modern, premium expense-sharing application designed to make splitting bills with friends, roommates, and travel groups effortless and elegant. Built with a focus on user experience, it features a sophisticated UI, real-time updates, and seamless email notifications.

![Settlr App](./apps/web/public/pwa-512x512.png)

<!-- Replace with an actual screenshot if available, for now using app icon path or placeholder -->

## ✨ Features

- **Group Management**: Create groups for trips, home, or events.
- **Expense Tracking**: Add expenses with multi-payer support, split by percentage, shares, or exact amounts.
- **Debt Simplification**: Automatically calculates the simplest way to settle debts.
- **Email Notifications**: premium, custom-designed email alerts for invites and payment reminders (via **Resend**).
- **Activity Feed**: Track who added or updated expenses in real-time.
- **Recurring Expenses**: Set up rent, subscriptions, and bills to repeat automatically.
- **Premium UI**: A "Premium Light" aesthetic with glassmorphism, fluid animations, and dark mode support.

## 🛠 Tech Stack

**Frontend (Web)**

- **Framework**: Vue 3 (Composition API)
- **Build Tool**: Vite
- **Styling**: Vanilla CSS (Variables, Flex/Grid) with a custom Design System
- **State Management**: Pinia
- **GraphQL Client**: Apollo Client

**Backend (API)**

- **Runtime**: Node.js
- **API**: GraphQL Yoga (Pothos Schema)
- **Database ORM**: Prisma
- **Database**: PostgreSQL
- **Email**: Resend SDK

**Infrastucture**

- **Monorepo**: Yarn Workspaces
- **Deployment**: Render.com

## 🚀 Getting Started

Follow these instructions to set up the project locally.

### Prerequisites

- **Node.js** (v20+)
- **Yarn** (v1.22+)
- **PostgreSQL** Database (Local or Cloud)

### Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/your-username/settlr.git
    cd settlr
    ```

2.  Install dependencies:
    ```bash
    yarn install
    ```

### Configuration

#### Backend (`apps/api`)

Create a `.env` file in `apps/api`:

```env
# Database connection
DATABASE_URL="postgresql://user:password@localhost:5432/settlr?schema=public"

# Auth Secret (any random string)
JWT_SECRET="super-secret-jwt-key"

# Email Service (Resend)
RESEND_API_KEY="re_..."
```

#### Frontend (`apps/web`)

Create a `.env` file in `apps/web`:

```env
# API Endpoint
VITE_API_URL="http://localhost:4000"
```

### Database Setup

Run database migrations to set up the schema:

```bash
yarn workspace @settlr/api db:migrate
```

_(Optional) Seed the database:_

```bash
yarn workspace @settlr/api db:seed
```

### Running Locally

Start both the `web` and `api` services concurrently:

```bash
yarn dev
```

- **Web App**: [http://localhost:5173](http://localhost:5173)
- **GraphQL Playground**: [http://localhost:4000/graphql](http://localhost:4000/graphql)

## 📦 Project Structure

```
settlr/
├── apps/
│   ├── web/          # Vue 3 Frontend application
│   └── api/          # GraphQL Node.js Backend
├── packages/         # Shared libraries (if applicable)
├── deploy-to-render.md # Deployment instructions
└── package.json      # Workspace configuration
```

## 🌍 Deployment

Settlr is verified for deployment on **Render.com**.
See [deploy-to-render.md](./deploy-to-render.md) for a complete step-by-step guide.

## 📄 License

This project is licensed under the MIT License.
