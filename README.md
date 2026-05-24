# ▣ Macropad

A desktop automation hub built with [Electrobun](https://electrobun.dev) — exposes macOS system actions over a local authenticated REST API.

## Features

- **Media controls** — play, pause, stop, next track, previous track
- **Display brightness** — increase/decrease via system key codes or `brightness` CLI
- **Do Not Disturb** — enable/disable focus mode
- **App launcher** — list all installed `.app` bundles and launch any by name or path
- **App search** — fuzzy-search installed applications
- **Raycast integration** — detect if Raycast is installed and launch it (with optional search query)
- **System tray** — always accessible from the menu bar
- **Local REST API** — every action available over HTTP on `localhost:47821`
- **Bearer token auth** — token generated on first install, stored at `~/.macropad/config.json`

## Requirements

- macOS 14+
- [Bun](https://bun.sh) installed
- (Optional) [`brightness`](https://github.com/nriley/brightness) for absolute brightness control: `brew install brightness`
- (Optional) [Raycast](https://raycast.com) installed in `/Applications`

## Getting Started

```bash
# Install dependencies (generates your bearer token on first run)
bun install

# Start in development mode
bun start

# Build for distribution
bun run build
```

### First-time setup

On `bun install`, a script generates a unique bearer token and saves it to:

```
~/.macropad/config.json
```

The token is printed to the terminal. You can also view it in the **API** tab of the app UI.

## REST API

The app exposes a local HTTP API on port `47821`.

### Authentication

All endpoints (except `GET /health`) require:

```
Authorization: Bearer <your-token>
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check (no auth required) |
| `GET` | `/api/info` | API info |
| `GET` | `/api/apps` | List all installed apps |
| `GET` | `/api/apps/search?q=<query>` | Search apps by name |
| `POST` | `/api/apps/launch` | Launch an app by `path` or `name` |
| `POST` | `/api/media` | Media control — `{action: "play"\|"pause"\|"stop"\|"next"\|"previous"}` |
| `GET` | `/api/brightness` | Get current brightness level |
| `POST` | `/api/brightness` | Set brightness — `{delta: ±1}` or `{delta: 0.0-1.0}` absolute |
| `POST` | `/api/dnd` | Toggle Do Not Disturb — `{enabled: boolean}` |
| `GET` | `/api/raycast` | Check if Raycast is installed |
| `POST` | `/api/raycast` | Launch Raycast — `{query?: string}` |

### Examples

```bash
TOKEN="your-token-here"
BASE="http://localhost:47821"

# Play/pause
curl -X POST $BASE/api/media \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"play"}'

# List all apps
curl $BASE/api/apps \
  -H "Authorization: Bearer $TOKEN"

# Launch Safari
curl -X POST $BASE/api/apps/launch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Safari"}'

# Increase brightness (one step)
curl -X POST $BASE/api/brightness \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"delta":1}'

# Set brightness to 75%
curl -X POST $BASE/api/brightness \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"delta":0.75}'

# Enable Do Not Disturb
curl -X POST $BASE/api/dnd \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled":true}'

# Open Raycast with a query
curl -X POST $BASE/api/raycast \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"clipboard history"}'
```

## Project Structure

```
macropad/
├── src/
│   ├── bun/
│   │   ├── index.ts        # Main process — tray, window, RPC
│   │   ├── actions.ts      # All system actions (media, brightness, DND, apps, Raycast)
│   │   ├── server.ts       # Bun HTTP server — REST API
│   │   └── config.ts       # Token generation & config management
│   ├── mainview/
│   │   ├── index.html      # UI shell
│   │   ├── index.css       # Styles
│   │   └── index.ts        # Frontend logic & RPC calls
│   └── shared/
│       └── types.ts        # Shared RPC type definitions
├── scripts/
│   └── generate-token.js   # postinstall — generates bearer token
├── electrobun.config.ts    # Electrobun build config
├── package.json
└── tsconfig.json
```

## Notes on Permissions

Some actions require macOS permissions:

- **Media keys** — requires Accessibility access (`System Preferences > Privacy & Security > Accessibility`)
- **Do Not Disturb** — requires running `defaults write` commands (may need to kill NotificationCenter)
- **App launching** — works without extra permissions via `open`

On first use, macOS will prompt for the required permissions.
