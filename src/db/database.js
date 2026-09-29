import Dexie from 'dexie';
import { supabase } from './supabaseClient';
import { syncCloudToLocal, syncLocalToCloud, pushLabourToCloud, pushAttendanceToCloud, pushPaymentToCloud } from './syncManager';

export const db = new Dexie('LabourAttendanceDB');

// Define database schema versioning
db.version(1).stores({
  labours: 'id, name, trade, active, createdAt',
  attendances: 'id, labour_id, date, status, timestamp, [labour_id+date]'
});

db.version(2).stores({
  labours: 'id, name, trade, daily_wage, active, createdAt',
  attendances: 'id, labour_id, date, status, timestamp, [labour_id+date]',
  payments: 'id, labour_id, date, amount, timestamp'
}).upgrade(tx => {
  return tx.table('labours').toCollection().modify(labour => {
    if (!labour.daily_wage) labour.daily_wage = 500;
  });
});

db.version(3).stores({
  users: 'id, username, phone, site_name, createdAt',
  labours: 'id, user_id, name, trade, daily_wage, active, createdAt',
  attendances: 'id, user_id, labour_id, date, status, timestamp, [labour_id+date]',
  payments: 'id, user_id, labour_id, date, amount, timestamp'
}).upgrade(async tx => {
  const defaultUserId = 'user_demo';
  await tx.table('labours').toCollection().modify(labour => {
    if (!labour.user_id) labour.user_id = defaultUserId;
  });
  await tx.table('attendances').toCollection().modify(att => {
    if (!att.user_id) att.user_id = defaultUserId;
  });
  await tx.table('payments').toCollection().modify(pay => {
    if (!pay.user_id) pay.user_id = defaultUserId;
  });
  const existingDemoUser = await tx.table('users').get(defaultUserId);
  if (!existingDemoUser) {
    await tx.table('users').add({
      id: defaultUserId,
      username: 'demo',
      phone: '9876543210',
      password: '123',
      site_name: 'Main Property / Hotel Log',
      createdAt: new Date().toISOString()
    });
  }
});

db.version(4).stores({
  users: 'id, username, phone, site_name, createdAt',
  labours: 'id, user_id, name, trade, wage_type, daily_wage, monthly_salary, active, createdAt',
  attendances: 'id, user_id, labour_id, date, status, timestamp, [labour_id+date]',
  payments: 'id, user_id, labour_id, date, amount, timestamp'
}).upgrade(async tx => {
  await tx.table('labours').toCollection().modify(labour => {
    if (!labour.wage_type) labour.wage_type = 'daily';
    if (!labour.monthly_salary) labour.monthly_salary = (labour.daily_wage || 500) * 30;
  });
});

// Helper: Format date to YYYY-MM-DD
export function getTodayDateString(overrideDate = null) {
  if (overrideDate) return overrideDate;
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Format YYYY-MM-DD to "23 September 2026" or "23 Sep 2026"
export function formatDisplayDate(dateStr, format = 'full') {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  if (format === 'short') {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } else if (format === 'dayMonth') {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Helper: Get Month Name & Year for Month filter
export function getMonthYearString(dateStr) {
  if (!dateStr) return '';
  const [year, month] = dateStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
}

// Auth & Session Management Helpers
const SESSION_STORAGE_KEY = 'labour_attendance_active_user';

export function getActiveUserSession() {
  try {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
}

export function setActiveUserSession(user) {
  if (!user) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }
  const sessionData = {
    id: user.id,
    username: user.username,
    phone: user.phone || '',
    site_name: user.site_name || 'My Construction Site'
  };
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
  
  // Trigger background cloud sync on login
  syncCloudToLocal(user.id).then(() => {
    syncLocalToCloud(user.id);
  }).catch(() => {});

  return sessionData;
}

export function clearActiveUserSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export async function registerUser({ username, phone, password, site_name }) {
  const cleanUsername = username.trim().toLowerCase();
  const cleanPhone = phone ? phone.trim() : '';
  const cleanSiteName = site_name ? site_name.trim() : `${username}'s Site`;

  // 1. Check if user exists in Supabase
  try {
    const { data: cloudUsers } = await supabase
      .from('users')
      .select('*')
      .eq('username', cleanUsername);

    if (cloudUsers && cloudUsers.length > 0) {
      throw new Error('Username already exists in Cloud. Please choose a different username or Login.');
    }
  } catch (e) {
    if (e.message.includes('already exists')) throw e;
  }

  // 2. Check Local DB
  const existingUser = await db.users
    .where('username')
    .equals(cleanUsername)
    .first();

  if (existingUser) {
    throw new Error('Username already exists. Please choose a different username.');
  }

  const userId = `USER_${Date.now()}`;
  const newUser = {
    id: userId,
    username: cleanUsername,
    phone: cleanPhone,
    password: password.trim(),
    site_name: cleanSiteName,
    createdAt: new Date().toISOString()
  };

  // Save Local
  await db.users.add(newUser);

  // Save Supabase Cloud
  try {
    await supabase.from('users').insert({
      id: userId,
      username: cleanUsername,
      phone: cleanPhone,
      password: password.trim(),
      site_name: cleanSiteName
    });
  } catch (err) {
    console.warn('Could not register in Supabase cloud (Offline mode):', err);
  }

  return setActiveUserSession(newUser);
}

export async function loginUser({ usernameOrPhone, password }) {
  const query = usernameOrPhone.trim().toLowerCase();
  let matchedUser = null;

  // 1. Try Cloud Authentication first
  try {
    const { data: cloudUsers, error } = await supabase
      .from('users')
      .select('*')
      .or(`username.eq.${query},phone.eq.${query}`);

    if (!error && cloudUsers && cloudUsers.length > 0) {
      const u = cloudUsers[0];
      if (u.password === password.trim()) {
        matchedUser = {
          id: u.id,
          username: u.username,
          phone: u.phone || '',
          password: u.password,
          site_name: u.site_name || `${u.username}'s Site`,
          createdAt: u.created_at || new Date().toISOString()
        };

        // Cache user in local DB
        await db.users.put(matchedUser);
      } else {
        throw new Error('Incorrect password. Please try again.');
      }
    }
  } catch (e) {
    if (e.message.includes('Incorrect password')) throw e;
    console.warn('Cloud login fallback to local DB:', e);
  }

  // 2. Fallback to Local DB authentication if offline or cloud search was skipped
  if (!matchedUser) {
    const allUsers = await db.users.toArray();
    matchedUser = allUsers.find(
      u => u.username.toLowerCase() === query || (u.phone && u.phone === query)
    );

    if (!matchedUser) {
      throw new Error('User not found. Please check your username/phone.');
    }

    if (matchedUser.password !== password.trim()) {
      throw new Error('Incorrect password. Please try again.');
    }
  }

  const session = setActiveUserSession(matchedUser);

  // Restore Cloud Data to Local DB for this user
  syncCloudToLocal(matchedUser.id);

  return session;
}

// Helper: Get active user ID or default
function getCurrentUserId(providedId) {
  if (providedId && providedId !== 'user_demo') return providedId;
  const activeSession = getActiveUserSession();
  return activeSession?.id || providedId || 'user_demo';
}

// Helper: Calculate Staff Earnings for a period based on wage_type (daily vs monthly) & half days
export function calculateStaffEarnings(staff, presentDays = 0, halfDays = 0, totalDaysInMonth = 30) {
  if (!staff) return 0;
  const daysInMonth = totalDaysInMonth || 30;
  const effectiveDays = Number(presentDays || 0) + (0.5 * Number(halfDays || 0));

  if (staff.wage_type === 'monthly') {
    const monthlySalary = Number(staff.monthly_salary || (staff.daily_wage ? staff.daily_wage * 30 : 15000));
    return Math.round((monthlySalary / daysInMonth) * effectiveDays);
  }

  const dailyWage = Number(staff.daily_wage || 500);
  return Math.round(dailyWage * effectiveDays);
}

// Helper: Add Staff / Labour
export async function addLabour(data, userId) {
  const activeUid = getCurrentUserId(userId);
  const count = await db.labours.count();
  const newId = `S${String(count + 1).padStart(3, '0')}`;
  
  const wageType = data.wage_type === 'monthly' ? 'monthly' : 'daily';
  const dailyWage = data.daily_wage ? Number(data.daily_wage) : 500;
  const monthlySalary = data.monthly_salary ? Number(data.monthly_salary) : (dailyWage * 30);

  const newStaff = {
    id: newId,
    user_id: activeUid,
    name: data.name.trim(),
    phone: data.phone ? data.phone.trim() : '',
    trade: data.trade ? data.trade.trim() : 'General Staff',
    wage_type: wageType,
    daily_wage: dailyWage,
    monthly_salary: monthlySalary,
    active: true,
    createdAt: new Date().toISOString()
  };

  await db.labours.add(newStaff);
  pushLabourToCloud(newStaff);
  return newStaff;
}

// Helper: Update Labour / Staff
export async function updateLabour(id, updates) {
  await db.labours.update(id, updates);
  const updated = await db.labours.get(id);
  if (updated) pushLabourToCloud(updated);
}

// Aliases for Staff terminology
export const addStaff = addLabour;
export const updateStaff = updateLabour;

// Helper: Toggle Labour / Staff Active
export async function toggleLabourActive(id, currentActiveState) {
  await db.labours.update(id, { active: !currentActiveState });
  const updated = await db.labours.get(id);
  if (updated) pushLabourToCloud(updated);
}

// Helper: Delete Single Labour and un-link Cloud
export async function deleteLabour(id) {
  const labour = await db.labours.get(id);
  await db.transaction('rw', db.labours, db.attendances, db.payments, async () => {
    await db.labours.delete(id);
    await db.attendances.where('labour_id').equals(id).delete();
    await db.payments.where('labour_id').equals(id).delete();
  });

  if (labour) {
    supabase.from('labours').delete().eq('id', id).catch(() => {});
  }
}

// Helper: Clear ALL database data for current user
export async function clearAllData(userId) {
  const activeUid = getCurrentUserId(userId);
  await db.transaction('rw', db.labours, db.attendances, db.payments, async () => {
    await db.labours.where('user_id').equals(activeUid).delete();
    await db.attendances.where('user_id').equals(activeUid).delete();
    await db.payments.where('user_id').equals(activeUid).delete();
  });

  if (activeUid && activeUid !== 'user_demo') {
    supabase.from('labours').delete().eq('user_id', activeUid).catch(() => {});
    supabase.from('attendances').delete().eq('user_id', activeUid).catch(() => {});
    supabase.from('payments').delete().eq('user_id', activeUid).catch(() => {});
  }
}

// Helper: Delete ALL attendance records for a specific date
export async function deleteAttendanceByDate(dateStr, userId) {
  if (!dateStr) return;
  const activeUid = getCurrentUserId(userId);
  const records = await db.attendances.where('date').equals(dateStr).toArray();
  const userRecords = records.filter(r => r.user_id === activeUid || (!r.user_id && activeUid === 'user_demo'));
  const idsToDelete = userRecords.map(r => r.id);
  await db.attendances.bulkDelete(idsToDelete);

  if (activeUid && activeUid !== 'user_demo') {
    supabase.from('attendances').delete().eq('user_id', activeUid).eq('date', dateStr).catch(() => {});
  }
}

// Helper: Save Attendance record (Single record per labour per date)
export async function saveAttendanceRecord(labourId, status, dateStr = getTodayDateString(), userId) {
  const activeUid = getCurrentUserId(userId);
  const recordId = `${activeUid}_${labourId}_${dateStr}`;
  const now = new Date().toISOString();

  const record = {
    id: recordId,
    user_id: activeUid,
    labour_id: labourId,
    date: dateStr,
    status: status,
    timestamp: now
  };

  await db.attendances.put(record);
  pushAttendanceToCloud(record);
}

// Payment Helper Methods for Accounts
export async function addPayment({ labour_id, amount, date = getTodayDateString(), notes = '' }, userId) {
  const activeUid = getCurrentUserId(userId);
  const newPayment = {
    id: `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    user_id: activeUid,
    labour_id,
    amount: Number(amount),
    date,
    notes: notes.trim(),
    timestamp: new Date().toISOString()
  };
  await db.payments.add(newPayment);
  pushPaymentToCloud(newPayment);
  return newPayment;
}

export async function deletePayment(id) {
  await db.payments.delete(id);
  supabase.from('payments').delete().eq('id', id).catch(() => {});
}

export async function updatePayment(id, data) {
  const updated = {
    amount: Number(data.amount),
    date: data.date,
    notes: data.notes ? data.notes.trim() : '',
    timestamp: new Date().toISOString()
  };
  await db.payments.update(id, updated);
  const fullPayment = await db.payments.get(id);
  if (fullPayment) pushPaymentToCloud(fullPayment);
}

// Helper: Seed sample data (Compatibility export for App.jsx)
export async function seedSampleData() {
  return;
}
