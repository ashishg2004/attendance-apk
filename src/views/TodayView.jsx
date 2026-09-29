import React, { useRef } from 'react';
import { Calendar, ChevronDown, UserCheck, UserX, CalendarCheck, ArrowRight, Trash2, RotateCcw } from 'lucide-react';
import { formatDisplayDate, deleteAttendanceByDate } from '../db/database';
import { getWorkerAvatar } from '../utils/avatarHelper';

export default function TodayView({
  labours = [],
  todayAttendancesMap = new Map(),
  todayDateStr,
  realTodayDateStr,
  currentUser,
  onOpenQuiz,
  onOpenLabourDetail,
  onSwitchTab,
  onPrevDay,
  onNextDay,
  onGoToToday,
  onSelectDate,
  onAttendanceUpdated
}) {
  const dateInputRef = useRef(null);
  const isRealToday = todayDateStr === realTodayDateStr;
  const activeLabours = labours.filter(l => l.active !== false);
  const totalLaboursCount = activeLabours.length;

  // Time-of-day greeting (Good Morning: 4am-12pm, Good Afternoon: 12pm-5pm, Good Evening: 5pm-4am)
  const currentHour = new Date().getHours();
  let timeGreeting = 'Good Evening,';
  if (currentHour >= 4 && currentHour < 12) {
    timeGreeting = 'Good Morning,';
  } else if (currentHour >= 12 && currentHour < 17) {
    timeGreeting = 'Good Afternoon,';
  }

  // Capitalized User Display Name
  const rawName = currentUser?.username || currentUser?.name || 'Manager';
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  let presentCount = 0;
  let halfDayCount = 0;
  let absentCount = 0;

  activeLabours.forEach((l) => {
    const status = todayAttendancesMap.get(l.id);
    if (status === 'PRESENT') presentCount++;
    else if (status === 'HALF_DAY') halfDayCount++;
    else if (status === 'ABSENT') absentCount++;
  });

  const markedCount = presentCount + halfDayCount + absentCount;
  const progressPercent = totalLaboursCount > 0 ? Math.round((markedCount / totalLaboursCount) * 100) : 0;

  const handleDeleteCurrentDate = async () => {
    const displayDate = formatDisplayDate(todayDateStr, 'full');
    if (confirm(`Are you sure you want to DELETE ALL ATTENDANCE RECORDS for ${displayDate}?`)) {
      await deleteAttendanceByDate(todayDateStr);
      if (onAttendanceUpdated) onAttendanceUpdated();
    }
  };

  const handleOpenDatePicker = () => {
    if (dateInputRef.current) {
      if (typeof dateInputRef.current.showPicker === 'function') {
        dateInputRef.current.showPicker();
      } else {
        dateInputRef.current.click();
      }
    }
  };

  const firstUnmarkedIndex = activeLabours.findIndex(l => !todayAttendancesMap.has(l.id));

  return (
    <div className="space-y-4 pb-28 relative">
      {/* Background Watermark & Glow Blobs */}
      <div className="fixed top-12 left-1/4 -translate-x-1/2 w-72 h-72 bg-[#D8EAD8]/30 rounded-full blur-3xl pointer-events-none ambient-blob-1 -z-10" />

      {/* Top Date Selection Card Matching Mockup Screen 1 */}
      <div className="mockup-card rounded-2xl p-3 shadow-xs flex items-center justify-between">
        <div
          onClick={handleOpenDatePicker}
          className="relative flex items-center flex-1 cursor-pointer group"
        >
          <input
            ref={dateInputRef}
            type="date"
            value={todayDateStr}
            onChange={(e) => e.target.value && onSelectDate(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-20"
          />
          <div className="flex items-center gap-2.5 text-[#1E382B] font-extrabold text-sm group-hover:opacity-80 transition-opacity">
            <Calendar className="w-4 h-4 text-[#1E382B]" />
            <span>{formatDisplayDate(todayDateStr, 'full')}</span>
            <ChevronDown className="w-4 h-4 text-[#5A7A68] transition-transform group-hover:translate-y-0.5" />
          </div>
        </div>

        <div className="flex items-center space-x-1.5 z-30">
          {!isRealToday ? (
            <button
              onClick={onGoToToday}
              className="px-3 py-1.5 rounded-xl bg-[#1E382B] text-white font-bold text-xs flex items-center gap-1 shadow-xs tactile-btn"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Today</span>
            </button>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-[#E8F5E9] text-[#1E382B] font-extrabold text-[10px] tracking-wide border border-[#D2EBD5]">
              Today
            </span>
          )}

          {markedCount > 0 && (
            <button
              onClick={handleDeleteCurrentDate}
              className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold tactile-btn"
              title="Delete Date Attendance"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Hero Banner Card Matching Mockup Screen 1 */}
      <div className="pista-hero-card rounded-[28px] p-6 text-white relative overflow-hidden">
        {/* Crisp Vector SVG Silhouette Overlay of Construction Cranes & Buildings */}
        <div className="absolute right-0 bottom-0 top-0 w-1/2 opacity-25 pointer-events-none flex items-end justify-end p-2">
          <svg className="w-full h-full text-white fill-current" viewBox="0 0 200 160" preserveAspectRatio="xMidYMax meet">
            {/* Crane 1 */}
            <path d="M120 150 L120 20 L180 20 M120 30 L160 20 M120 45 L140 20 M120 20 L100 35 M170 20 L170 60 L165 60 L175 60" stroke="white" strokeWidth="2" fill="none" />
            {/* Scaffolding structure */}
            <rect x="50" y="70" width="60" height="80" stroke="white" strokeWidth="1.5" strokeDasharray="3,3" fill="none" />
            <line x1="50" y1="90" x2="110" y2="90" stroke="white" strokeWidth="1.5" />
            <line x1="50" y1="110" x2="110" y2="110" stroke="white" strokeWidth="1.5" />
            <line x1="50" y1="130" x2="110" y2="130" stroke="white" strokeWidth="1.5" />
            <line x1="70" y1="70" x2="70" y2="150" stroke="white" strokeWidth="1.5" />
            <line x1="90" y1="70" x2="90" y2="150" stroke="white" strokeWidth="1.5" />
            {/* Building Silhouettes */}
            <path d="M20 150 L20 100 L45 100 L45 150 Z" fill="white" opacity="0.6" />
            <path d="M115 150 L115 60 L155 60 L155 150 Z" fill="white" opacity="0.4" />
            <path d="M145 150 L145 85 L185 85 L185 150 Z" fill="white" opacity="0.3" />
          </svg>
        </div>

        <div className="relative z-10 max-w-[70%]">
          <span className="text-xs text-[#A8C8B5] font-bold block mb-1">
            {timeGreeting}
          </span>
          <h2 className="text-2xl font-black tracking-tight text-white mb-2 truncate">
            {displayName}
          </h2>
          <p className="text-xs text-[#D2E6DA] font-medium leading-relaxed">
            Track your staff workforce and keep your property running smoothly.
          </p>
        </div>
      </div>

      {/* 3 Metric Cards (Present Today / Half Day Today / Absent Today) */}
      <div className="grid grid-cols-3 gap-2">
        {/* Present Today Card */}
        <div className="metric-green-card rounded-[22px] p-3 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="w-7 h-7 rounded-full bg-[#1E382B]/10 flex items-center justify-center text-[#1E382B]">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-bold text-[#2E5A44]">Present</span>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-black text-[#1E382B]">{presentCount}</span>
            <span className="text-[10px] text-[#5A7A68] font-semibold">staff</span>
          </div>

          {/* Mini Bar Meter */}
          <div className="mt-2 w-full bg-[#C8E6C9] h-1 rounded-full overflow-hidden">
            <div
              className="bg-[#1E382B] h-full rounded-full transition-all duration-500"
              style={{ width: `${totalLaboursCount > 0 ? (presentCount / totalLaboursCount) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Half Day Today Card */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-[22px] p-3 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="w-7 h-7 rounded-full bg-amber-600/10 flex items-center justify-center text-amber-800">
              <UserCheck className="w-3.5 h-3.5 text-amber-800" />
            </div>
            <span className="text-[10px] font-bold text-amber-900">Half Day</span>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-black text-amber-950">{halfDayCount}</span>
            <span className="text-[10px] text-amber-800 font-semibold">staff</span>
          </div>

          {/* Mini Bar Meter */}
          <div className="mt-2 w-full bg-amber-200 h-1 rounded-full overflow-hidden">
            <div
              className="bg-amber-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${totalLaboursCount > 0 ? (halfDayCount / totalLaboursCount) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Absent Today Card */}
        <div className="metric-pink-card rounded-[22px] p-3 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="w-7 h-7 rounded-full bg-[#FF5252]/10 flex items-center justify-center text-[#D32F2F]">
              <UserX className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-bold text-[#C62828]">Absent</span>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-black text-[#B71C1C]">{absentCount}</span>
            <span className="text-[10px] text-[#E57373] font-semibold">staff</span>
          </div>

          {/* Mini Bar Meter */}
          <div className="mt-2 w-full bg-[#FFCDD2] h-1 rounded-full overflow-hidden">
            <div
              className="bg-[#D32F2F] h-full rounded-full transition-all duration-500"
              style={{ width: `${totalLaboursCount > 0 ? (absentCount / totalLaboursCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Today's Progress Bar Section */}
      <div className="mockup-card rounded-[24px] p-4">
        <div className="flex justify-between items-center text-xs font-extrabold mb-2 text-[#1E382B]">
          <span>Today's Progress</span>
          <div className="flex items-center gap-2">
            <span className="text-[#5A7A68] font-semibold">{markedCount} of {totalLaboursCount} marked</span>
            <span className="text-[#1E382B] font-black">{progressPercent}%</span>
          </div>
        </div>
        <div className="w-full bg-[#F0EBE1] h-2.5 rounded-full overflow-hidden p-0.5">
          <div
            className="bg-[#1E382B] h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Full-width Dark Pista Action Button Matching Mockup */}
      <button
        onClick={() => onOpenQuiz(firstUnmarkedIndex >= 0 ? firstUnmarkedIndex : 0)}
        className="w-full py-4 px-5 bg-[#1E382B] hover:bg-[#14281E] text-white rounded-[24px] font-extrabold text-sm flex items-center justify-between shadow-lg shadow-[#1E382B]/20 tactile-btn"
      >
        <div className="flex items-center gap-2.5">
          <CalendarCheck className="w-5 h-5 text-[#A8C8B5]" />
          <span>View / Edit Attendance</span>
        </div>
        <ArrowRight className="w-5 h-5" />
      </button>

      {/* Today's Staff List Section */}
      {totalLaboursCount > 0 && (
        <div className="mockup-card rounded-[28px] p-4">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-extrabold text-[#1E382B] text-sm">
              Today's Staff
            </h3>
            <span className="text-xs text-[#5A7A68] font-bold">
              {totalLaboursCount} staff members
            </span>
          </div>

          <div className="divide-y divide-[#EFEAE1]">
            {activeLabours.map((labour) => {
              const status = todayAttendancesMap.get(labour.id);
              const initial = labour.name ? labour.name.charAt(0).toUpperCase() : 'W';
              const avatarImg = getWorkerAvatar(labour.name, labour.trade);

              return (
                <div
                  key={labour.id}
                  onClick={() => onOpenLabourDetail(labour)}
                  className="py-3 flex items-center justify-between hover:bg-[#FAF7F2] rounded-2xl px-2 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    {avatarImg ? (
                      <img
                        src={avatarImg}
                        alt={labour.name}
                        className="w-10 h-10 rounded-full object-cover border border-[#D2EBD5] shadow-xs"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#E8F5E9] text-[#1E382B] font-extrabold flex items-center justify-center text-sm border border-[#D2EBD5]">
                        {initial}
                      </div>
                    )}
                    <div>
                      <h4 className="font-extrabold text-[#1E382B] text-sm leading-tight">
                        {labour.name}
                      </h4>
                      <p className="text-xs text-[#5A7A68] font-medium">
                        {labour.trade || 'Worker'}
                      </p>
                    </div>
                  </div>

                  <div>
                    {status === 'PRESENT' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#E8F5E9] text-[#1E382B] border border-[#D2EBD5] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#1E382B]" />
                        Present
                      </span>
                    ) : status === 'HALF_DAY' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-600" />
                        Half Day
                      </span>
                    ) : status === 'ABSENT' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#D32F2F]" />
                        Absent
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FAF7F2] text-[#7A8E82] border border-[#EFEAE1]">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
