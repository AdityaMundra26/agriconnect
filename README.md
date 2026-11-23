# AgriConnect

Smart Crop Advisory & Farm-to-Market Marketplace Platform.

Built for 24CIE554 — Full Stack Development.
Team: Aditya Mundra (1MS24CI009), Harsh Tiwari (1MS24CI052).

Farmers get rule-based crop, irrigation and fertilizer advisory for each plot,
track crop cycles from sowing to harvest, report field issues that are
auto-classified, and sell produce directly to buyers. Buyers browse and order
produce and track deliveries. Admins moderate listings and field reports. Everyone
gets role-specific dashboards, analytics, in-app notifications and an AI assistant
grounded in their own data.

## Features

| Module | What it does |
|---|---|
| **Auth & roles** | JWT + bcrypt, farmer / buyer / admin roles, protected routes, auto-logout on expired sessions, profile editing |
| **Dashboard** | Role-specific KPIs, recent orders, crop calendar, reports needing attention, quick actions |
| **My Farm** | Farm profile, plots (CRUD), crop cycles (planned → sown → growing → harvested) with progress bars and harvest quantities |
| **Crop advisory** | Season detection (kharif / rabi / zaid), crop suggestions ranked by soil + preferences, irrigation schedule, soil-specific fertilizer advice, crop-specific tips, weather alerts (heat, frost, humidity, rain, wind) |
| **Marketplace** | Product cards with search, price filter and sorting; order modal with live total; farmers create, edit, close and re-activate listings |
| **Orders** | Status tracker (pending → confirmed → shipped → delivered); only valid forward transitions are allowed; cancelling restores stock in the same DB transaction; row locking prevents overselling |
| **Field reports** | Free-text reports auto-classified by category, severity and location (Claude, or a keyword classifier offline); admin moderation with notes; full status timeline |
| **Live notifications** | Pushed instantly over Server-Sent Events, no refresh needed: bell badge + toast for new orders, order status changes, sold-out listings, report updates, admin moderation. Falls back to polling if the stream drops |
| **SMS & voice alerts** | Opt-in per user from Profile, with a "Send test" button. SMS for new orders, order updates and report updates; a **voice call** to admins when a critical field report is filed. Delivered via Twilio, or simulated and logged when no gateway is configured. Admins see every attempt in an SMS & voice log |
| **Analytics** | Revenue/orders over time, top crops, order status, yield by crop and per acre, harvest over time, report breakdowns; scoped per role |
| **AI assistant** | Chat with conversation history, grounded only in the user's own data; works offline with rule-based answers if no API key is set |
| **Admin console** | Listing moderation (with confirmation + farmer notification), user directory with activity counts, SMS & voice alert log |
| **UI** | Responsive sidebar layout, mobile menu, dark mode, toasts, modals, drawers, skeleton loaders, empty states, confirm dialogs |

## Stack

- **Frontend:** React 19 (Vite), React Router, Axios, Recharts, lucide-react icons, hand-written CSS design system (light + dark)
- **Backend:** Node.js + Express 5 (ESM), REST API
- **Database:** PostgreSQL (raw SQL via `pg`, transactions + row locks for orders)
- **Auth:** JWT + bcrypt
- **AI:** Claude API (`claude-opus-5-5`): structured-output report classification and the grounded assistant. Both fall back to deterministic logic when `ANTHROPIC_API_KEY` isn't set
- **Weather:** OpenWeatherMap (optional, cached 10 min)

## Project structure

```
agriconnect/
├── client/                React app (Vite)
│   └── src/
│       ├── pages/         one file per route
│       ├── components/    AppLayout (sidebar/topbar), NotificationBell, ProtectedRoute, ui.jsx (Modal, Drawer, StatCard, …)
│       ├── context/       AuthContext, ToastContext, ThemeContext
│       ├── hooks/         useLoader (async data loading)
│       ├── utils/         formatting helpers, constants, status colors
│       ├── api/           one file per backend resource
│       └── charts/        chart color theme (light + dark)
├── server/                Express API
│   ├── src/
│   │   ├── routes/        one file per resource, mounted in routes/index.js
│   │   ├── controllers/   request handling + validation
│   │   ├── models/        raw SQL, one file per table/domain
│   │   ├── services/      ai, advisory, weather, notifications, assistant context
│   │   └── middleware/    JWT auth, error handling
│   └── db/
│       ├── schema.sql     full Postgres schema (idempotent, safe to re-run)
│       ├── migrate.js     applies schema.sql
│       └── seed.js        demo accounts + realistic sample data
└── README.md
```

## Setup

### 1. Backend + database

Create a PostgreSQL database (a free [Neon](https://neon.tech) project works and
needs no local install) and note its connection string.

```bash
cd server
npm install
cp .env.example .env    # fill in DATABASE_URL and JWT_SECRET
npm run setup           # applies the schema, then seeds demo data
npm run dev             # http://localhost:5000
```

`npm run migrate` and `npm run seed` can also be run separately. The schema is
idempotent, so re-running it upgrades an existing database without losing data.
The seed only touches the `@demo.com` accounts.

### 2. Frontend

```bash
cd client
npm install
cp .env.example .env    # defaults to http://localhost:5000/api
npm run dev             # http://localhost:5173
```

### Sample demo data

A full set of realistic sample data can be switched on and off:

- **From the UI**: the **Load sample data / Remove sample data** button on the login page, or the **Sample demo data** card at the top of the Admin Console. Loading takes about 4 seconds.
- **From the terminal**: `npm run seed` (load or refresh) and `node db/seed.js --remove`.

It contains 6 farmers across India (Karnataka, Maharashtra, Punjab, Gujarat, Andhra Pradesh, Bihar), 4 buyers and an admin. Together they have 26 listings at realistic prices, about 100 orders over the last 3 months, a year of crop cycles and harvests, 22 field reports with moderation history, notifications, and an SMS/voice alert log. Loading always produces the same data, with dates relative to today. It only ever creates or deletes `@demo.com` accounts, so real accounts are never touched. The one-click demo logins on the login page appear only while the sample data is loaded.

Who can use the toggle is set by `DEMO_TOGGLE`:
- `public`: anyone, from the login page. This is the default in development.
- `admin`: admins only, from the Admin Console. This is the default when `NODE_ENV=production`.
- `off`: terminal only.

All demo accounts use the password **`demo1234`**:

| Role | Email | Has |
|---|---|---|
| Farmer | `farmer@demo.com` | **Main demo account.** Ravi Kumar, Mandya: 3 plots, crop calendar, ~50 orders, reports in every status |
| Farmer | `farmer2@demo.com` … `farmer6@demo.com` | Nashik (onion, grapes), Ludhiana (basmati, wheat, potato), Anand (banana), Guntur (chilli, cotton, turmeric), Nalanda (makhana, litchi) |
| Buyer | `buyer@demo.com` | FreshMart, Bengaluru: orders in every status |
| Buyer | `buyer2@demo.com` … `buyer4@demo.com` | GreenBasket (Kochi), Verma Traders (Delhi), Hotel Annapurna (Pune) |
| Admin | `admin@demo.com` | Moderation access to everything, SMS + voice alerts on |

### Environment variables

| Variable | Where | Required? | Notes |
|---|---|---|---|
| `DATABASE_URL` | server | Yes | Postgres connection string |
| `JWT_SECRET` | server | Yes | Any long random string |
| `JWT_EXPIRES_IN` | server | No | Defaults to `7d` |
| `CLIENT_ORIGIN` | server | No | CORS origin, defaults to `http://localhost:5173` |
| `ANTHROPIC_API_KEY` | server | No | Without it, reports use the keyword classifier and the assistant answers with rule-based summaries of your data |
| `OPENWEATHER_API_KEY` | server | No | Without it, advisory is season/soil-based with no weather alerts |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | server | No | Real SMS and voice calls. Without them, alerts are simulated: logged to the console and the admin alert log, not sent |
| `SMS_DEFAULT_COUNTRY_CODE` | server | No | Added to 10-digit numbers, defaults to `91` |
| `DEMO_TOGGLE` | server | No | `public` / `admin` / `off`: who can load and remove sample data from the UI (see above) |
| `VITE_API_URL` | client | No | Defaults to `http://localhost:5000/api` |

## Demo walkthrough

1. **Log in as the farmer** (one click on the login page). The dashboard shows sales, pending orders, the crop calendar and recent reports.
2. **My Farm**: open **Advisory** on a plot to see season, crop suggestions, irrigation, fertilizer and crop tips. Add a crop cycle, then edit it to *harvested* with a quantity.
3. **Field Reports**: submit *"Aphids spreading fast on the mustard near the east boundary"*. It's tagged *pest / high / the east boundary*. Click it to see the timeline.
4. **Marketplace → New listing**: publish produce.
5. **Log in as the buyer**, browse and filter the marketplace, and **Order now**. The farmer gets a notification.
6. **Back as the farmer → Orders**: confirm, ship and deliver the order. The buyer is notified at each step. Try cancelling another order and watch the stock return to the listing.
7. **Analytics**: revenue, orders, yield and report charts (toggle dark mode in the top bar).
8. **Live updates**: keep the farmer logged in in one window and place an order as the buyer in a private window. The farmer's bell and a toast update instantly. On **Profile**, click **Send test** under SMS alerts, then check **Admin Console → SMS & voice log**.
9. **Assistant**: ask *"How are my sales doing?"* or *"What crops should I sow?"*
10. **Log in as admin**: the dashboard shows urgent reports; **Field Reports** lets you filter and resolve with a note; **Admin Console** moderates listings and lists users.

### Creating your own admin

Self-registration is limited to farmer/buyer so moderation can't be bypassed.
Promote an account in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

## API reference

All routes are under `/api` and (except register/login, listing browse and health)
require `Authorization: Bearer <token>`.

| Resource | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PUT /auth/me` (incl. `smsAlerts`, `voiceAlerts`), `POST /auth/me/test-alert` (`channel`: sms/voice) |
| Dashboard | `GET /dashboard/summary` (role-specific) |
| Farms | `GET /farms/me`, `POST /farms`, `PUT /farms/:id` |
| Plots | `GET/POST /plots`, `GET/PUT/DELETE /plots/:id` |
| Crop cycles | `GET /crop-cycles?plotId=`, `POST /crop-cycles`, `PUT/DELETE /crop-cycles/:id` |
| Advisory | `GET /advisory/:plotId` |
| Listings | `GET /listings?cropName=&minPrice=&maxPrice=&sort=` (public), `GET /listings/mine`, `GET /listings/admin`, `POST /listings`, `PUT /listings/:id` |
| Orders | `GET/POST /orders`, `PUT /orders/:id/status` |
| Field reports | `GET/POST /reports`, `GET /reports/:id` (with history), `PUT /reports/:id/status` (admin, optional `note`) |
| Notifications | `GET /notifications`, `GET /notifications/stream?token=` (Server-Sent Events), `PUT /notifications/:id/read`, `PUT /notifications/read-all` |
| Analytics | `GET /analytics/reports`, `GET /analytics/marketplace`, `GET /analytics/yield` |
| Assistant | `POST /assistant/query` (`question`, optional `history`) |
| Admin | `GET /admin/users`, `GET /admin/alerts` |
| Demo data | `GET /demo` (status, public), `POST /demo/enable`, `POST /demo/disable` (permission per `DEMO_TOGGLE`) |
| Health | `GET /health` (reports whether AI/weather are configured) |

## Testing

```bash
cd server && npm test     # 31 unit + 23 API integration tests (API tests need DATABASE_URL)
cd client && npm test     # 30 component and utility tests (Vitest + Testing Library)
```

- **Server unit tests** (`server/test/unit`): advisory rules, the offline report classifier, phone-number normalization, the live-notification hub, the offline assistant, order transition rules.
- **API integration tests** (`server/test/api.test.js`): start the real Express app against Postgres and cover auth, farms, crop cycles, advisory, listings, the full order lifecycle (including stock restore on cancel and a **concurrency test proving orders can't oversell**), field reports, live notifications over SSE, SMS alert logging and admin permissions. They create their own throwaway accounts and delete them afterwards, so real and demo data are never touched.
- **Client tests** (`client/src/**/*.test.*`): formatting helpers, UI components, the login flow, and the notification bell's live updates.
- **CI**: `.github/workflows/ci.yml` runs everything on every push against a fresh Postgres 16, and checks the schema can be applied twice.

## Notes

- Live notifications use an in-process event hub, which suits a single server. Running several API instances would need a shared pub/sub (e.g. Redis) behind the same interface in `server/src/services/realtime.js`.
- Real SMS and voice delivery needs a Twilio account (trial accounts can only message verified numbers). Without one, alerts are simulated and logged so the whole flow can still be demonstrated.
