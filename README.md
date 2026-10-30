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

