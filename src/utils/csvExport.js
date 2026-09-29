import { db, formatDisplayDate } from '../db/database';

export async function exportAttendanceCSV(dateFilter = null) {
  // Fetch all attendances and labours
  let attendances = await db.attendances.toArray();
  const labours = await db.labours.toArray();
  const labourMap = new Map(labours.map(l => [l.id, l]));

  if (dateFilter) {
    attendances = attendances.filter(a => a.date === dateFilter);
  }

  if (attendances.length === 0) {
    alert('No attendance records found to export!');
    return;
  }

  // Sort chronologically by date, then labour name
  attendances.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    const nameA = labourMap.get(a.labour_id)?.name || '';
    const nameB = labourMap.get(b.labour_id)?.name || '';
    return nameA.localeCompare(nameB);
  });

  // Build CSV Header & Rows
  const headers = ['Date', 'Staff ID', 'Staff Name', 'Trade / Role', 'Status', 'Timestamp'];
  const rows = attendances.map(a => {
    const labour = labourMap.get(a.labour_id);
    const dateFormatted = a.date.split('-').reverse().join('-'); // DD-MM-YYYY format
    const name = labour ? labour.name : 'Unknown';
    const trade = labour ? labour.trade : '-';
    const status = a.status === 'PRESENT' ? 'Present' : a.status === 'HALF_DAY' ? 'Half Day' : 'Absent';
    const timestamp = a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : '';

    return [
      dateFormatted,
      a.labour_id,
      `"${name.replace(/"/g, '""')}"`,
      `"${trade.replace(/"/g, '""')}"`,
      status,
      timestamp
    ].join(',');
  });

  // UTF-8 Byte Order Mark (\uFEFF) for Microsoft Excel column formatting
  const csvText = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

  const filename = dateFilter 
    ? `Staff_Attendance_${dateFilter}.csv`
    : `Staff_Attendance_All_${new Date().toISOString().split('T')[0]}.csv`;

  // Create Blob with explicit MIME type
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });

  // Handle MS Navigator save Blob if supported
  if (window.navigator && window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveOrOpenBlob(blob, filename);
    return;
  }

  // Create Blob URL
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', blobUrl);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();

  // CRITICAL FIX: Do NOT call URL.revokeObjectURL immediately!
  // Immediate revocation causes Chrome/Edge to discard the filename and fall back to temporary GUID names.
  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
    URL.revokeObjectURL(blobUrl);
  }, 10000);
}
