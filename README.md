# 🏗️ Staff Attendance & Payroll Mobile App

> A modern, high-speed, offline-first mobile and web application designed for construction contractors, hotel managers, and site supervisors to effortlessly track staff attendance, calculate wages, manage payouts, and back up data to the cloud.

---

## ✨ Features at a Glance

- ⚡ **High-Speed Quiz-Style Attendance**: Mark **Present**, **Half Day (0.5x credit)**, or **Absent** for all workers in seconds.
- 🎨 **3D Role-Based Avatars**: Built-in 3D vector avatar illustrations for 8 key trades (Painter, Electrician, Chef, Manager, Plumber, Security, Waiter, Housekeeping).
- 💰 **Comprehensive Accounts & Payout Ledger**:
  - Track **Total Earned** vs **Total Paid** vs **Net Balance** ("Dena Baaki" / "Advance").
  - Log payouts with dates and custom notes.
  - Supports both **Daily Wage (₹/day)** and **Monthly Salary (₹/month)** calculations.
- 📊 **Detailed History & Monthly Summaries**: View individual worker attendance logs, half-day records, and monthly breakdowns.
- 📦 **Excel-Compatible CSV Backup & Restore**:
  - Full backup of staff info, wage rates, daily attendance, and payout transactions.
  - Interactive **Mobile-Friendly CSV Export Modal** with direct file download, 1-tap clipboard text copy, and live text preview.
  - Strict **User-Scoped Isolation** ensuring demo data is never mixed with actual accounts.
- ☁️ **Hybrid Cloud Sync & Multi-User Authentication**:
  - **Offline-First Speed**: Reads and writes to local IndexedDB (`Dexie.js`) for 0ms lag.
  - **Supabase Cloud Sync**: Automatically syncs staff, attendance, and payment records to **Supabase (PostgreSQL Cloud)** when internet is connected.
  - **App Re-install / New Phone Data Restore**: Logging in on any new device instantly restores 100% of historical records from the cloud.
- 📱 **Native Mobile UX (Capacitor)**:
  - Custom safe-area insets (`env(safe-area-inset-top/bottom)`) for modern notch screens and status bars.
  - Bottom navigation bar with bottom padding to prevent content overlap.
- 🤖 **Automated GitHub Actions CI/CD**: Automatically compiles Android APK (`.apk`) on every push to `main`.

---

## 🛠️ Technology Stack

| Layer | Technology Used |
| :--- | :--- |
| **Frontend Framework** | React 19, Vite 8 |
| **Styling & Icons** | Tailwind CSS 4, Lucide React Icons |
| **Local Offline Storage** | Dexie.js (IndexedDB) |
| **Cloud Database & Auth** | Supabase (PostgreSQL, Realtime Client) |
| **Mobile Runtime** | Capacitor 8 (Native Android Platform) |
| **CI/CD Build Pipeline** | GitHub Actions (`build-apk.yml`, JDK 21, Node 22) |

---

## 📂 Project Structure

```
Attendance app/
├── .github/workflows/
│   └── build-apk.yml             # GitHub Actions automated APK build pipeline
├── android/                       # Capacitor Android native project folder
├── public/                        # Static assets & avatar illustrations
├── src/
│   ├── components/
│   │   ├── Header.jsx            # Top navbar with site title, export modal, clear & logout
│   │   └── Navigation.jsx        # Bottom navigation bar (Today, History, Accounts, Monthly)
│   ├── db/
│   │   ├── database.js           # Dexie local schema, user auth & database helper methods
│   │   ├── supabaseClient.js     # Supabase Cloud Client configuration
│   │   └── syncManager.js        # Hybrid 2-way sync manager (Dexie ↔ Supabase)
│   ├── utils/
│   │   ├── avatarHelper.js       # Trade & name-based 3D avatar mapping logic
│   │   ├── csvExport.js          # Excel-ready CSV export engine with user scoping
│   │   └── csvImport.js          # Intelligent CSV importer with column auto-detection
│   ├── views/
│   │   ├── TodayView.jsx         # Today's high-speed attendance marking screen
│   │   ├── HistoryView.jsx       # Date-filtered attendance logs & history
│   │   ├── AccountsView.jsx      # Accounts, wage calculations, payouts & payment history
│   │   ├── MonthlyView.jsx       # Monthly attendance & financial summary report
│   │   └── LoginView.jsx         # Multi-user cloud login & registration view
│   ├── App.jsx                   # Main layout container & modal state controller
│   └── main.jsx                  # React application entry point
├── supabase_schema.sql            # PostgreSQL database migration script for Supabase
├── capacitor.config.json          # Capacitor native mobile app configuration
├── package.json                   # Project scripts and dependencies
└── README.md                      # Documentation
```

---

## 🗄️ Database Schema (Supabase SQL)

To initialize the cloud database on Supabase, run the following SQL script in the **Supabase SQL Editor**:

```sql
-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    phone TEXT,
    password TEXT NOT NULL,
    site_name TEXT DEFAULT 'My Construction Site',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Labours / Staff Table
CREATE TABLE IF NOT EXISTS labours (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    trade TEXT DEFAULT 'General Staff',
    wage_type TEXT DEFAULT 'daily',
    daily_wage NUMERIC DEFAULT 500,
    monthly_salary NUMERIC DEFAULT 15000,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Attendances Table
CREATE TABLE IF NOT EXISTS attendances (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    labour_id TEXT NOT NULL REFERENCES labours(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    status TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    labour_id TEXT NOT NULL REFERENCES labours(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    date TEXT NOT NULL,
    notes TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_labours_user ON labours(user_id);
CREATE INDEX IF NOT EXISTS idx_attendances_user_date ON attendances(user_id, date);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);

-- Access Policies (Disable RLS for public client API access; filtering is handled in app logic)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE labours DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendances DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v20 or v22 installed
- **npm**: v10+

### Installation & Development

```bash
# 1. Clone the repository
git clone https://github.com/your-username/attendance-apk.git

# 2. Navigate to project directory
cd attendance-apk

# 3. Install dependencies
npm install

# 4. Run local development server
npm run dev
```

App will run locally at `http://localhost:5173`.

### Native Capacitor & Android APK Build

```bash
# Compile web assets and sync to native Android project
npm run cap:build

# Open Android Studio (optional)
npx cap open android
```

---

## 🤖 Automated CI/CD Pipeline

Every push to the `main` branch automatically triggers the **GitHub Actions Pipeline** (`.github/workflows/build-apk.yml`).

1. Sets up **Java 21 (JDK)** and **Node 22**.
2. Runs `npm run build` and `npx cap sync android`.
3. Compiles `app-debug.apk` using `./gradlew assembleDebug`.
4. Uploads the generated APK as a downloadable artifact in the GitHub Actions run summary.

---

## 📄 License

This project is licensed under the MIT License.
