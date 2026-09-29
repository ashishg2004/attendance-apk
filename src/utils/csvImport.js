import { db, saveAttendanceRecord, addLabour } from '../db/database';

/**
 * Robust CSV parser that handles quotes, escaped quotes, multiline values, and BOM.
 */
export function parseCSVText(csvText) {
  if (!csvText) return { headers: [], rows: [] };

  // Remove UTF-8 Byte Order Mark if present
  let cleanText = csvText;
  if (cleanText.charCodeAt(0) === 0xFEFF) {
    cleanText = cleanText.slice(1);
  }

  const lines = [];
  let curVal = '';
  let inQuotes = false;
  let curRow = [];

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        curVal += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      curRow.push(curVal.trim());
      curVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      curRow.push(curVal.trim());
      if (curRow.some(cell => cell.length > 0)) {
        lines.push(curRow);
      }
      curRow = [];
      curVal = '';
    } else {
      curVal += char;
    }
  }

  if (curVal.length > 0 || curRow.length > 0) {
    curRow.push(curVal.trim());
    if (curRow.some(cell => cell.length > 0)) {
      lines.push(curRow);
    }
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0].map(h => h.replace(/^["']|["']$/g, '').trim());
  const rows = lines.slice(1);

  return { headers, rows };
}

/**
 * Detect column mapping for expected fields based on header strings.
 */
export function detectColumnMapping(headers = []) {
  const mapping = {
    date: '',
    labour_id: '',
    name: '',
    trade: '',
    status: ''
  };

  headers.forEach((header, idx) => {
    const cleanHeader = header.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();

    // Date
    if (!mapping.date && (cleanHeader.includes('date') || cleanHeader.includes('tarikh') || cleanHeader === 'din' || cleanHeader === 'day')) {
      mapping.date = header;
    }
    // Labour / Staff ID
    else if (!mapping.labour_id && (cleanHeader.includes('staff id') || cleanHeader.includes('staff_id') || cleanHeader.includes('labour id') || cleanHeader.includes('worker id') || cleanHeader === 'id' || cleanHeader.includes('labour_id') || cleanHeader.includes('worker_id'))) {
      mapping.labour_id = header;
    }
    // Labour / Staff Name
    else if (!mapping.name && (cleanHeader.includes('staff name') || cleanHeader.includes('staff_name') || cleanHeader.includes('name') || cleanHeader.includes('naam') || cleanHeader.includes('staff') || cleanHeader.includes('labour') || cleanHeader.includes('worker'))) {
      mapping.name = header;
    }
    // Trade
    else if (!mapping.trade && (cleanHeader.includes('trade') || cleanHeader.includes('role') || cleanHeader.includes('designation') || cleanHeader.includes('kaam'))) {
      mapping.trade = header;
    }
    // Status
    else if (!mapping.status && (cleanHeader.includes('status') || cleanHeader.includes('attendance') || cleanHeader.includes('present') || cleanHeader.includes('hazari'))) {
      mapping.status = header;
    }
  });

  // Fallbacks if not auto-matched
  if (!mapping.date && headers.length > 0) mapping.date = headers[0];
  if (!mapping.name && headers.length > 2) mapping.name = headers[2];
  else if (!mapping.name && headers.length > 1) mapping.name = headers[1];
  if (!mapping.status && headers.length > 4) mapping.status = headers[4];
  else if (!mapping.status && headers.length > 3) mapping.status = headers[3];

  return mapping;
}

/**
 * Normalizes various date strings to YYYY-MM-DD
 * Supports: DD-MM-YYYY, YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, ISO dates
 */
export function parseAndNormalizeDate(val) {
  if (!val) return null;
  const str = String(val).replace(/^["']|["']$/g, '').trim();
  if (!str) return null;

  // Pattern: YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(str)) {
    const parts = str.split(/[-/T ]/);
    const y = parts[0];
    const m = String(parts[1]).padStart(2, '0');
    const d = String(parts[2]).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Pattern: DD-MM-YYYY or DD/MM/YYYY
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(str)) {
    const parts = str.split(/[-/ ]/);
    const d = String(parts[0]).padStart(2, '0');
    const m = String(parts[1]).padStart(2, '0');
    const y = parts[2];
    return `${y}-${m}-${d}`;
  }

  // Standard JS Date parse fallback
  const timestamp = Date.parse(str);
  if (!isNaN(timestamp)) {
    const dObj = new Date(timestamp);
    const y = dObj.getFullYear();
    const m = String(dObj.getMonth() + 1).padStart(2, '0');
    const d = String(dObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}

/**
 * Normalizes status values to 'PRESENT', 'HALF_DAY', or 'ABSENT'
 */
export function parseAndNormalizeStatus(val) {
  if (!val) return 'ABSENT';
  const str = String(val).replace(/^["']|["']$/g, '').trim().toLowerCase();

  if (['half_day', 'half day', 'half', 'hd', 'h/d', '0.5', 'halfday'].includes(str)) {
    return 'HALF_DAY';
  }

  if (['present', 'p', '1', 'true', 'hazir', 'h', 'yes', 'y', 'presente'].includes(str)) {
    return 'PRESENT';
  }

  return 'ABSENT';
}

/**
 * Import attendance records into Dexie IndexedDB
 */
export async function importAttendanceFromCSV({ headers, rows, mapping, activeUserId }) {
  if (!rows || rows.length === 0) {
    return { success: false, error: 'No data rows found in CSV' };
  }

  const dateIdx = headers.indexOf(mapping.date);
  const labourIdIdx = mapping.labour_id ? headers.indexOf(mapping.labour_id) : -1;
  const nameIdx = mapping.name ? headers.indexOf(mapping.name) : -1;
  const tradeIdx = mapping.trade ? headers.indexOf(mapping.trade) : -1;
  const statusIdx = headers.indexOf(mapping.status);

  if (dateIdx === -1 || statusIdx === -1 || (labourIdIdx === -1 && nameIdx === -1)) {
    return { success: false, error: 'Required mapping columns (Date, Status, and Labour ID or Name) must be selected.' };
  }

  // Fetch current labours for user
  let existingLabours = await db.labours.where('user_id').equals(activeUserId).toArray();
  const labourByIdMap = new Map(existingLabours.map(l => [l.id.toLowerCase(), l]));
  const labourByNameMap = new Map(existingLabours.map(l => [l.name.toLowerCase().trim(), l]));

  let importedCount = 0;
  let skippedCount = 0;
  let createdLaboursCount = 0;
  const datesSet = new Set();
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawDate = row[dateIdx];
    const rawStatus = row[statusIdx];
    const rawLabourId = labourIdIdx >= 0 ? row[labourIdIdx] : '';
    const rawName = nameIdx >= 0 ? row[nameIdx] : '';
    const rawTrade = tradeIdx >= 0 ? row[tradeIdx] : '';

    const formattedDate = parseAndNormalizeDate(rawDate);
    if (!formattedDate) {
      skippedCount++;
      errors.push(`Row ${i + 2}: Invalid date format "${rawDate}"`);
      continue;
    }

    const cleanStatus = parseAndNormalizeStatus(rawStatus);
    const cleanId = rawLabourId ? String(rawLabourId).replace(/^["']|["']$/g, '').trim().toLowerCase() : '';
    const cleanName = rawName ? String(rawName).replace(/^["']|["']$/g, '').trim() : '';
    const cleanTrade = rawTrade ? String(rawTrade).replace(/^["']|["']$/g, '').trim() : 'General Helper';

    if (!cleanId && !cleanName) {
      skippedCount++;
      errors.push(`Row ${i + 2}: Missing Labour ID and Name`);
      continue;
    }

    // Match existing labour
    let targetLabour = null;
    if (cleanId && labourByIdMap.has(cleanId)) {
      targetLabour = labourByIdMap.get(cleanId);
    } else if (cleanName && labourByNameMap.has(cleanName.toLowerCase())) {
      targetLabour = labourByNameMap.get(cleanName.toLowerCase());
    }

    // Auto-create labour if not found
    if (!targetLabour) {
      const labourName = cleanName || `Labour ${cleanId}`;
      try {
        targetLabour = await addLabour({
          name: labourName,
          trade: cleanTrade || 'General Helper',
          daily_wage: 500
        }, activeUserId);

        // Update local maps for subsequent rows
        labourByIdMap.set(targetLabour.id.toLowerCase(), targetLabour);
        labourByNameMap.set(targetLabour.name.toLowerCase().trim(), targetLabour);
        createdLaboursCount++;
      } catch (err) {
        skippedCount++;
        errors.push(`Row ${i + 2}: Could not create labour "${labourName}"`);
        continue;
      }
    }

    // Save attendance record
    await saveAttendanceRecord(targetLabour.id, cleanStatus, formattedDate, activeUserId);
    importedCount++;
    datesSet.add(formattedDate);
  }

  return {
    success: true,
    importedCount,
    updatedDatesCount: datesSet.size,
    createdLaboursCount,
    skippedCount,
    errors
  };
}
