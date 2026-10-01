# AI Meeting Notes

Turn raw meeting transcripts into structured, editable notes. Paste a transcript, the
backend sends it to an LLM through OpenRouter, and the result is rendered as a summary,
key decisions, action items, topics, and open questions. Notes are saved per user, can be
edited inline, regenerated, copied section by section, and exported to Markdown.

---

## Tech stack

### Server — `server/`

| Concern      | Choice                                                  |
| ------------ | ------------------------------------------------------- |
| Runtime      | Node.js 20+, CommonJS                                    |
| Framework    | Express 5                                                |
| Database     | MongoDB via Mongoose 9 (Atlas or local)                 |
| Auth         | `jsonwebtoken` (HS256) + `bcrypt` password hashes        |
| LLM          | OpenRouter Chat Completions API                          |
| Security     | `helmet`, `cors`, `express-rate-limit`                   |
| Config       | `dotenv`                                                 |
| Dev reload   | `nodemon`                                                |

### Client — `client/`

| Concern    | Choice                        |
| ---------- | ----------------------------- |
| Framework  | React 19                      |
| Build      | Vite 8                        |
| Routing    | React Router 7 (BrowserRouter)|
| Styling    | Tailwind CSS 3 + PostCSS      |
| Linting    | ESLint 9 flat config          |

---

## Project layout

```
ai-meeting-notes/
├── server/
│   ├── .env.example          # copy to .env
│   └── src/
│       ├── config/db.js      # Mongoose connection
│       ├── middleware/auth.js# JWT verification
│       ├── models/           # User, Meeting, Usage
│       ├── routes/           # auth.js, meetings.js
│       ├── services/         # llm.js, prompts.js, export.js
│       └── index.js          # Express app entry point
├── client/
│   ├── .env.example          # copy to .env
│   └── src/
│       ├── api/              # fetch wrappers
│       ├── components/       # NotesView, TranscriptInput
│       ├── context/          # AuthContext
│       ├── pages/            # Studio, History, Login
│       └── App.jsx           # Router, navbar, route guards
└── README.md
```

---

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- A MongoDB instance (local `mongod` or a free MongoDB Atlas cluster)
- An OpenRouter API key — <https://openrouter.ai/keys>

---

## Setup

### 1. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Configure the server

```bash
cd server
cp .env.example .env
```

Then edit `server/.env` and fill in the real values. At minimum you must set:

- `MONGODB_URI` — your MongoDB connection string
- `JWT_SECRET` — a long random string
- `OPENROUTER_API_KEY` — your OpenRouter key

Generate a strong `JWT_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Configure the client

```bash
cd client
cp .env.example .env
```

Set `VITE_API_URL` to the API base URL, including the `/api` prefix. The default
(`http://localhost:4000/api`) is correct for local development.

### 4. Run both apps

In two terminals:

```bash
cd server && npm run dev     # http://localhost:4000
cd client && npm run dev     # http://localhost:5173
```

Open <http://localhost:5173>, create an account, and generate your first set of notes.

### 5. Verify the server is healthy

```bash
curl http://localhost:4000/health
# {"status":"ok","uptime":12.34}
```

---

## Environment variables

### `server/.env`

| Variable                  | Required | Default                                     | Description                                              |
| ------------------------- | -------- | ------------------------------------------- | -------------------------------------------------------- |
| `PORT`                    | No       | `4000`                                      | Port the Express server binds to.                        |
| `NODE_ENV`                | No       | —                                           | Standard environment flag.                               |
| `CORS_ORIGIN`             | No       | _(empty — allow any origin)_                 | Comma-separated allowed front-end origins. Set this in production. |
| `APP_URL`                 | No       | `http://localhost`                          | Public URL of the app, sent as OpenRouter `HTTP-Referer`.|
| `APP_NAME`                | No       | `AI Meeting Notes`                          | Sent as the OpenRouter `X-Title` header.                 |
| `MONGODB_URI`             | **Yes**  | —                                           | MongoDB connection string.                               |
| `JWT_SECRET`              | **Yes**  | —                                           | Secret used to sign and verify JWTs.                     |
| `OPENROUTER_API_KEY`      | **Yes**  | —                                           | OpenRouter API key.                                      |
| `OPENROUTER_URL`          | No       | `https://openrouter.ai/api/v1/chat/completions` | OpenRouter endpoint — override for a proxy or self-host. |
| `CHAT_MODEL`              | No       | `openai/gpt-4o-mini`                        | OpenRouter model identifier.                             |
| `MAX_TRANSCRIPT_CHARS`    | No       | `40000`                                     | Rejects transcripts longer than this.                    |
| `DAILY_GENERATION_LIMIT`  | No       | `20`                                        | Per-user daily generation quota.                         |
| `GENERATE_RATE_LIMIT_MAX` | No       | `5`                                         | Per-IP generations allowed per 15 minutes.               |

### `client/.env`

| Variable        | Required | Default                 | Description                                            |
| --------------- | -------- | ----------------------- | ------------------------------------------------------ |
| `VITE_API_URL`  | No       | `http://localhost:4000/api` | API base URL, including the `/api` prefix.         |

> **Note on Vite environment variables:** only variables prefixed with `VITE_` are exposed
> to the client bundle. Never put a secret in a `VITE_`-prefixed variable — everything
> prefixed that way ships to the browser.

---

## API reference

All `/api/meetings` routes require an `Authorization: Bearer <token>` header.

### Auth

| Method | Route                | Body                  | Response                     |
| ------ | -------------------- | --------------------- | ---------------------------- |
| `POST` | `/api/auth/register` | `{ email, password }` | `201` `{ token, user }`     |
| `POST` | `/api/auth/login`    | `{ email, password }` | `200` `{ token, user }`     |

### Meetings

| Method   | Route                             | Body                    | Response                        |
| -------- | --------------------------------- | ----------------------- | ------------------------------- |
| `GET`    | `/api/meetings`                   | —                       | `200` array of meeting summaries |
| `POST`   | `/api/meetings/generate`          | `{ title?, sourceType?, sourceText }` | `201` meeting           |
| `GET`    | `/api/meetings/:id`               | —                       | `200` meeting                    |
| `GET`    | `/api/meetings/:id/export`        | —                       | `200` `text/markdown`            |
| `PATCH`  | `/api/meetings/:id`               | `{ notes }`             | `200` meeting                    |
| `POST`   | `/api/meetings/:id/regenerate`    | —                       | `200` meeting                    |
| `DELETE` | `/api/meetings/:id`               | —                       | `200` `{ message }`              |

Other routes:

- `GET /health` — liveness probe, no auth required.

### Notes schema

```jsonc
{
  "summary": "string",
  "keyDecisions": ["string"],
  "actionItems": [{ "task": "string", "assignee": "string", "dueDate": "string|null" }],
  "topics": [{ "topic": "string", "blurb": "string" }],
  "openQuestions": ["string"]
}
```

---

## Export

`GET /api/meetings/:id/export` returns the meeting's notes as a rendered Markdown
document (`text/markdown`). The conversion lives in
`server/src/services/export.js` and produces a title heading, an export date, then one
`##` section per notes field. Empty sections are omitted, and inline Markdown
characters in model output are escaped so a stray `#` or `*` cannot break the layout.

The Studio toolbar has an **Export as Markdown** button that downloads the result as
`<meeting-title>-notes.md` (falling back to `meeting-notes.md`). Every notes section
also has its own **Copy** button that writes just that section to the clipboard and
briefly confirms with "Copied!".

---

## Security notes

- **Secrets live only in `.env`.** No API key, JWT secret, or database credential is
  hardcoded in source. `.env` is git-ignored; `.env.example` holds placeholders only.
- **Passwords** are hashed with bcrypt (cost 10) and never returned by the API.
- **Login timing.** A failed login for an unknown email still performs a bcrypt compare
  against a dummy hash so response timing does not reveal whether an account exists.
- **Authorization.** Every meeting query is scoped by `req.user.id`. A request for
  another user's meeting returns `404`, not `403`, so IDs cannot be probed.
- **Rate limiting.** `POST /api/meetings/generate` is capped per IP at
  `GENERATE_RATE_LIMIT_MAX` requests per 15 minutes, on top of the per-user daily quota
  tracked in the `Usage` collection. Failed generations decrement the counter so they do
  not consume quota.
- **Transport hardening.** `helmet` sets security headers; set `CORS_ORIGIN` in
  production so only your front end can call the API.
- **Token storage.** The JWT is kept in `localStorage` by `AuthContext`. This is simple
  and fine for this project, but it is readable by any script on the page, so serve the
  app only over HTTPS.

---

## Deployment

### 1. Provision the database

Create a MongoDB Atlas cluster (or run MongoDB yourself) and add a database user. Copy
the connection string into `MONGODB_URI`. Atlas requires TLS; the provided connection
strings include `?ssl=true`.

### 2. Deploy the server

The server is a plain Node process. Build tooling is not required.

```bash
cd server
npm ci --omit=dev
NODE_ENV=production node src/index.js
```

Set every variable from the table above as real environment variables in your host
(Render, Railway, Fly.io, a VM, a container, etc.). At minimum: `MONGODB_URI`,
`JWT_SECRET`, `OPENROUTER_API_KEY`, `CORS_ORIGIN`, and `APP_URL`.

If you deploy behind a platform that supplies `PORT` automatically, do not hardcode it.

A minimal `Dockerfile` for the server:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
EXPOSE 4000
CMD ["node", "src/index.js"]
```

### 3. Build and deploy the client

```bash
cd client
npm ci
npm run build      # emits client/dist
```

Serve `client/dist` as static files. Because the app uses `BrowserRouter`, the host must
rewrite unknown paths to `index.html` so deep links such as `/meeting/<id>` load
correctly:

- **Netlify** — add `client/public/_redirects` containing `/* /index.html 200`
- **Vercel** — add a `vercel.json` rewrite to `/index.html`
- **Nginx** — `try_files $uri $uri/ /index.html;`

Point `VITE_API_URL` at the deployed API (for example `https://api.example.com/api`)
**before** running `npm run build`, since Vite inlines `VITE_` values at build time.

### 4. Post-deployment checklist

- [ ] `CORS_ORIGIN` is set to your front-end origin (not left empty).
- [ ] `APP_URL` reflects the public HTTPS URL.
- [ ] `JWT_SECRET` is unique to this deployment and was not copied from a machine.
- [ ] The app is served over HTTPS.
- [ ] `GET /health` responds from the deployed host.
- [ ] Registration, generation, and export all work from the deployed origin.

---

## Available scripts

### `server/`

| Script          | Description                              |
| --------------- | ---------------------------------------- |
| `npm run dev`   | Starts the server with nodemon reload.   |

### `client/`

| Script            | Description                        |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Starts the Vite dev server.        |
| `npm run build`   | Production build into `dist/`.     |
| `npm run preview` | Serves the production build locally.|
| `npm run lint`    | Runs ESLint.                       |

---

## Troubleshooting

| Symptom                                        | Cause and fix                                                                 |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `MONGODB_URI is not set`                       | `server/.env` is missing or not copied. Run `cp .env.example .env`.           |
| `Server selection timeout`                     | Atlas cannot reach your network, or the IP allowlist is off.                  |
| `OPENROUTER_API_KEY is not set`                | Add a real key to `server/.env`.                                              |
| `Note generation failed: ... 401`              | The OpenRouter key is invalid, expired, or out of credit.                      |
| `Note generation failed: ... 429`              | OpenRouter is rate limiting you; reduce traffic or wait.                       |
| `Too many generation requests`                 | You hit the per-IP cap. Wait 15 minutes or raise `GENERATE_RATE_LIMIT_MAX`.   |
| `Daily generation limit reached`               | Per-user quota exhausted; it resets at UTC midnight.                          |
| `Your session has expired`                     | The 7-day JWT expired. Log in again.                                           |
| `Meeting not found` for a meeting you own      | Invalid ObjectId, or the meeting belongs to another user.                      |
| Clipboard copy does nothing                    | The Clipboard API needs a secure context. Use `localhost` or HTTPS.           |
| Deep links 404 after deploy                    | Static host is not rewriting to `index.html`. See deployment notes.           |
| CORS error in the browser console              | Set `CORS_ORIGIN` to the exact front-end origin, then restart the server.      |

---

## License

ISC
