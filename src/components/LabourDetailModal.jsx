import React, { useState, useEffect } from 'react';
import { X, User, Phone, Briefcase, Calendar, CheckCircle2, XCircle, Edit3 } from 'lucide-react';
import { db, formatDisplayDate, saveAttendanceRecord } from '../db/database';
import { getWorkerAvatar } from '../utils/avatarHelper';

export default function LabourDetailModal({ isOpen, onClose, labour, onUpdated }) {
  const [historyRecords, setHistoryRecords] = useState([]);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, percentage: '0.0' });

  useEffect(() => {
    if (isOpen && labour) {
      loadLabourHistory();
    }
  }, [isOpen, labour]);

  const loadLabourHistory = async () => {
    if (!labour) return;

    // Fetch all attendance logs for this labour
    const records = await db.attendances
      .where('labour_id')
      .equals(labour.id)
      .toArray();

    // Sort descending by date
    records.sort((a, b) => b.date.localeCompare(a.date));

    const total = records.length;
    const present = records.filter(r => r.status === 'PRESENT').length;
    const half = records.filter(r => r.status === 'HALF_DAY').length;
    const absent = records.filter(r => r.status === 'ABSENT').length;
    const effectiveDays = present + (0.5 * half);
    const percentage = total > 0 ? ((effectiveDays / total) * 100).toFixed(1) : '0.0';

    setHistoryRecords(records);
    setStats({ total, present, half, absent, percentage });
  };

  const handleToggleSingleRecord = async (record) => {
    let newStatus = 'PRESENT';
    if (record.status === 'PRESENT') {
      newStatus = 'HALF_DAY';
    } else if (record.status === 'HALF_DAY') {
      newStatus = 'ABSENT';
    } else {
      newStatus = 'PRESENT';
    }
    await saveAttendanceRecord(labour.id, newStatus, record.date);
    await loadLabourHistory();
    if (onUpdated) onUpdated();
  };

  if (!isOpen || !labour) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#1C2D23]/80 backdrop-blur-xl flex items-center justify-center p-4 modal-backdrop-animate">
      <div className="bg-[#FAF6EE] border border-[#E8E0D2] text-[#1C2D23] rounded-3xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] flex flex-col modal-content-animate">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E8E0D2] flex-shrink-0">
          <div className="flex items-center space-x-3">
            {getWorkerAvatar(labour.name, labour.trade) ? (
              <img
                src={getWorkerAvatar(labour.name, labour.trade)}
                alt={labour.name}
                className="w-12 h-12 rounded-2xl object-cover border border-[#2A4435] shadow-xs"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-[#2A4435] text-white border border-[#2A4435] flex items-center justify-center font-bold text-xl shadow-xs">
                {labour.name.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-xl font-black tracking-tight text-[#1C2D23] leading-tight font-serif">
                {labour.name}
              </h2>
              <div className="flex items-center gap-2 text-xs text-[#6B8E7B] font-semibold">
                <span className="text-[#2A4435] font-black">{labour.id}</span>
                <span>•</span>
                <span>{labour.trade || 'Staff Member'}</span>
                <span>•</span>
                <span className="text-[#2A4435] font-extrabold bg-[#EBF4EB] px-2 py-0.5 rounded-lg border border-[#D6E8D6]">
                  {labour.wage_type === 'monthly'
                    ? `₹${(labour.monthly_salary || (labour.daily_wage * 30)).toLocaleString('en-IN')}/month`
                    : `₹${labour.daily_wage || 500}/day`}
                </span>
                {labour.phone && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-0.5 text-[#5D7A68]">
                      <Phone className="w-3 h-3" />
                      {labour.phone}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#6B8E7B] hover:text-[#1C2D23] hover:bg-[#EBF4EB] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-1.5 my-4 flex-shrink-0 text-center">
          <div className="bg-[#EBF4EB] border border-[#D6E8D6] rounded-2xl p-2">
            <span className="text-[9px] uppercase font-black text-[#5D7A68] block mb-0.5">
              Total
            </span>
            <span className="text-lg font-black text-[#1C2D23]">{stats.total}</span>
          </div>

          <div className="bg-[#EBF4EB] border border-[#D6E8D6] rounded-2xl p-2">
            <span className="text-[9px] uppercase font-black text-[#2A4435] block mb-0.5">
              Present
            </span>
            <span className="text-lg font-black text-[#2A4435]">{stats.present}</span>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2">
            <span className="text-[9px] uppercase font-black text-amber-900 block mb-0.5">
              Half Day
            </span>
            <span className="text-lg font-black text-amber-900">{stats.half}</span>
          </div>

          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-2">
            <span className="text-[9px] uppercase font-black text-rose-800 block mb-0.5">
              Absent
            </span>
            <span className="text-lg font-black text-rose-800">{stats.absent}</span>
          </div>
        </div>

        {/* Calendar / Attendance Log */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-2 no-scrollbar">
          <h3 className="text-xs font-bold text-[#6B8E7B] uppercase tracking-wider mb-2 flex items-center gap-1.5 sticky top-0 bg-[#FAF6EE] py-1">
            <Calendar className="w-3.5 h-3.5 text-[#2A4435]" />
            <span>Attendance History Log</span>
          </h3>

          {historyRecords.length === 0 ? (
            <div className="text-center py-8 text-[#6B8E7B] text-sm italic">
              No attendance records recorded yet.
            </div>
          ) : (
            historyRecords.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#E8E0D2] hover:border-[#6B8E7B] transition-colors"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="text-sm font-semibold text-[#1C2D23]">
                    {formatDisplayDate(r.date, 'dayMonth')}
                  </span>
                  <span className="text-xs text-[#6B8E7B] font-medium">
                    {r.date.split('-')[0]}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleSingleRecord(r)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all tactile-btn ${
                      r.status === 'PRESENT'
                        ? 'bg-[#2A4435] text-white'
                        : r.status === 'HALF_DAY'
                        ? 'bg-amber-600 text-white'
                        : 'bg-rose-700 text-white'
                    }`}
                    title="Click to toggle status (Present ➔ Half Day ➔ Absent)"
                  >
                    {r.status === 'PRESENT' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Present (Full)</span>
                      </>
                    ) : r.status === 'HALF_DAY' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Half Day</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Absent</span>
                      </>
                    )}
                    <Edit3 className="w-3 h-3 text-white/80 ml-1" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Close Button */}
        <div className="pt-4 mt-2 border-t border-[#E8E0D2] flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#EBF4EB] hover:bg-[#D6E8D6] text-[#2A4435] font-black rounded-xl text-sm transition-colors border border-[#D6E8D6]"
          >
            Close Detail
          </button>
        </div>
      </div>
    </div>
  );
}
