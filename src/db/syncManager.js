import { supabase } from './supabaseClient';
import { db } from './database';

/**
 * Pulls all user data from Supabase Cloud Database into local Dexie IndexedDB.
 * Call this on login or app start to restore data on new devices.
 */
export async function syncCloudToLocal(userId) {
  if (!userId || userId === 'user_demo') return;

  try {
    // 1. Fetch Labours
    const { data: cloudLabours, error: lErr } = await supabase
      .from('labours')
      .select('*')
      .eq('user_id', userId);

    if (!lErr && cloudLabours && cloudLabours.length > 0) {
      await db.labours.bulkPut(cloudLabours.map(l => ({
        id: l.id,
        user_id: l.user_id,
        name: l.name,
        phone: l.phone || '',
        trade: l.trade || 'General Staff',
        wage_type: l.wage_type || 'daily',
        daily_wage: Number(l.daily_wage) || 500,
        monthly_salary: Number(l.monthly_salary) || 15000,
        active: l.active !== false,
        createdAt: l.created_at || new Date().toISOString()
      })));
    }

    // 2. Fetch Attendances
    const { data: cloudAttendances, error: aErr } = await supabase
      .from('attendances')
      .select('*')
      .eq('user_id', userId);

    if (!aErr && cloudAttendances && cloudAttendances.length > 0) {
      await db.attendances.bulkPut(cloudAttendances.map(a => ({
        id: a.id,
        user_id: a.user_id,
        labour_id: a.labour_id,
        date: a.date,
        status: a.status,
        timestamp: a.timestamp || new Date().toISOString()
      })));
    }

    // 3. Fetch Payments
    const { data: cloudPayments, error: pErr } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId);

    if (!pErr && cloudPayments && cloudPayments.length > 0) {
      await db.payments.bulkPut(cloudPayments.map(p => ({
        id: p.id,
        user_id: p.user_id,
        labour_id: p.labour_id,
        amount: Number(p.amount) || 0,
        date: p.date,
        notes: p.notes || '',
        timestamp: p.timestamp || new Date().toISOString()
      })));
    }

    console.log('✅ Cloud to Local Sync Complete for user:', userId);
  } catch (err) {
    console.warn('Sync Cloud to Local error (Offline mode active):', err);
  }
}

/**
 * Pushes all local IndexedDB records to Supabase Cloud Database.
 */
export async function syncLocalToCloud(userId) {
  if (!userId || userId === 'user_demo') return;

  try {
    // 1. Push Labours
    const localLabours = await db.labours.where('user_id').equals(userId).toArray();
    if (localLabours.length > 0) {
      const payload = localLabours.map(l => ({
        id: l.id,
        user_id: l.user_id,
        name: l.name,
        phone: l.phone || '',
        trade: l.trade || 'General Staff',
        wage_type: l.wage_type || 'daily',
        daily_wage: Number(l.daily_wage) || 500,
        monthly_salary: Number(l.monthly_salary) || 15000,
        active: l.active !== false
      }));
      await supabase.from('labours').upsert(payload);
    }

    // 2. Push Attendances
    const localAttendances = await db.attendances.where('user_id').equals(userId).toArray();
    if (localAttendances.length > 0) {
      const payload = localAttendances.map(a => ({
        id: a.id,
        user_id: a.user_id,
        labour_id: a.labour_id,
        date: a.date,
        status: a.status,
        timestamp: a.timestamp
      }));
      await supabase.from('attendances').upsert(payload);
    }

    // 3. Push Payments
    const localPayments = await db.payments.where('user_id').equals(userId).toArray();
    if (localPayments.length > 0) {
      const payload = localPayments.map(p => ({
        id: p.id,
        user_id: p.user_id,
        labour_id: p.labour_id,
        amount: Number(p.amount) || 0,
        date: p.date,
        notes: p.notes || '',
        timestamp: p.timestamp
      }));
      await supabase.from('payments').upsert(payload);
    }

    console.log('✅ Local to Cloud Sync Complete for user:', userId);
  } catch (err) {
    console.warn('Sync Local to Cloud error (Offline mode active):', err);
  }
}

// Single Mutation Realtime Cloud Push Helpers
export async function pushLabourToCloud(labour) {
  if (!labour || !labour.user_id || labour.user_id === 'user_demo') return;
  try {
    await supabase.from('labours').upsert({
      id: labour.id,
      user_id: labour.user_id,
      name: labour.name,
      phone: labour.phone || '',
      trade: labour.trade || 'General Staff',
      wage_type: labour.wage_type || 'daily',
      daily_wage: Number(labour.daily_wage) || 500,
      monthly_salary: Number(labour.monthly_salary) || 15000,
      active: labour.active !== false
    });
  } catch (e) {
    console.warn('Could not push labour to cloud:', e);
  }
}

export async function pushAttendanceToCloud(att) {
  if (!att || !att.user_id || att.user_id === 'user_demo') return;
  try {
    await supabase.from('attendances').upsert({
      id: att.id,
      user_id: att.user_id,
      labour_id: att.labour_id,
      date: att.date,
      status: att.status,
      timestamp: att.timestamp
    });
  } catch (e) {
    console.warn('Could not push attendance to cloud:', e);
  }
}

export async function pushPaymentToCloud(pay) {
  if (!pay || !pay.user_id || pay.user_id === 'user_demo') return;
  try {
    await supabase.from('payments').upsert({
      id: pay.id,
      user_id: pay.user_id,
      labour_id: pay.labour_id,
      amount: Number(pay.amount) || 0,
      date: pay.date,
      notes: pay.notes || '',
      timestamp: pay.timestamp
    });
  } catch (e) {
    console.warn('Could not push payment to cloud:', e);
  }
}
