# AgriConnect

Smart Crop Advisory & Farm-to-Market Marketplace Platform.

Built for 24CIE554 — Full Stack Development.
Team: Aditya Mundra (1MS24CI009), Harsh Tiwari (1MS24CI052).

## Stack

- **Frontend:** React (Vite), React Router, Axios, Recharts
- **Backend:** Node.js + Express (ESM), REST API
- **Database:** PostgreSQL
- **Auth:** JWT + bcrypt

## Project structure

```
agriconnect/
├── client/   React app (Vite)
├── server/   Express API
└── README.md
```

## Getting started

### 1. Database

Create a PostgreSQL database (a free [Neon](https://neon.tech) project works well) and note its
connection string.

```bash
cd server
cp .env.example .env   # fill in DATABASE_URL and JWT_SECRET
node db/migrate.js     # applies db/schema.sql
```

### 2. Backend

```bash
cd server
npm install
npm run dev             # http://localhost:5000
```

### 3. Frontend

```bash
cd client
npm install
cp .env.example .env    # defaults to http://localhost:5000/api
npm run dev              # http://localhost:5173
```

## Implemented so far

- Auth: register/login/me, JWT sessions, bcrypt password hashing, role-based middleware
- Database schema for all core modules (users, farm profiles, plots, crop cycles,
  listings, orders, field reports, report status history, notifications)
- Frontend routing, auth context, protected routes, login/register/dashboard shell

## Not yet implemented (stubbed with 501 responses)

Farms, plots, crop advisory, marketplace listings/orders, field reports, analytics,
and the AI assistant endpoints exist as routes in `server/src/routes/stubRoutes.js`
but return `501 Not Implemented` — build these out module by module next.
