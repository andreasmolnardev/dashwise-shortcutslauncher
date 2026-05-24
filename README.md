# ▣ Dashwise Launcher

> [!Warning]
> This is a vibe coded MVP. I plan to manually enhance it in the future. 

A lightweight macOS automation hub built with [Bun](https://bun.sh) — exposes macOS system actions over a local authenticated REST API via a flexible shortcut system.

## Features

- **Shortcut system** — Create and execute custom actions (media, brightness, apps, system) via unique IDs
- **Persistent storage** — Shortcuts are stored in a local SQLite database at `~/.dashwise/shortcuts.sqlite`
- **Media controls** — Play, pause, stop, next track, previous track (via AppleScript)
- **Display brightness** — Adjust levels via system key codes or `brightness` CLI
- **Do Not Disturb** — Toggle macOS focus mode
- **App launcher** — Launch any installed `.app` bundle by name or path
- **Local REST API** — High-performance Hono-based server on `localhost:47821`
- **Bearer token auth** — Token generated on first install, stored at `~/.dashwise/config.json`

## Requirements

- macOS 14+ or Windows 10+
- [Bun](https://bun.sh) installed
- (Optional) [`brightness`](https://github.com/nriley/brightness) for absolute brightness control (macOS): `brew install brightness`

## Configuration

You can provide the authentication token and port via environment variables:

```bash
DASHWISE_TOKEN="your-secure-token" DASHWISE_PORT=47821 bun start
```

If not provided, Dashwise will use the values from `~/.dashwise/config.json`.

## Getting Started

```bash
# Install dependencies (generates your bearer token on first run)
bun install

# Start the API server
bun start

# Development mode (auto-reload)
bun run dev
```

### First-time setup

On `bun install`, a script generates a unique bearer token and saves it to:

```
~/.dashwise/config.json
```

The token is printed to the terminal on creation.

## REST API

The app exposes a local HTTP API on port `47821`.

### Authentication

All `/api/*` endpoints require:

```
Authorization: Bearer <your-token>
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check (no auth required) |
| `GET` | `/openapi.json` | Full OpenAPI specification |
| `GET` | `/api/shortcuts` | List all available shortcuts and their IDs |
| `POST` | `/api/shortcuts/run?id=<id>` | Execute a shortcut by its unique ID |

### Examples

```bash
TOKEN="your-token-here"
BASE="http://localhost:47821"

# Get all shortcuts
curl $BASE/api/shortcuts \
  -H "Authorization: Bearer $TOKEN"

# Execute a shortcut (e.g., Play/Pause)
# Find the ID from the /api/shortcuts response
curl -X POST "$BASE/api/shortcuts/run?id=ID_HERE" \
  -H "Authorization: Bearer $TOKEN"
```

## Project Structure

```
dashwise-shortcuts/
├── src/
│   ├── bun/
│   │   ├── index.ts        # Entry point — starts the server
│   │   ├── actions.ts      # System action logic (AppleScript, CLI)
│   │   ├── server.ts       # Hono API server & SQLite integration
│   │   └── config.ts       # Token & port management
│   └── shared/
│       └── types.ts        # Shared type definitions
├── scripts/
│   └── generate-token.js   # postinstall — generates bearer token
├── openapi.json            # API documentation
├── package.json
└── tsconfig.json
```

## Notes on Permissions

Some actions require macOS permissions:

- **Media keys** — requires Accessibility access (`System Preferences > Privacy & Security > Accessibility`)
- **Do Not Disturb** — requires running `defaults write` commands (may need to kill NotificationCenter)
- **App launching** — works without extra permissions via `open`

On first use, macOS will prompt for the required permissions.
