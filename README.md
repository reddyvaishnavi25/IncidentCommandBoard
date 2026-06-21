# Crisis Twin

**A Real-Time Digital Twin for Multi-Agency Emergency Response**

Crisis Twin is an enterprise emergency operations center (EOC) platform that demonstrates why **Amazon Aurora DSQL** is essential for multi-agency incident response. When police, fire, EMS, dispatch, and emergency management update the same incident simultaneously, Aurora DSQL's strong consistency guarantees every agency sees the same operational truth.

Built for the **AWS + Vercel H0 Hackathon**.

---

## Core Demo Feature: Conflict-Free Resource Assignment

Two dispatchers assign **EMS-12** at the exact same time. Aurora DSQL executes a `SELECT FOR UPDATE` transaction — only one assignment commits. The other receives:

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

### 2. Configure Aurora DSQL

Copy `.env.example` to `.env` and set your Aurora DSQL connection string:

```bash
cp .env.example .env
```

```env
DATABASE_URL=postgresql://user:password@your-cluster.dsql.us-east-1.on.aws:5432/crisis_twin
SESSION_SECRET=your-random-secret-here
```

### 3. Push schema and seed data

```bash
npm run db:push
npm run db:seed
```

### 4. Run locally

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

Aurora DSQL tables with foreign keys, indexes, optimistic locking (`version` columns), and audit history:

- `users`, `agencies`, `incidents`, `incident_updates`
- `resources`, `resource_assignments`, `timeline_events`
- `conflict_logs`, `presence`, `simulations`, `audit_logs`
- `consistency_metrics`, `evacuation_zones`, `road_closures`

---

## Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables: `DATABASE_URL`, `SESSION_SECRET`
4. Deploy

Ensure your Aurora DSQL cluster allows connections from Vercel's IP ranges or use a public endpoint.

---

## License

MIT
