import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Users, PieChart, User } from 'lucide-react';
import { db } from '../db/database';
import { getWorkerAvatar } from '../utils/avatarHelper';

export default function MonthlySummaryView({ labours = [], onOpenLabourDetail }) {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(8); // 8 = September (0-indexed)
  const [summaryData, setSummaryData] = useState([]);

  useEffect(() => {
    loadMonthlySummary();
  }, [selectedYear, selectedMonth, labours]);

  const loadMonthlySummary = async () => {
    const monthFormatted = String(selectedMonth + 1).padStart(2, '0');
    const monthPrefix = `${selectedYear}-${monthFormatted}`;

    const monthAttendances = await db.attendances
      .where('date')
      .startsWith(monthPrefix)
      .toArray();

    // Map counts per labour
    const summaryMap = new Map();

    labours.forEach((l) => {
      summaryMap.set(l.id, {
        labour: l,
        present: 0,
        half: 0,
        absent: 0,
        total: 0
      });
    });

    monthAttendances.forEach((record) => {
      if (summaryMap.has(record.labour_id)) {
        const item = summaryMap.get(record.labour_id);
        if (record.status === 'PRESENT') item.present++;
        else if (record.status === 'HALF_DAY') item.half++;
        else if (record.status === 'ABSENT') item.absent++;
        item.total++;
      }
    });

    const result = Array.from(summaryMap.values());
    result.sort((a, b) => (b.present + 0.5 * b.half) - (a.present + 0.5 * a.half));

    setSummaryData(result);
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const monthDate = new Date(selectedYear, selectedMonth, 1);
  const monthName = monthDate.toLocaleDateString('en-US', { month: 'long' });

  // Calculate Aggregated Metrics
  const totalPresent = summaryData.reduce((acc, curr) => acc + curr.present, 0);
  const totalHalf = summaryData.reduce((acc, curr) => acc + curr.half, 0);
  const totalAbsent = summaryData.reduce((acc, curr) => acc + curr.absent, 0);
  const totalEffective = totalPresent + (0.5 * totalHalf);
  const totalRecords = totalPresent + totalHalf + totalAbsent;
  
  // Approximate total unique working days recorded in this month
  const workingDays = Math.max(
    ...summaryData.map(d => d.total),
    totalRecords > 0 ? Math.ceil(totalRecords / Math.max(labours.length, 1)) : 0
  );

  const overallRate = totalRecords > 0 ? Math.round((totalEffective / totalRecords) * 100) : 0;

  return (
    <div className="space-y-4 pb-28">
      {/* Top Header Bar Matching Mockup Screen 4 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-white border border-[#EFEAE1] flex items-center justify-center text-[#1E382B]">
            <ChevronLeft className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#1E382B] leading-tight">Monthly Summary</h2>
            <p className="text-xs text-[#5A7A68] font-semibold">
              Staff attendance & performance analytics
            </p>
          </div>
        </div>
      </div>

      {/* Month Selector Pills matching Mockup */}
      <div className="bg-white border border-[#EFEAE1] rounded-2xl p-2.5 flex items-center justify-between shadow-xs">
        <button
          onClick={handlePrevMonth}
          className="p-1.5 rounded-xl text-[#5A7A68] hover:text-[#1E382B] hover:bg-[#FAF7F2] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-sm font-extrabold text-[#1E382B]">
          <Calendar className="w-4 h-4 text-[#1E382B]" />
          <span>{monthName} {selectedYear}</span>
        </div>

        <button
          onClick={handleNextMonth}
          className="p-1.5 rounded-xl text-[#5A7A68] hover:text-[#1E382B] hover:bg-[#FAF7F2] transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Top Stat Metric Cards Grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {/* Total Days */}
        <div className="bg-[#E8F5E9] border border-[#D2EBD5] rounded-[18px] p-2.5 text-left space-y-0.5">
          <Calendar className="w-3.5 h-3.5 text-[#1E382B]" />
          <span className="text-[9px] font-extrabold text-[#5A7A68] block">Total Days</span>
          <span className="text-lg font-black text-[#1E382B] block">{workingDays}</span>
        </div>

        {/* Present Days */}
        <div className="bg-[#E8F5E9] border border-[#D2EBD5] rounded-[18px] p-2.5 text-left space-y-0.5">
          <Users className="w-3.5 h-3.5 text-[#1E382B]" />
          <span className="text-[9px] font-extrabold text-[#5A7A68] block">Full Present</span>
          <span className="text-lg font-black text-[#1E382B] block">{totalPresent}</span>
        </div>

        {/* Half Days */}
        <div className="bg-amber-50 border border-amber-200 rounded-[18px] p-2.5 text-left space-y-0.5">
          <Users className="w-3.5 h-3.5 text-amber-900" />
          <span className="text-[9px] font-extrabold text-amber-900 block">Half Days</span>
          <span className="text-lg font-black text-amber-900 block">{totalHalf}</span>
        </div>

        {/* Absent Days */}
        <div className="bg-[#FFEBEE] border border-[#FFCDD2] rounded-[18px] p-2.5 text-left space-y-0.5">
          <Users className="w-3.5 h-3.5 text-[#C62828]" />
          <span className="text-[9px] font-extrabold text-[#C62828] block">Absent</span>
          <span className="text-lg font-black text-[#C62828] block">{totalAbsent}</span>
        </div>
      </div>

      {/* Attendance Rate Card with Donut Chart Matching Mockup Screen 4 */}
      <div className="mockup-card rounded-[24px] p-4 border border-[#EFEAE1] space-y-3">
        <h3 className="font-extrabold text-[#1E382B] text-sm">Attendance Rate</h3>
        
        <div className="flex items-center space-x-6 pt-1">
          {/* Circular SVG Donut Chart */}
          <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              {/* Background circle (Absent) */}
              <path
                className="text-[#FFEBEE]"
                strokeWidth="3.8"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              {/* Present stroke */}
              <path
                className="text-[#1E382B]"
                strokeDasharray={`${overallRate}, 100`}
                strokeWidth="3.8"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-lg font-black text-[#1E382B] leading-none">{overallRate}%</span>
            </div>
          </div>

          {/* Legend Items */}
          <div className="space-y-1.5 text-xs font-semibold">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1E382B]" />
              <span className="text-[#1E382B]">
                Effective Present: {totalEffective} days
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-amber-900">
                Half Days: {totalHalf} days
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFCDD2]" />
              <span className="text-[#5A7A68]">
                Absent: {totalAbsent} days
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Wise Attendance Progress List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-[#1E382B] text-sm">Staff Wise Attendance</h3>
          <span className="text-xs text-[#5A7A68] font-semibold">{summaryData.length} staff members</span>
        </div>

        <div className="space-y-2.5">
          {summaryData.map(({ labour, present, half, absent, total }) => {
            const effectiveDays = present + (0.5 * half);
            const percentage = total > 0 ? Math.round((effectiveDays / total) * 100) : 0;
            const initial = labour.name ? labour.name.charAt(0).toUpperCase() : 'W';
            const avatarImg = getWorkerAvatar(labour.name, labour.trade);

            return (
              <div
                key={labour.id}
                onClick={() => onOpenLabourDetail(labour)}
                className="mockup-card rounded-[24px] p-4 border border-[#EFEAE1] hover:border-[#1E382B]/30 transition-all space-y-3 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {avatarImg ? (
                      <img
                        src={avatarImg}
                        alt={labour.name}
                        className="w-10 h-10 rounded-full object-cover border border-[#D2EBD5] shadow-xs"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#E8F5E9] text-[#1E382B] font-black flex items-center justify-center text-sm border border-[#D2EBD5]">
                        {initial}
                      </div>
                    )}
                    <div>
                      <h4 className="font-extrabold text-[#1E382B] text-sm leading-tight">
                        {labour.name}
                      </h4>
                      <p className="text-xs text-[#5A7A68] font-medium">
                        {labour.trade || 'Mason'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 text-xs font-black">
                    <span className="px-2 py-0.5 rounded-full bg-[#E8F5E9] text-[#1E382B] border border-[#D2EBD5]">
                      {present}P
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                      {half}HD
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]">
                      {absent}A
                    </span>
                    <span className="text-[#1E382B] font-extrabold text-sm ml-1">
                      {percentage}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full h-2 rounded-full bg-[#E8F5E9] overflow-hidden">
                    <div
                      className="h-full bg-[#1E382B] rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
