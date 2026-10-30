<div align="center">
  <img width="1200" height="475" alt="AuditPulse Banner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />

  <h1>AuditPulse — SEO Intelligence Suite</h1>
  <p>Full-stack SEO audit tool powered by DataForSEO Live Organic Traffic APIs and Google Gemini AI</p>

  ![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5%2B-blue)
  ![React](https://img.shields.io/badge/React-19-61DAFB)
  ![Vite](https://img.shields.io/badge/Vite-8-purple)
  ![License](https://img.shields.io/badge/License-MIT-yellow)
</div>

---

## What is AuditPulse?

AuditPulse is a modern, full-stack SEO audit platform that crawls any public website and delivers a comprehensive health report — including on-page diagnostics, live organic traffic data from DataForSEO, and an exportable executive report. It runs as a single Express + Vite server with a React frontend.

---

## Features

### SEO Crawler & Diagnostics
- Crawls any public URL and performs deep on-page SEO analysis
- Detects missing or short/long `<title>` tags
- Checks for missing or thin meta descriptions
- Validates `<h1>` heading presence and uniqueness
- Identifies missing canonical tags
- Counts images missing `alt` attributes
- Measures server response time and flags slow TTFB (>1500ms)
- Calculates an overall SEO health score (0–100)

### Live Organic Traffic Dashboard
- Integrates with DataForSEO Live Organic Search API
- Displays real-time keyword rankings and organic traffic estimates
- Supports location and language filtering (default: US English)
- Per-user daily call limits and budget guards to control API costs
- Built-in response caching to minimize redundant API calls

### Page Hierarchy & Tag Inspector
- Displays full structural breakdown of each audited page
- Shows H1/H2 headings, meta description, canonical URL
- Reports word count, internal links, external links, and missing alt images
- Page load time and HTTP status per URL

### Executive Report Export
- Generates a printable/exportable audit report
- Summarizes critical issues, warnings, and notices
- Designed for sharing with clients or stakeholders

### Authentication & Security
- Demo session token auto-generated on first load
- JWT-based session authentication for API endpoints
- SSRF protection — blocks crawling of private/internal IPs and localhost
- Per-user API usage tracking and rate limiting

### AI Integration
- Powered by Google Gemini AI (`@google/genai`) for intelligent insights

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS v4, Recharts, Framer Motion |
| Backend | Node.js, Express, TypeScript, tsx |
| Build Tool | Vite 8 |
| Database | PostgreSQL (optional) or local JSON fallback |
| SEO Data | DataForSEO API |
| AI | Google Gemini API |
| Testing | Vitest |

---

## Project Structure

```
SEO Project/
├── src/                        # React frontend
│   ├── components/
│   │   ├── TrafficDashboard.tsx  # Live organic traffic UI
│   │   ├── Visualizer.tsx        # Audit overview & score visualizer
│   │   └── ReportExport.tsx      # Executive report export
│   ├── types/seo.ts              # Shared TypeScript types
│   └── App.tsx                   # Main app entry
├── server/
│   └── src/
│       ├── integrations/
│       │   └── dataforseo.ts     # DataForSEO API client
│       ├── services/
│       │   ├── traffic.ts        # Traffic fetch + caching logic
│       │   └── cache.ts          # In-memory cache layer
│       ├── app.ts                # Express routes
│       ├── auth.ts               # JWT session auth
│       ├── crawler.ts            # SEO crawler & HTML parser
│       └── db.ts                 # Database (PostgreSQL / JSON)
├── server.ts                     # Server entry point (Express + Vite)
├── vite.config.ts
├── package.json
└── .env.example
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your keys:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `DATAFORSEO_LOGIN` | ✅ | DataForSEO account login |
| `DATAFORSEO_PASSWORD` | ✅ | DataForSEO account password |
| `DATAFORSEO_SANDBOX` | Optional | Set `true` to use sandbox mode (no real API cost) |
| `DFS_DAILY_CALLS_PER_USER` | Optional | Max daily API calls per user (default: 30) |
| `DFS_DAILY_BUDGET_USD` | Optional | Max daily spend in USD (default: $5) |
| `DATABASE_URL` | Optional | PostgreSQL connection string (uses JSON file if not set) |
| `PORT` | Optional | Server port (default: 3000) |

### 3. Run Locally

```bash
npm run dev
```

App runs at: `http://localhost:3000`

---

## How to Use

1. Open the app in your browser
2. Enter any public website URL in the search bar (e.g. `https://stripe.com`)
3. Click **Audit Website** — the crawler will analyze the page
4. Switch between tabs:
   - **Audit Overview** — SEO health score and issue breakdown
   - **Live Organic Traffic** — real-time keyword and traffic data from DataForSEO
   - **Page Hierarchy & Tags** — detailed structural inspection
   - **Executive Report** — printable summary for clients

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server (Express + Vite HMR) |
| `npm run build` | Build frontend for production |
| `npm start` | Start production server |
| `npm test` | Run tests with Vitest |
| `npm run lint` | TypeScript type check |

---

## Deployment

### Build for Production

```bash
npm run build
NODE_ENV=production npm start
```

### Deploy to Railway

1. Push to GitHub
2. Connect repo on [railway.app](https://railway.app)
3. Set environment variables in Railway dashboard
4. Railway auto-deploys on every push

### Deploy to AWS EC2

```bash
# On your server
npm install
npm run build
NODE_ENV=production PORT=3000 npm start
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/auth/demo` | Generate demo session token |
| `GET` | `/api/auth/me` | Get current authenticated user |
| `POST` | `/api/seo/crawl` | Run SEO audit on a URL |
| `GET` | `/api/seo/traffic?url=` | Fetch live organic traffic data |

---

## License

MIT
