# AuditPulse — SEO Intelligence Suite

A full-stack SEO audit platform that crawls any public website and delivers a complete health report with live organic traffic data, page diagnostics, and an exportable executive report.

---

## Features

- **SEO Health Score** — calculates a 0–100 score based on on-page issues found during crawl
- **On-Page Diagnostics** — detects missing/short/long title tags, missing meta descriptions, missing or duplicate H1 tags, missing canonical tags, images without alt text, and slow server response time
- **Live Organic Traffic Dashboard** — pulls real-time keyword rankings and traffic estimates via DataForSEO API with location and language filtering
- **Page Hierarchy Inspector** — shows H1/H2 headings, meta description, canonical URL, word count, internal/external link counts, and missing alt image count per page
- **Executive Report Export** — generates a printable audit summary for clients or stakeholders
- **SSRF Protection** — blocks crawling of private IPs, localhost, and internal hostnames
- **API Cost Controls** — per-user daily call limits and budget caps to prevent runaway DataForSEO spend
- **Response Caching** — in-memory cache layer to avoid duplicate API calls
- **JWT Session Auth** — demo token auto-generated on first load, used to authenticate traffic API requests
- **AI Integration** — Google Gemini AI via `@google/genai`
- **PostgreSQL or JSON DB** — uses PostgreSQL if `DATABASE_URL` is set, falls back to a local JSON file

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS v4, Recharts, Framer Motion |
| Backend | Node.js, Express, TypeScript, tsx |
| Build | Vite 8, esbuild |
| Database | PostgreSQL (optional) / JSON file fallback |
| SEO Data | DataForSEO Live Organic API |
| AI | Google Gemini API |
| Testing | Vitest |

---

## Project Structure

```
SEO Project/
├── src/                          # React frontend
│   ├── components/
│   │   ├── TrafficDashboard.tsx  # Live organic traffic UI
│   │   ├── Visualizer.tsx        # Audit overview & score chart
│   │   └── ReportExport.tsx      # Executive report export
│   ├── types/seo.ts              # Shared TypeScript types
│   └── App.tsx                   # Main app component
├── server/
│   └── src/
│       ├── integrations/
│       │   └── dataforseo.ts     # DataForSEO API client
│       ├── services/
│       │   ├── traffic.ts        # Traffic fetch + caching
│       │   └── cache.ts          # In-memory cache
│       ├── app.ts                # Express API routes
│       ├── auth.ts               # JWT session auth
│       ├── crawler.ts            # SEO crawler & HTML parser
│       └── db.ts                 # Database layer
├── test/
│   └── traffic.test.ts
├── server.ts                     # Entry point (Express + Vite)
├── vite.config.ts
├── package.json
└── .env.example
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
copy .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `DATAFORSEO_LOGIN` | ✅ | DataForSEO account login |
| `DATAFORSEO_PASSWORD` | ✅ | DataForSEO account password |
| `DATAFORSEO_SANDBOX` | Optional | `true` to use sandbox (no real cost) |
| `DFS_DAILY_CALLS_PER_USER` | Optional | Max API calls per user per day (default: 30) |
| `DFS_DAILY_BUDGET_USD` | Optional | Max daily spend in USD (default: $5) |
| `DATABASE_URL` | Optional | PostgreSQL connection string |
| `PORT` | Optional | Server port (default: 3000) |

### 3. Run locally

```bash
npm run dev
```

Open `http://localhost:3000`

---

## Usage

1. Enter any public website URL in the search bar (e.g. `https://stripe.com`)
2. Click **Audit Website**
3. Navigate between tabs:
   - **Audit Overview** — SEO score and full issue breakdown
   - **Live Organic Traffic** — real-time keyword and traffic data
   - **Page Hierarchy & Tags** — structural page inspection
   - **Executive Report** — printable client-ready summary

Quick sample domains are available on the homepage for instant demo audits.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with Vite HMR |
| `npm run build` | Build frontend for production |
| `npm start` | Start production server |
| `npm test` | Run tests with Vitest |
| `npm run lint` | TypeScript type check |

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | Health check |
| `POST` | `/api/auth/demo` | No | Generate demo session token |
| `GET` | `/api/auth/me` | Yes | Get current user |
| `POST` | `/api/seo/crawl` | No | Run SEO audit on a URL |
| `GET` | `/api/seo/traffic?url=` | Yes | Fetch live organic traffic data |

---

## Deployment

### Production build

```bash
npm run build
set NODE_ENV=production && npm start
```

### Railway (recommended)

1. Push to GitHub
2. Connect repo on [railway.app](https://railway.app)
3. Add environment variables in the Railway dashboard
4. Railway auto-deploys on every push — no config needed

### AWS EC2

```bash
# On your EC2 instance
npm install
npm run build
NODE_ENV=production npm start
```

To SSH into EC2 from Windows PowerShell:

```powershell
# Set correct permissions on your .pem key
icacls "Pruthvi.pem" /inheritance:r /grant:r "$($env:USERNAME):(R)"

# Connect
ssh -i "Pruthvi.pem" ec2-user@<your-ec2-public-ip>
```

---

## License

MIT
