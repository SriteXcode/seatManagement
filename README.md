# Exam Seating Allotment & Seating Layout Manager

An agentic, high-performance, and feature-rich Seating Arrangement Coordinator. The platform automates student seat allotment based on custom distancing guidelines, manages invigilator rosters, creates duty charts, generates templates, and produces print-ready PDF reports.

Built with high-fidelity aesthetics, PWA capabilities, and advanced code-splitting optimization.

---

## 🚀 Key Features

* **Flexible Seating Planner**: Create custom exam hall grids, specify dimensions (rows/columns), and manage capacities.
* **Algorithmic Seating Generator**:
  * Auto-allot student rosters to examination halls.
  * Distance spacing configurations (configurable blank gaps, row grouping, column grouping).
  * Safe student distribution patterns (anti-collision rules for class or department branches).
* ** Roster Importers & Exporters**:
  * Excel/CSV templated bulk imports.
  * Pasted raw CSV input parser.
  * Conflict resolution flow: Choose between **Overwrite & Merge** or **Clear & Re-import** when duplicate students are uploaded.
* **Duty Chart & Invigilation**:
  * Manage invigilator rosters.
  * Assign role-based duty charts (distributors vs. room supervisors).
  * Print-ready PDF invigilation layouts.
* **Progressive Web App (PWA)**:
  * Full offline caching of structural assets via a service worker (`sw.js`).
  * Installable dialog prompts and headers for desktop/mobile browsers.
* **High-Fidelity Aesthetics**: Sleek modern layout styling with glassmorphism overlays, custom cursor tracking, and skeleton loaders.

---

## 🛠️ Technology Stack

* **Frontend**: React (ES Modules), Tailwind CSS, Vite (Build Tool), line-awesome (Icons)
* **Libraries**: `xlsx` (dynamic spreadsheet parsers), `html2pdf.js` (client-side PDF reports)
* **Backend**: Node.js, Express, Mongoose (MongoDB ODM), `express-rate-limit` (brute protection), `cookie-parser`
* **Storage**: MongoDB

---

## 📦 Directory Structure

```
├── backend/                  # RESTful API Server (Node & Express)
│   ├── config/               # DB and environment setup
│   ├── controllers/          # Business logic handlers
│   ├── models/               # MongoDB Mongoose Schemas (User, Student, Room, Allotment)
│   ├── routes/               # Express API endpoints
│   ├── services/             # Seating generator algorithm engines
│   ├── server.js             # Express application initialization entry point
│   └── package.json
│
├── client/                   # Vite React PWA App
│   ├── public/               # Static assets, PWA manifest, and sw.js Service Worker
│   ├── src/
│   │   ├── components/       # UI Components (Landing Page, Layout, Tab Views, Modals)
│   │   ├── context/          # React Auth Context API
│   │   ├── services/         # API HTTP fetch helpers
│   │   ├── utils/            # Helper functions
│   │   ├── App.jsx           # Main controller and route views
│   │   └── main.jsx          # Entry point and Service Worker registration
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
```

---

## ⚙️ Installation & Setup

### 1. Prerequisites
* **Node.js** (v18+ recommended)
* **MongoDB** (Local instance or Atlas cloud URI)

### 2. Backend Setup
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend/` root directory:
   ```env
   PORT=4000
   MONGO_URI=mongodb://localhost:27017/seatManagement
   JWT_SECRET=your_super_jwt_secret_key
   FRONTEND_URL=http://localhost:5173
   NODE_ENV=development
   ```
4. Start the server in development mode:
   ```bash
   npm run dev
   ```

### 3. Client Setup
1. Navigate to the client folder:
   ```bash
   cd ../client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `client/` root directory:
   ```env
   VITE_API=http://localhost:4000
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
5. Build production-optimized distribution files (includes code-splitting):
   ```bash
   npm run build
   ```

---

## 🔒 Security & Performance Features

* **Code-Splitting**: Large libraries (`xlsx`, `html2pdf.js`) and heavy dashboard screens are dynamically loaded on-demand. The initial application bundle size is reduced by over **50%** (under 90 kB), boosting Lighthouse performance (FCP, LCP, and TBT).
* **Secure Cookie Storage**: Tokens are set as HTTP-only, secure, strict SameSite cookies during login authentication.
* **Rate Limiting**: Defends endpoints against DDoS and brute-force queries (150 login attempts and 1000 general queries maximum per 15 minutes per IP).
* **Browser Caching**: Injects `Cache-Control` header directives into safe API read (`GET`) operations, reducing rapid database traffic spikes.

---

## 📜 Spacing Layout Rules (Distance Models)

1. **Physical Gap**: Leaves gap seats empty (renders them invisibly to ensure strict compliance).
2. **Shift Seating / Anti-Collision**: Alternates departments/semesters horizontally and vertically to avoid students sitting next to classmates.
3. **Row/Column Grouping**: Separates branches into distinct seating rows to simplify invigilator question-paper distribution.
