# AgriConnect

Smart Crop Advisory & Farm-to-Market Marketplace Platform.

Built for 24CIE554 — Full Stack Development.
Team: Aditya Mundra (1MS24CI009), Harsh Tiwari (1MS24CI052).

A platform where farmers get rule-based crop/irrigation advisory for their plots,
report field issues that get auto-classified by an LLM, sell produce directly to
buyers through a marketplace, track everything on an analytics dashboard, and ask
an AI assistant questions grounded in their own account data. Admins moderate
listings and field reports.

## Stack

- **Frontend:** React (Vite), React Router, Axios, Recharts
- **Backend:** Node.js + Express (ESM), REST API
- **Database:** PostgreSQL
- **Auth:** JWT + bcrypt
- **AI:** Claude API (field-report classification, grounded Q&A assistant) — both
  degrade to a deterministic fallback if no API key is configured
- **Weather:** OpenWeatherMap (optional — advisory falls back to season-only
  recommendations without it)

## Project structure

```
agriconnect/
├── client/   React app (Vite)
│   └── src/
│       ├── pages/        one file per route
│       ├── components/   Navbar, ProtectedRoute
│       ├── context/      AuthContext (JWT session)
│       ├── api/          one file per backend resource
│       └── charts/       shared chart color theme
├── server/   Express API
│   └── src/
│       ├── routes/       one file per resource, mounted in routes/index.js
│       ├── controllers/  request handling + validation
│       ├── models/       raw SQL (pg), one file per table/domain
│       ├── services/     aiService, weatherService, advisoryService
│       └── middleware/   JWT auth, error handling
│   └── db/
│       ├── schema.sql    full Postgres schema
│       └── migrate.js    applies schema.sql to DATABASE_URL
└── README.md
```

## Setup

### 1. Database

Create a PostgreSQL database — a free [Neon](https://neon.tech) project works well
and needs no local install — and note its connection string.

```bash
cd server
cp .env.example .env   # fill in DATABASE_URL and JWT_SECRET (see table below)
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

### Environment variables

| Variable | Where | Required? | Notes |
|---|---|---|---|
| `DATABASE_URL` | server | Yes | Postgres connection string |
| `JWT_SECRET` | server | Yes | Any long random string |
| `JWT_EXPIRES_IN` | server | No | Defaults to `7d` |
| `CLIENT_ORIGIN` | server | No | CORS origin, defaults to `http://localhost:5173` |
| `ANTHROPIC_API_KEY` | server | No | Without it: field reports use a keyword-based classifier instead of the LLM, and the AI assistant returns your raw data instead of a generated answer |
| `OPENWEATHER_API_KEY` | server | No | Without it: crop advisory gives season-only recommendations (no live weather) |
| `VITE_API_URL` | client | No | Defaults to `http://localhost:5000/api` |

## Demo walkthrough

A suggested path through every module for a live demo or viva:

1. **Register** two accounts at `/register` — one as **farmer**, one as **buyer**.
   (Self-registration is limited to farmer/buyer; see "Creating an admin" below.)
2. **As the farmer:** go to **My Farm**, create a farm profile (location, soil
   type, irrigation access), then add a plot.
3. Click **Get advisory** on the plot — shows a sowing window, irrigation
   schedule, and fertilizer advice based on the farm profile (+ live weather if
   `OPENWEATHER_API_KEY` is set).
4. Go to **Field Reports** and submit something like *"Irrigation pipe broken
   near plot 2, water is flooding the field"* — it's auto-tagged with a category,
   severity, and location.
5. Go to **Marketplace** and create a produce listing (crop, quantity, price).
6. **As the buyer:** go to **Marketplace**, browse/filter listings, and place an
   order.
7. **Back as the farmer:** see the order under **My Orders** in Marketplace and
   advance its status (confirmed → shipped → delivered).
8. **As either user:** open **Analytics** to see report and marketplace charts
   populate from the data just created.
9. Open **Assistant** and ask something like *"What issues have I reported?"* or
   *"How is my marketplace activity?"*
10. **Promote a user to admin** (see below), log in as them, and open **Admin**
    to moderate any listing regardless of owner; admins also see every field
    report (with status controls) on the **Field Reports** page.

### Creating an admin account

Admin accounts aren't self-service (so report/listing moderation can't be
bypassed by just signing up as one). Register a normal account, then promote it
directly in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

## API reference

All routes are under `/api` and (except register/login and browsing listings)
require `Authorization: Bearer <token>`.

| Resource | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Farms | `GET /farms/me`, `POST /farms`, `PUT /farms/:id` |
| Plots | `GET/POST /plots`, `GET/PUT/DELETE /plots/:id` |
| Advisory | `GET /advisory/:plotId` |
| Listings | `GET /listings` (public browse), `GET /listings/mine`, `GET /listings/admin`, `POST /listings`, `PUT /listings/:id` |
| Orders | `GET/POST /orders`, `PUT /orders/:id/status` |
| Field reports | `GET/POST /reports`, `GET /reports/:id`, `PUT /reports/:id/status` |
| Analytics | `GET /analytics/reports`, `GET /analytics/marketplace`, `GET /analytics/yield` (stub, see below) |
| Assistant | `POST /assistant/query` |

## Known limitations

- **Yield analytics** (`GET /analytics/yield`) is stubbed — `crop_cycles` has no
  harvested-quantity field, so there's no real data to chart yet.
- **Notifications**: the `notifications` table exists in the schema but nothing
  creates or displays notifications yet — a natural next module (e.g. notify a
  farmer when their listing gets an order, or when a report is resolved).
- **SMS/voice alerts**: mentioned as a stretch goal in the original spec, not
  implemented.
