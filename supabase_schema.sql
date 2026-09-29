-- Supabase PostgreSQL Schema for Staff Attendance Mobile App

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

-- Disable RLS for easy initial sync access or configure public access policies
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE labours DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendances DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
