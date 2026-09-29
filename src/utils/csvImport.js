import { db, saveAttendanceRecord, addLabour, updateLabour, addPayment } from '../db/database';

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
    record_type: '',
    labour_id: '',
    name: '',
    trade: '',
    wage_type: '',
    wage_rate: '',
    status: '',
    amount: '',
    notes: ''
  };

  headers.forEach((header) => {
    const cleanHeader = header.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();

    // Record Type
    if (!mapping.record_type && (cleanHeader.includes('record type') || cleanHeader === 'type' || cleanHeader.includes('record_type'))) {
      mapping.record_type = header;
    }
    // Staff / Labour ID
    else if (!mapping.labour_id && (
      cleanHeader.includes('staff id') || 
      cleanHeader.includes('staff_id') || 
      cleanHeader.includes('labour id') || 
      cleanHeader.includes('worker id') || 
      cleanHeader === 'id' || 
      cleanHeader.includes('labour_id')
    )) {
      mapping.labour_id = header;
    }
    // Date
    else if (!mapping.date && (
      cleanHeader.includes('date') || 
      cleanHeader.includes('tarikh') || 
      cleanHeader === 'din' || 
      cleanHeader === 'day'
    )) {
      mapping.date = header;
    }
    // Trade / Role
    else if (!mapping.trade && (
      cleanHeader.includes('trade') || 
      cleanHeader.includes('role') || 
      cleanHeader.includes('designation') || 
      cleanHeader.includes('kaam')
    )) {
      mapping.trade = header;
    }
    // Wage Basis / Type
    else if (!mapping.wage_type && (
      cleanHeader.includes('wage basis') || 
      cleanHeader.includes('wage type') || 
      cleanHeader.includes('basis') || 
      cleanHeader.includes('salary type')
    )) {
      mapping.wage_type = header;
    }
    // Wage Rate / Daily Wage / Monthly Salary
    else if (!mapping.wage_rate && (
      cleanHeader.includes('wage rate') || 
      cleanHeader.includes('daily wage') || 
      cleanHeader.includes('monthly salary') || 
      cleanHeader.includes('rate') || 
      cleanHeader.includes('tankhah')
    )) {
      mapping.wage_rate = header;
    }
    // Status
    else if (!mapping.status && (
      cleanHeader.includes('status') || 
      cleanHeader.includes('attendance') || 
      cleanHeader.includes('present') || 
      cleanHeader.includes('hazari')
    )) {
      mapping.status = header;
    }
    // Amount Paid / Payment
    else if (!mapping.amount && (
      cleanHeader.includes('amount') || 
      cleanHeader.includes('paid') || 
      cleanHeader.includes('payment') || 
      cleanHeader.includes('rupees')
    )) {
      mapping.amount = header;
    }
    // Notes / Remarks
    else if (!mapping.notes && (
      cleanHeader.includes('notes') || 
      cleanHeader.includes('timestamp') || 
      cleanHeader.includes('remarks')
    )) {
      mapping.notes = header;
    }
  });

  // Second pass specifically for Name, ensuring headers containing 'id' are excluded
  headers.forEach((header) => {
    const cleanHeader = header.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    if (!mapping.name && !cleanHeader.includes('id') && (
      cleanHeader.includes('name') || 
      cleanHeader.includes('naam') || 
      cleanHeader.includes('staff name') || 
      cleanHeader.includes('labour name') || 
      cleanHeader.includes('worker name') ||
      cleanHeader === 'staff' ||
      cleanHeader === 'labour'
    )) {
      mapping.name = header;
    }
  });

  // Fallbacks if not auto-matched
  if (!mapping.date && headers.length > 0) mapping.date = headers[0];
  if (!mapping.labour_id && headers.length > 1 && headers[1].toLowerCase().includes('id')) mapping.labour_id = headers[1];
  if (!mapping.name && headers.length > 2) mapping.name = headers[2];
  else if (!mapping.name && headers.length > 1 && mapping.labour_id !== headers[1]) mapping.name = headers[1];
  if (!mapping.status && headers.length > 4) mapping.status = headers[4];

  return mapping;
}

/**
 * Normalizes various date strings to YYYY-MM-DD
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
 * Import attendance and payment records into Dexie IndexedDB
 */
export async function importAttendanceFromCSV({ headers, rows, mapping, activeUserId }) {
  if (!rows || rows.length === 0) {
    return { success: false, error: 'No data rows found in CSV' };
  }

  const dateIdx = mapping.date ? headers.indexOf(mapping.date) : -1;
  const recTypeIdx = mapping.record_type ? headers.indexOf(mapping.record_type) : -1;
  const labourIdIdx = mapping.labour_id ? headers.indexOf(mapping.labour_id) : -1;
  const nameIdx = mapping.name ? headers.indexOf(mapping.name) : -1;
  const tradeIdx = mapping.trade ? headers.indexOf(mapping.trade) : -1;
  const wageTypeIdx = mapping.wage_type ? headers.indexOf(mapping.wage_type) : -1;
  const wageRateIdx = mapping.wage_rate ? headers.indexOf(mapping.wage_rate) : -1;
  const statusIdx = mapping.status ? headers.indexOf(mapping.status) : -1;
  const amountIdx = mapping.amount ? headers.indexOf(mapping.amount) : -1;
  const notesIdx = mapping.notes ? headers.indexOf(mapping.notes) : -1;

  if (dateIdx === -1 || (labourIdIdx === -1 && nameIdx === -1)) {
    return { success: false, error: 'Required mapping columns (Date and Labour ID or Name) must be selected.' };
  }

  // Fetch current labours for user
  let existingLabours = [];
  if (activeUserId) {
    existingLabours = await db.labours.where('user_id').equals(activeUserId).toArray();
  } else {
    existingLabours = await db.labours.toArray();
  }

  const labourByIdMap = new Map(existingLabours.map(l => [l.id.toLowerCase().trim(), l]));
  const labourByNameMap = new Map(existingLabours.map(l => [l.name.toLowerCase().trim(), l]));

  let importedCount = 0;
  let paymentsCount = 0;
  let skippedCount = 0;
  let createdLaboursCount = 0;
  const datesSet = new Set();
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawDate = row[dateIdx];
    const rawRecType = recTypeIdx >= 0 ? String(row[recTypeIdx] || '').trim().toLowerCase() : '';
    const rawStatus = statusIdx >= 0 ? row[statusIdx] : '';
    const rawLabourId = labourIdIdx >= 0 ? row[labourIdIdx] : '';
    const rawName = nameIdx >= 0 ? row[nameIdx] : '';
    const rawTrade = tradeIdx >= 0 ? row[tradeIdx] : '';
    const rawWageType = wageTypeIdx >= 0 ? String(row[wageTypeIdx] || '').trim().toLowerCase() : '';
    const rawWageRate = wageRateIdx >= 0 ? Number(row[wageRateIdx] || 0) : 0;
    const rawAmount = amountIdx >= 0 ? Number(row[amountIdx] || 0) : 0;
    const rawNotes = notesIdx >= 0 ? String(row[notesIdx] || '').trim() : '';

    const formattedDate = parseAndNormalizeDate(rawDate);
    if (!formattedDate) {
      skippedCount++;
      errors.push(`Row ${i + 2}: Invalid date format "${rawDate}"`);
      continue;
    }

    const cleanId = rawLabourId ? String(rawLabourId).replace(/^["']|["']$/g, '').trim().toLowerCase() : '';
    const cleanName = rawName ? String(rawName).replace(/^["']|["']$/g, '').trim() : '';
    const cleanTrade = rawTrade ? String(rawTrade).replace(/^["']|["']$/g, '').trim() : 'General Staff';

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

    // Parsed wage preferences from CSV if present
    const isMonthly = rawWageType.includes('month');
    const parsedWageType = isMonthly ? 'monthly' : 'daily';
    const parsedRate = rawWageRate > 0 ? rawWageRate : null;

    // Create labour if not found
    if (!targetLabour) {
      const labourName = cleanName || `Staff ${cleanId}`;
      const initialDailyWage = parsedWageType === 'daily' && parsedRate ? parsedRate : 500;
      const initialMonthlySalary = parsedWageType === 'monthly' && parsedRate ? parsedRate : (initialDailyWage * 30);

      try {
        targetLabour = await addLabour({
          name: labourName,
          trade: cleanTrade || 'General Staff',
          wage_type: parsedWageType,
          daily_wage: initialDailyWage,
          monthly_salary: initialMonthlySalary
        }, activeUserId);

        labourByIdMap.set(targetLabour.id.toLowerCase().trim(), targetLabour);
        labourByNameMap.set(targetLabour.name.toLowerCase().trim(), targetLabour);
        createdLaboursCount++;
      } catch (err) {
        skippedCount++;
        errors.push(`Row ${i + 2}: Could not create staff "${labourName}"`);
        continue;
      }
    } else if (parsedRate && parsedRate > 0) {
      // Update existing labour's wage rates if CSV contains custom wage data
      const updates = {};
      if (parsedWageType === 'monthly') {
        updates.wage_type = 'monthly';
        updates.monthly_salary = parsedRate;
      } else {
        updates.wage_type = 'daily';
        updates.daily_wage = parsedRate;
      }
      await updateLabour(targetLabour.id, updates);
      Object.assign(targetLabour, updates);
    }

    // Determine if Payment row vs Attendance row
    const isPaymentRow = rawRecType === 'payment' || rawStatus.toLowerCase().includes('payment') || rawStatus.toLowerCase().includes('paid') || rawAmount > 0;

    if (isPaymentRow && rawAmount > 0) {
      // Record payment transaction
      await addPayment({
        labour_id: targetLabour.id,
        amount: rawAmount,
        date: formattedDate,
        notes: rawNotes || 'Restored Payment'
      }, activeUserId);
      paymentsCount++;
    } else {
      // Record attendance
      const cleanStatus = parseAndNormalizeStatus(rawStatus);
      await saveAttendanceRecord(targetLabour.id, cleanStatus, formattedDate, activeUserId);
      importedCount++;
    }

    datesSet.add(formattedDate);
  }

  return {
    success: true,
    importedCount,
    paymentsCount,
    updatedDatesCount: datesSet.size,
    createdLaboursCount,
    skippedCount,
    errors
  };
}
