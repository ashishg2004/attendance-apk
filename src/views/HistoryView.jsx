import React, { useState, useEffect } from 'react';
import { History as HistoryIcon, Calendar, Search, ChevronDown, ChevronUp, CheckCircle2, XCircle, Edit2, Download, Upload, PlusCircle, ExternalLink, Trash2, ChevronLeft } from 'lucide-react';
import { db, formatDisplayDate, saveAttendanceRecord, deleteAttendanceByDate } from '../db/database';
import { exportAttendanceCSV } from '../utils/csvExport';
import { getWorkerAvatar } from '../utils/avatarHelper';

export default function HistoryView({ labours = [], realTodayDateStr, onSelectDateAndEdit, onAttendanceUpdated, onOpenImportModal }) {
  const [dateGroups, setDateGroups] = useState([]);
  const [expandedDate, setExpandedDate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [customDatePicker, setCustomDatePicker] = useState('');

  useEffect(() => {
    loadHistory();
  }, [labours]);

  const loadHistory = async () => {
    const allAttendances = await db.attendances.toArray();
    const labourMap = new Map(labours.map((l) => [l.id, l]));

    const groups = new Map();

    allAttendances.forEach((record) => {
      if (!groups.has(record.date)) {
        groups.set(record.date, []);
      }
      const labour = labourMap.get(record.labour_id);
      groups.get(record.date).push({
        ...record,
        labourName: labour ? labour.name : 'Unknown Staff',
        labourTrade: labour ? labour.trade : 'Staff Member',
        labourActive: labour ? labour.active : true
      });
    });

    const sortedDates = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

    const formattedGroups = sortedDates.map((dateStr) => {
      const records = groups.get(dateStr);
      const total = records.length;
      const present = records.filter((r) => r.status === 'PRESENT').length;
      const half = records.filter((r) => r.status === 'HALF_DAY').length;
      const absent = records.filter((r) => r.status === 'ABSENT').length;

      return {
        date: dateStr,
        total,
        present,
        half,
        absent,
        records
      };
    });

    setDateGroups(formattedGroups);
    if (formattedGroups.length > 0 && !expandedDate) {
      setExpandedDate(formattedGroups[0].date);
    }
  };

  const handleToggleStatus = async (labourId, currentDate, currentStatus) => {
    let newStatus = 'PRESENT';
    if (currentStatus === 'PRESENT') {
      newStatus = 'HALF_DAY';
    } else if (currentStatus === 'HALF_DAY') {
      newStatus = 'ABSENT';
    } else {
      newStatus = 'PRESENT';
    }
    await saveAttendanceRecord(labourId, newStatus, currentDate);
    await loadHistory();
    if (onAttendanceUpdated) onAttendanceUpdated();
  };

  const handleDeleteDate = async (dateStr) => {
    const displayDate = formatDisplayDate(dateStr, 'full');
    if (confirm(`Are you sure you want to DELETE ALL ATTENDANCE RECORDS for ${displayDate}?`)) {
      await deleteAttendanceByDate(dateStr);
      await loadHistory();
      if (onAttendanceUpdated) onAttendanceUpdated();
    }
  };

  const handleCustomDateSelect = (dateStr) => {
    if (dateStr && onSelectDateAndEdit) {
      onSelectDateAndEdit(dateStr);
    }
  };

  const filteredGroups = dateGroups.filter((group) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const dateFormatted = formatDisplayDate(group.date, 'full').toLowerCase();
    const dateMatch = group.date.includes(search) || dateFormatted.includes(search);
    const labourMatch = group.records.some((r) => r.labourName.toLowerCase().includes(search));
    return dateMatch || labourMatch;
  });

  return (
    <div className="space-y-4 pb-28">
      {/* Top Header Bar Matching Mockup Screen 3 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-white border border-[#EFEAE1] flex items-center justify-center text-[#1E382B]">
            <ChevronLeft className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#1E382B] leading-tight">Attendance History</h2>
            <p className="text-xs text-[#5A7A68] font-semibold">
              Daily logs & records
            </p>
          </div>
        </div>

        {/* Action Buttons: Import CSV & Date Picker */}
        <div className="flex items-center space-x-2">
          {onOpenImportModal && (
            <button
              onClick={onOpenImportModal}
              title="Upload Attendance CSV"
              className="px-3 py-2 rounded-2xl bg-[#E8F5E9] text-[#1E382B] border border-[#D2EBD5] shadow-xs tactile-btn text-xs font-black flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload CSV</span>
            </button>
          )}

          <div className="relative">
            <input
              type="date"
              value={customDatePicker}
              onChange={(e) => {
                setCustomDatePicker(e.target.value);
                handleCustomDateSelect(e.target.value);
              }}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
            />
            <button className="p-2.5 rounded-2xl bg-white border border-[#EFEAE1] text-[#1E382B] shadow-xs tactile-btn">
              <Calendar className="w-4 h-4 text-[#1E382B]" />
            </button>
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#5A7A68]" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by date or labour name..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-[#EFEAE1] rounded-2xl text-[#1E382B] placeholder-[#7A8E82] focus:outline-none focus:border-[#1E382B] text-xs font-semibold shadow-xs"
        />
      </div>

      {/* Date Cards Accordion Matching Mockup Screen 3 */}
      {filteredGroups.length === 0 ? (
        <div className="mockup-card rounded-3xl p-8 text-center shadow-xs">
          <h3 className="font-bold text-[#1E382B] text-sm">No History Records Found</h3>
          <p className="text-xs text-[#5A7A68] mt-1 mb-4">
            Select any date above or mark attendance for today.
          </p>
          <div className="relative inline-block">
            <input
              type="date"
              onChange={(e) => handleCustomDateSelect(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
            />
            <button className="px-4 py-2.5 rounded-2xl bg-[#1E382B] text-white font-extrabold text-xs tactile-btn shadow-md">
              + Pick a Date to Mark Attendance
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((group) => {
            const isExpanded = expandedDate === group.date;
            const [y, m, d] = group.date.split('-');
            const dateObj = new Date(y, m - 1, d);
            const dayNum = dateObj.getDate();
            const monthStr = dateObj.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();

            return (
              <div
                key={group.date}
                className="mockup-card rounded-[24px] border border-[#EFEAE1] overflow-hidden transition-all shadow-xs"
              >
                {/* Accordion Header Bar */}
                <div
                  onClick={() => setExpandedDate(isExpanded ? null : group.date)}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-[#FAF7F2] transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {/* Stacked Dark Date Badge Box Matching Mockup */}
                    <div className="w-12 py-1.5 rounded-2xl bg-[#1E382B] text-white flex flex-col items-center justify-center leading-none">
                      <span className="text-base font-black tracking-tight">{dayNum}</span>
                      <span className="text-[9px] font-black tracking-widest text-[#A8C8B5] mt-0.5 uppercase">{monthStr}</span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-[#1E382B] text-sm">
                        {formatDisplayDate(group.date, 'full')}
                      </h3>
                      <p className="text-xs text-[#5A7A68] font-medium">
                        Total Labour: {group.total}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {/* Pill Badges: e.g., 2 P | 1 HD | 0 A */}
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#E8F5E9] text-[#1E382B] border border-[#D2EBD5]">
                      {group.present} P
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-50 text-amber-900 border border-amber-200">
                      {group.half || 0} HD
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]">
                      {group.absent} A
                    </span>

                    <div className="text-[#5A7A68] pl-1">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Accordion Body Matching Mockup Screen 3 */}
                {isExpanded && (
                  <div className="border-t border-[#EFEAE1] bg-[#FAF7F2]/60 p-3.5 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-[#5A7A68] px-1">
                      <span>Labour Records ({group.records.length})</span>
                      <div className="flex items-center space-x-3 text-[11px]">
                        {onSelectDateAndEdit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectDateAndEdit(group.date);
                            }}
                            className="text-[#1E382B] font-extrabold flex items-center gap-1 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Open in Log</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            exportAttendanceCSV(group.date);
                          }}
                          className="text-[#5A7A68] hover:text-[#1E382B] font-bold flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>CSV</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDate(group.date);
                          }}
                          className="text-rose-700 hover:text-rose-900 font-bold flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Worker Rows */}
                    <div className="space-y-2">
                      {group.records.map((record) => {
                        const initial = record.labourName ? record.labourName.charAt(0).toUpperCase() : 'W';
                        const avatarImg = getWorkerAvatar(record.labourName, record.labourTrade);

                        return (
                          <div
                            key={record.id}
                            className="p-3 bg-white rounded-2xl border border-[#EFEAE1] flex items-center justify-between shadow-2xs"
                          >
                            <div className="flex items-center space-x-3">
                              {avatarImg ? (
                                <img
                                  src={avatarImg}
                                  alt={record.labourName}
                                  className="w-9 h-9 rounded-full object-cover border border-[#D2EBD5] shadow-xs"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-[#E8F5E9] text-[#1E382B] font-extrabold flex items-center justify-center text-xs border border-[#D2EBD5]">
                                  {initial}
                                </div>
                              )}
                              <div>
                                <h4 className="font-extrabold text-[#1E382B] text-xs">
                                  {record.labourName}
                                </h4>
                                <p className="text-[10px] text-[#5A7A68] font-medium">
                                  {record.labourTrade}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              {/* Pill status: Present / Half Day / Absent */}
                              <button
                                onClick={() =>
                                  handleToggleStatus(record.labour_id, record.date, record.status)
                                }
                                className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1 transition-all tactile-btn ${
                                  record.status === 'PRESENT'
                                    ? 'bg-[#E8F5E9] text-[#1E382B] border border-[#D2EBD5]'
                                    : record.status === 'HALF_DAY'
                                    ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                    : 'bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]'
                                }`}
                                title="Click to toggle (Present ➔ Half Day ➔ Absent)"
                              >
                                {record.status === 'PRESENT'
                                  ? '✓ Present'
                                  : record.status === 'HALF_DAY'
                                  ? '⏱ Half Day'
                                  : '✕ Absent'}
                              </button>

                              <button
                                onClick={() =>
                                  handleToggleStatus(record.labour_id, record.date, record.status)
                                }
                                className="p-1 text-[#7A8E82] hover:text-[#1E382B]"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
