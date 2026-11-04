# TeamSpace — Full-Stack Team Collaboration Platform (Slack Clone)

**TeamSpace** is a complete, production-grade real-time team communication and collaboration platform inspired by Slack. Built with **Node.js/Express**, **MongoDB/Mongoose**, **Socket.IO**, and **React 19/Vite/Tailwind CSS**, TeamSpace provides persistent multi-tenant workspaces, public and private channels, direct and group messaging, threaded replies, emoji reactions, file sharing with access control, full-text search, and reliable real-time message recovery.

---

## 🚀 Key Highlights & Architecture

- **Real-Time Engine**: Built on Socket.IO with authenticated handshakes, ephemeral typing indicators, multi-tab presence tracking, room-isolated broadcasting, and **reconnection recovery** (`recover_missed_messages`).
- **Durable Persistence**: MongoDB database modeling with Mongoose schemas featuring compound indexes for high-throughput queries, soft deletes, and audit logs.
- **Deterministic Cursor Pagination**: Base64-encoded composite cursor (`createdAt_id`) pagination for seamless infinite scrolling without page drift or duplicate message glitches.
- **Idempotent Messaging**: Client-generated UUIDs guarantee zero duplicate message delivery during retries or network drops.
- **Multi-Tenant Access Control**: Role-based permissions (`owner`, `admin`, `member`, `guest`) across workspaces, private channels, and direct message participant boundaries.
- **Threaded Discussions**: Full thread support with unread replies count, parent message references, and dedicated thread sidebars.
- **File Sharing & Security**: Multi-format attachment uploads with disk storage and server-authorized streaming downloads.
- **Unread Tracking**: Cross-channel read state tracking with real-time multi-tab synchronization.
- **Interactive OpenAPI / Swagger Documentation**: Available at `/api/docs`.

---

## 🛠 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS, Zustand, TanStack Query, Lucide Icons, Date-fns, Socket.IO Client |
| **Backend** | Node.js, Express, Socket.IO, Mongoose / MongoDB, Multer, Zod, JWT (`HttpOnly` Cookies + Bearer) |
| **API Documentation** | Swagger UI (`swagger-ui-express`, `swagger-jsdoc`) |
| **Testing** | Vitest, Supertest, Testing Library |

---

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **MongoDB** running locally on default port `27017` (or remote MongoDB URI)

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
# Install root, server, and client dependencies
npm install
npm --prefix server install
npm --prefix client install
```

### 2. Environment Configuration
Environment files are pre-configured with default values for local development:
- **Server**: `server/.env`
  ```env
  PORT=5001
  NODE_ENV=development
  MONGODB_URI=mongodb://127.0.0.1:27017/teamspace
  JWT_SECRET=teamspace_production_super_secret_jwt_key_2026_xyz
  CLIENT_URL=http://localhost:5173
  UPLOAD_DIR=uploads
  MAX_FILE_SIZE_MB=25
  ```
- **Client**: `client/.env`
  ```env
  VITE_API_BASE_URL=http://localhost:5001/api/v1
  VITE_SOCKET_URL=http://localhost:5001
  ```

### 3. Seed Database with Demo Accounts
Populate demo workspaces, channels (`#general`, `#engineering`, `#random`, `#leadership`), threaded discussions, and reactions:
```bash
npm --prefix server run seed
```

#### Pre-seeded Demo Credentials
| Name | Email | Password | Role |
|---|---|---|---|
| **Alex Rivera** | `alex@teamspace.dev` | `password123` | Workspace Owner |
| **Sarah Chen** | `sarah@teamspace.dev` | `password123` | Workspace Admin |
| **Elena Rostova** | `elena@teamspace.dev` | `password123` | Member |

*(The web interface features 1-click quick login buttons for these accounts on the login screen).*

### 4. Run Development Servers
Start both backend API server and frontend client concurrently:
```bash
npm run dev
```
Or run each separately:
```bash
# Terminal 1: Backend API (port 5001)
npm --prefix server run dev

# Terminal 2: Frontend Client (port 5173)
npm --prefix client run dev
```

Visit the application at [http://localhost:5173](http://localhost:5173).
Interactive API documentation is live at [http://localhost:5001/api/docs](http://localhost:5001/api/docs).

---

## 🧪 Automated Testing

TeamSpace includes comprehensive test coverage spanning unit, integration, and full real-time socket collaboration journeys:

### Run Backend Tests (11 tests in 4 suites):
```bash
npm --prefix server test
```
- `tests/auth.test.js`: Registration, login, validation, session retrieval.
- `tests/workspace_and_channel.test.js`: Workspace creation, member invitations, channel creation and private channel security checks.
- `tests/messaging.test.js`: Message persistence, cursor pagination, thread replies, idempotency deduplication.
- `tests/e2e_journey.test.js`: Complete 15-step multi-user real-time collaboration journey (socket handshakes, typing, thread emits, reactions, offline recovery, search, downloads).

### Run Frontend Tests (3 tests):
```bash
npm --prefix client test
```
- `src/__tests__/composer.test.jsx`: Message input rendering, state updates, formatting actions, keyboard submissions.

### Build Production Bundle:
```bash
npm --prefix client run build
```

---

## 📁 Repository Structure

```
slack clone/
├── server/
│   ├── src/
│   │   ├── config/             # DB & Swagger OpenAPI config
│   │   ├── controllers/        # Express route handlers
│   │   ├── middleware/         # Auth, validation, upload, error handlers
│   │   ├── models/             # Mongoose schemas (User, Workspace, Channel, Message, etc.)
│   │   ├── routes/             # REST API router declarations
│   │   ├── seeds/              # Database seeder script
│   │   ├── services/           # Business logic (messages, unread, notifications)
│   │   ├── socket/             # Real-time Socket.IO engine & room management
│   │   ├── utils/              # Cursor encoding, token handling, HTML sanitizer
│   │   ├── app.js              # Express app setup
│   │   └── server.js           # Server entry point
│   ├── tests/                  # Integration and E2E test suites
│   ├── package.json
│   └── vitest.config.js
├── client/
│   ├── src/
│   │   ├── api/                # Axios instance & API service calls
│   │   ├── components/         # Modals, navigation, timeline, composer, threads
│   │   ├── context/            # SocketContext with reconnection recovery
│   │   ├── pages/              # AuthPage, WorkspacePage, InviteAcceptPage
│   │   ├── store/              # Zustand state stores (auth, channel, unread, ui)
│   │   ├── App.jsx             # Top-level routes & auth guard
│   │   └── main.jsx            # Entry point
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── package.json                # Root package for workspace orchestration
└── README.md
```

---

## 🛡️ License
MIT License. Built for high-performance team collaboration.
