import Dexie from 'dexie';

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
  // Migration: Default existing records to 'user_demo'
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
  // Ensure demo user exists
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
  return sessionData;
}

export function clearActiveUserSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export async function registerUser({ username, phone, password, site_name }) {
  const cleanUsername = username.trim().toLowerCase();
  const cleanPhone = phone ? phone.trim() : '';

  // Check if username already exists
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
    site_name: site_name ? site_name.trim() : `${username}'s Site`,
    createdAt: new Date().toISOString()
  };

  await db.users.add(newUser);
  return setActiveUserSession(newUser);
}

export async function loginUser({ usernameOrPhone, password }) {
  const query = usernameOrPhone.trim().toLowerCase();
  
  const allUsers = await db.users.toArray();
  const matchedUser = allUsers.find(
    u => u.username.toLowerCase() === query || (u.phone && u.phone === query)
  );

  if (!matchedUser) {
    throw new Error('User not found. Please check your username/phone.');
  }

  if (matchedUser.password !== password.trim()) {
    throw new Error('Incorrect password. Please try again.');
  }

  return setActiveUserSession(matchedUser);
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
  return newStaff;
}

// Aliases for Staff terminology
export const addStaff = addLabour;
export const updateStaff = updateLabour;

// Helper: Update Labour / Staff
export async function updateLabour(id, updates) {
  await db.labours.update(id, updates);
}

// Helper: Toggle Labour / Staff Active
export async function toggleLabourActive(id, currentActiveState) {
  await db.labours.update(id, { active: !currentActiveState });
}

// Helper: Delete Single Labour and their Attendance records
export async function deleteLabour(id) {
  await db.transaction('rw', db.labours, db.attendances, db.payments, async () => {
    await db.labours.delete(id);
    await db.attendances.where('labour_id').equals(id).delete();
    await db.payments.where('labour_id').equals(id).delete();
  });
}

// Helper: Clear ALL database data for current user
export async function clearAllData(userId) {
  const activeUid = getCurrentUserId(userId);
  await db.transaction('rw', db.labours, db.attendances, db.payments, async () => {
    const userLabours = await db.labours.where('user_id').equals(activeUid).toArray();
    const labourIds = userLabours.map(l => l.id);

    await db.labours.where('user_id').equals(activeUid).delete();
    await db.attendances.where('user_id').equals(activeUid).delete();
    await db.payments.where('user_id').equals(activeUid).delete();
  });
}

// Helper: Delete ALL attendance records for a specific date (e.g. 2026-09-23)
export async function deleteAttendanceByDate(dateStr, userId) {
  if (!dateStr) return;
  const activeUid = getCurrentUserId(userId);
  const records = await db.attendances.where('date').equals(dateStr).toArray();
  const userRecords = records.filter(r => r.user_id === activeUid || (!r.user_id && activeUid === 'user_demo'));
  const idsToDelete = userRecords.map(r => r.id);
  await db.attendances.bulkDelete(idsToDelete);
}

// Helper: Save Attendance record (Single record per labour per date)
export async function saveAttendanceRecord(labourId, status, dateStr = getTodayDateString(), userId) {
  const activeUid = getCurrentUserId(userId);
  const recordId = `${activeUid}_${labourId}_${dateStr}`;
  const now = new Date().toISOString();

  await db.attendances.put({
    id: recordId,
    user_id: activeUid,
    labour_id: labourId,
    date: dateStr,
    status: status, // 'PRESENT' | 'ABSENT'
    timestamp: now
  });
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
  return newPayment;
}

export async function deletePayment(id) {
  await db.payments.delete(id);
}

export async function updatePayment(id, data) {
  await db.payments.update(id, {
    amount: Number(data.amount),
    date: data.date,
    notes: data.notes ? data.notes.trim() : '',
    timestamp: new Date().toISOString()
  });
}

export async function getAllPayments() {
  return await db.payments.toArray();
}

export async function getPaymentsByLabour(labourId) {
  return await db.payments.where('labour_id').equals(labourId).toArray();
}

// Helper: Seed initial sample data for demo/testing
export async function seedSampleData(force = false) {
  const labourCount = await db.labours.count();
  if (labourCount > 0 && !force) return;

  if (force) {
    await db.labours.clear();
    await db.attendances.clear();
  }

  const sampleLabours = [
    { id: 'L001', name: 'Raj Kumar', phone: '9876543210', trade: 'Mason', active: true, createdAt: new Date().toISOString() },
    { id: 'L002', name: 'Ramesh Kumar', phone: '9876543211', trade: 'Mason', active: true, createdAt: new Date().toISOString() },
    { id: 'L003', name: 'Amit Sharma', phone: '9876543212', trade: 'Helper', active: true, createdAt: new Date().toISOString() },
    { id: 'L004', name: 'Suresh Verma', phone: '9876543213', trade: 'Carpenter', active: true, createdAt: new Date().toISOString() },
    { id: 'L005', name: 'Vikas Singh', phone: '9876543214', trade: 'Plumber', active: true, createdAt: new Date().toISOString() },
    { id: 'L006', name: 'Manoj Gupta', phone: '9876543215', trade: 'Electrician', active: true, createdAt: new Date().toISOString() },
    { id: 'L007', name: 'Dharmendra Yadav', phone: '9876543216', trade: 'Welder', active: true, createdAt: new Date().toISOString() },
    { id: 'L008', name: 'Sunil Paswan', phone: '9876543217', trade: 'Helper', active: true, createdAt: new Date().toISOString() },
    { id: 'L009', name: 'Pankaj Pandit', phone: '9876543218', trade: 'Painter', active: true, createdAt: new Date().toISOString() },
    { id: 'L010', name: 'Deepak Maurya', phone: '9876543219', trade: 'Helper', active: true, createdAt: new Date().toISOString() },
    { id: 'L011', name: 'Rakesh Prasad', phone: '9876543220', trade: 'Mason', active: true, createdAt: new Date().toISOString() },
    { id: 'L012', name: 'Anil Chauhan', phone: '9876543221', trade: 'Bar Bending', active: true, createdAt: new Date().toISOString() },
    { id: 'L013', name: 'Santosh Sah', phone: '9876543222', trade: 'Helper', active: true, createdAt: new Date().toISOString() },
    { id: 'L014', name: 'Jitendra Thakur', phone: '9876543223', trade: 'Tile Fitter', active: true, createdAt: new Date().toISOString() },
    { id: 'L015', name: 'Mukesh Pal', phone: '9876543224', trade: 'Supervisor', active: true, createdAt: new Date().toISOString() }
  ];

  await db.labours.bulkAdd(sampleLabours);

  // Generate 6 days of historical attendance relative to today's date
  const todayStr = getTodayDateString();
  const [y, m, dNum] = todayStr.split('-').map(Number);
  const baseDate = new Date(y, m - 1, dNum);
  const attendanceRecords = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    sampleLabours.forEach((labour, idx) => {
      if (i === 0 && idx >= 7) {
        return; // Unmarked for today, so user can test resuming
      }

      const isPresent = (idx * 3 + i * 7) % 7 !== 0;
      attendanceRecords.push({
        id: `${labour.id}_${dateStr}`,
        labour_id: labour.id,
        date: dateStr,
        status: isPresent ? 'PRESENT' : 'ABSENT',
        timestamp: new Date(d.getTime() + 8 * 3600 * 1000).toISOString()
      });
    });
  }

  await db.attendances.bulkAdd(attendanceRecords);
}
