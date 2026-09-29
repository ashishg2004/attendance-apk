import { db } from '../db/database';

export async function exportAttendanceCSV(dateFilter = null, activeUserId = null) {
  // Fetch labours, attendances, and payments
  let labours = await db.labours.toArray();
  let attendances = await db.attendances.toArray();
  let payments = await db.payments.toArray();

  if (activeUserId) {
    labours = labours.filter(l => !l.user_id || l.user_id === activeUserId);
    attendances = attendances.filter(a => !a.user_id || a.user_id === activeUserId);
    payments = payments.filter(p => !p.user_id || p.user_id === activeUserId);
  }

  const labourMap = new Map(labours.map(l => [l.id, l]));

  if (dateFilter) {
    attendances = attendances.filter(a => a.date === dateFilter);
    payments = payments.filter(p => p.date === dateFilter);
  }

  if (attendances.length === 0 && payments.length === 0) {
    alert('No attendance or payment records found to export!');
    return;
  }

  // Combine attendance records and payment records into unified rows
  const combinedRecords = [];

  // Attendance Records
  attendances.forEach(a => {
    combinedRecords.push({
      date: a.date,
      recordType: 'Attendance',
      labourId: a.labour_id,
      status: a.status === 'PRESENT' ? 'Present' : a.status === 'HALF_DAY' ? 'Half Day' : 'Absent',
      amountPaid: 0,
      notes: a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : ''
    });
  });

  // Payment Records
  payments.forEach(p => {
    combinedRecords.push({
      date: p.date,
      recordType: 'Payment',
      labourId: p.labour_id,
      status: 'Payment Paid',
      amountPaid: p.amount || 0,
      notes: p.notes ? p.notes.replace(/\r?\n/g, ' ') : 'Payment Recorded'
    });
  });

  // Sort chronologically by date descending (newest first), then by staff name
  combinedRecords.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    const nameA = labourMap.get(a.labourId)?.name || '';
    const nameB = labourMap.get(b.labourId)?.name || '';
    return nameA.localeCompare(nameB);
  });

  // Build CSV Header & Rows
  const headers = [
    'Date',
    'Record Type',
    'Staff ID',
    'Staff Name',
    'Trade / Role',
    'Wage Basis',
    'Wage Rate',
    'Status',
    'Amount Paid (Rs)',
    'Notes / Timestamp'
  ];

  const rows = combinedRecords.map(rec => {
    const labour = labourMap.get(rec.labourId);
    const dateFormatted = rec.date.split('-').reverse().join('-'); // DD-MM-YYYY format
    const name = labour ? labour.name : 'Unknown';
    const trade = labour ? labour.trade : 'General Staff';
    const wageBasis = labour ? (labour.wage_type === 'monthly' ? 'Monthly' : 'Daily') : 'Daily';
    const wageRate = labour ? (labour.wage_type === 'monthly' ? (labour.monthly_salary || 15000) : (labour.daily_wage || 500)) : 500;

    return [
      dateFormatted,
      rec.recordType,
      rec.labourId,
      `"${name.replace(/"/g, '""')}"`,
      `"${trade.replace(/"/g, '""')}"`,
      wageBasis,
      wageRate,
      rec.status,
      rec.amountPaid,
      `"${(rec.notes || '').replace(/"/g, '""')}"`
    ].join(',');
  });

  // UTF-8 Byte Order Mark (\uFEFF) for Microsoft Excel compatibility
  const csvText = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

  const filename = dateFilter 
    ? `Staff_Attendance_Payments_${dateFilter}.csv`
    : `Staff_Attendance_Backup_All_${new Date().toISOString().split('T')[0]}.csv`;

  // Create Blob with explicit MIME type
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });

  if (window.navigator && window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveOrOpenBlob(blob, filename);
    return;
  }

  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', blobUrl);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
    URL.revokeObjectURL(blobUrl);
  }, 10000);
}
