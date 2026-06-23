# Crisis Twin

**A Real-Time Digital Twin for Multi-Agency Emergency Response**

Crisis Twin is an enterprise emergency operations center (EOC) platform that demonstrates why **Amazon Aurora DSQL** is essential for multi-agency incident response. When police, fire, EMS, dispatch, and emergency management update the same incident simultaneously, Aurora DSQL's strong consistency guarantees every agency sees the same operational truth.

Built for the **AWS + Vercel H0 Hackathon**.

---

## Core Demo Feature: Conflict-Free Resource Assignment

Two dispatchers assign **EMS-12** at the exact same time. Aurora DSQL's optimistic concurrency control runs both transactions — only one commits. The other receives:

> **Resource already assigned.**

The Consistency Monitor updates in real time, showing conflicts prevented and rejected transactions.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 App Router, TypeScript, TailwindCSS, shadcn/ui, Framer Motion, Recharts, React Query |
| Backend | Aurora DSQL, Drizzle ORM, Server Actions, SSE |
| Deployment | Vercel |

---

## Quick Start

### 1. Clone and install

```bash
npm install
```

### 2. Create your `.env` file

Create a `.env` file in the project root with the following variables:

```env
# Aurora DSQL cluster endpoint (no https://, just the hostname)
DSQL_HOSTNAME=your-cluster-id.dsql.us-east-2.on.aws

# AWS region where your Aurora DSQL cluster lives
AWS_REGION=us-east-2

# AWS IAM credentials with AdsqlFullAccess policy
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# Session cookie secret — any long random string
SESSION_SECRET=some-long-random-string-change-this

# Generated automatically by db:token — do not set manually
DATABASE_URL=
```

> **Where to find your DSQL_HOSTNAME:** AWS Console → Aurora DSQL → your cluster → copy the endpoint. It looks like `abc123.dsql.us-east-2.on.aws`.

> **DATABASE_URL is auto-generated.** Aurora DSQL uses short-lived auth tokens (15 min expiry) as passwords. Run `npm run db:token` to generate a fresh `DATABASE_URL` and paste it into `.env`. The running app refreshes the token automatically — you only need to do this for `db:push` and `db:seed`.

### 3. Generate a database token

Aurora DSQL requires a signed auth token instead of a static password:

```bash
npm run db:token
```

Copy the printed `DATABASE_URL=...` line and paste it into your `.env` file.

### 4. Push schema and seed data

```bash
npm run db:push
npm run db:seed
```

If `db:push` fails with a table conflict from a previous run:

```bash
npm run db:reset   # drops all tables
npm run db:token   # get a fresh token, paste into .env
npm run db:push    # push clean schema
npm run db:seed    # seed demo data
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Demo Script

1. Open **five browser windows** (or incognito tabs)
2. Log in as each role (password: `demo123`):

   | Role | Email |
   |------|-------|
   | Police | `police@crisis-twin.demo` |
   | Fire | `fire@crisis-twin.demo` |
   | EMS | `ems@crisis-twin.demo` |
   | Dispatch | `dispatch@crisis-twin.demo` |
   | Emergency Manager | `em@crisis-twin.demo` |

3. As **Dispatch**, create **Chemical Plant Explosion** incident
4. All agencies post updates simultaneously on the incident workspace
5. Open two **Dispatch** windows (`dispatch@` and `dispatch2@`) — both click **Assign** on **EMS-01** at the same time
6. Watch one succeed, one show **Transaction Rejected** with Aurora DSQL message
7. Consistency Monitor increments **Conflicts Prevented**
8. As **Emergency Manager**, click **SIMULATE HURRICANE RESPONSE**
9. Watch 1000+ updates process with live metrics
10. Open **After Action Replay** — scrub the timeline
11. View **AI Incident Commander** recommendations

---

## Pages

- **Global Command Center** — Active incidents, agency status, map, timeline, consistency monitor
- **Incident Workspace** — Concurrent editing, resource assignment, live feed, AI recommendations
- **Resource Operations Center** — All units with availability states
- **County Operations Map** — Incidents, responders, evacuation zones, road closures
- **After Action Replay** — Timeline scrubber to reconstruct historical state

---

## Database Schema

Aurora DSQL tables with optimistic locking (`version` columns) and full audit history:

- `users`, `agencies`, `incidents`, `incident_updates`
- `resources`, `resource_assignments`, `timeline_events`
- `conflict_logs`, `presence`, `simulations`, `audit_logs`
- `consistency_metrics`, `evacuation_zones`, `road_closures`

> Note: Aurora DSQL does not support foreign key constraints or secondary indexes. Referential integrity is enforced at the application layer. Optimistic locking via `version` columns replaces `SELECT FOR UPDATE`.

---

## Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add all environment variables in Vercel project settings:

| Variable | Value |
|---|---|
| `DSQL_HOSTNAME` | Your Aurora DSQL cluster endpoint |
| `AWS_REGION` | e.g. `us-east-2` |
| `AWS_ACCESS_KEY_ID` | Your IAM access key |
| `AWS_SECRET_ACCESS_KEY` | Your IAM secret key |
| `SESSION_SECRET` | Any long random string |
| `DATABASE_URL` | Leave blank — auto-generated at runtime |

4. Deploy

The app generates Aurora DSQL auth tokens automatically at runtime using `DSQL_HOSTNAME` + IAM credentials, so `DATABASE_URL` does not need to be set in Vercel.

---

## Available Scripts

```bash
npm run dev          # start local dev server
npm run build        # production build
npm run db:push      # push schema to Aurora DSQL
npm run db:seed      # seed demo users, agencies, resources
npm run db:token     # generate a fresh DATABASE_URL (paste into .env)
npm run db:reset     # drop all tables (use before a clean db:push)
npm run db:studio    # open Drizzle Studio to browse the database
```

---

## License

MIT

