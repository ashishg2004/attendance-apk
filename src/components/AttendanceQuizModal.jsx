import React, { useState, useEffect } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, X, User, Sparkles, Check, XCircle, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { saveAttendanceRecord, formatDisplayDate } from '../db/database';
import { getWorkerAvatar } from '../utils/avatarHelper';

export default function AttendanceQuizModal({
  isOpen,
  onClose,
  labours = [],
  todayAttendancesMap = new Map(),
  todayDateStr,
  initialIndex = 0,
  onAttendanceUpdated
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [completedStats, setCompletedStats] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [localMap, setLocalMap] = useState(new Map());

  useEffect(() => {
    if (isOpen) {
      setLocalMap(new Map(todayAttendancesMap));
      setCurrentIndex(initialIndex);
      setCompletedStats(null);
    }
  }, [isOpen]);

  if (!isOpen || labours.length === 0) return null;

  const currentLabour = labours[currentIndex];
  const totalCount = labours.length;
  const isFinished = currentIndex >= totalCount;

  // Handle Marking Attendance (PRESENT / HALF_DAY / ABSENT)
  const handleSelectStatus = async (status) => {
    if (animating || !currentLabour) return;

    setAnimating(true);

    // Save immediately to DB
    await saveAttendanceRecord(currentLabour.id, status, todayDateStr);

    // Update local state map
    const updatedMap = new Map(localMap);
    updatedMap.set(currentLabour.id, status);
    setLocalMap(updatedMap);

    if (onAttendanceUpdated) {
      onAttendanceUpdated();
    }

    // Auto move to next after slight tactile feedback delay (150ms)
    setTimeout(() => {
      setAnimating(false);
      if (currentIndex + 1 < totalCount) {
        setCurrentIndex(prev => prev + 1);
      } else {
        // Calculate final stats
        let p = 0;
        let hd = 0;
        let a = 0;
        labours.forEach(l => {
          const st = updatedMap.get(l.id);
          if (st === 'PRESENT') p++;
          else if (st === 'HALF_DAY') hd++;
          else if (st === 'ABSENT') a++;
        });

        setCompletedStats({ present: p, halfDay: hd, absent: a, total: labours.length });
        setCurrentIndex(totalCount); // trigger finish view

        try {
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        } catch (e) {
          // fallback if canvas confetti fails
        }
      }
    }, 150);
  };

  const currentStatus = currentLabour ? localMap.get(currentLabour.id) : null;
  const markedCount = Array.from(localMap.values()).filter(v => ['PRESENT', 'HALF_DAY', 'ABSENT'].includes(v)).length;

  return (
    <div className="fixed inset-0 z-50 bg-[#1C2D23]/80 backdrop-blur-xl flex flex-col justify-between p-4 overflow-y-auto">
      {/* Top Header Bar */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between py-2 text-white">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-black px-3 py-1 rounded-full bg-[#EBF4EB] text-[#2A4435] uppercase tracking-wider border border-[#D6E8D6]">
            Quiz Log Mode
          </span>
          <span className="text-xs text-emerald-100/70 font-semibold">
            {formatDisplayDate(todayDateStr, 'short')}
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          title="Close Quiz"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Card Content */}
      <div className="max-w-md w-full mx-auto my-auto py-4">
        {!isFinished && currentLabour ? (
          <div className="bg-[#FAF6EE] border border-[#E8E0D2] rounded-[2.5rem] p-6 shadow-2xl text-[#1C2D23] quiz-card-enter flex flex-col justify-between min-h-[480px] relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-[#D6E8D6]/40 rounded-full blur-3xl pointer-events-none" />

            {/* Top Progress */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-black text-[#5D7A68] tracking-widest uppercase">
                  STAFF MEMBER {currentIndex + 1} OF {totalCount}
                </span>
                <span className="text-xs font-semibold text-[#6B8E7B]">
                  {markedCount} / {totalCount} completed
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#E8E0D2]/60 rounded-full h-2 overflow-hidden mb-5 p-0.5">
                <div
                  className="bg-gradient-to-r from-[#6B8E7B] to-[#2A4435] h-1.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${((currentIndex + 1) / totalCount) * 100}%` }}
                />
              </div>

              {/* Question & Avatar */}
              <div className="text-center my-2">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-[#EBF4EB] border-2 border-[#D6E8D6] flex items-center justify-center text-[#2A4435] mb-3 shadow-sm relative overflow-hidden">
                  {getWorkerAvatar(currentLabour.name, currentLabour.trade) ? (
                    <img
                      src={getWorkerAvatar(currentLabour.name, currentLabour.trade)}
                      alt={currentLabour.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 stroke-[1.8]" />
                  )}
                  {currentStatus && (
                    <div
                      className={`absolute -bottom-1 -right-1 rounded-full p-1 border-2 border-[#FAF6EE] ${
                        currentStatus === 'PRESENT'
                          ? 'bg-[#2A4435] text-white'
                          : currentStatus === 'HALF_DAY'
                          ? 'bg-amber-600 text-white'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {currentStatus === 'PRESENT' ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : currentStatus === 'HALF_DAY' ? (
                        <Clock className="w-3.5 h-3.5 stroke-[3]" />
                      ) : (
                        <X className="w-3.5 h-3.5 stroke-[3]" />
                      )}
                    </div>
                  )}
                </div>

                <p className="text-[11px] uppercase font-extrabold tracking-widest text-[#5D7A68] mb-0.5">
                  {currentLabour.trade || 'General Worker'}
                </p>
                <h2 className="text-xl font-black text-[#1C2D23] tracking-tight mb-0.5 font-serif">
                  {currentLabour.name}
                </h2>
                <p className="text-[#5D7A68] font-bold text-xs">
                  "{currentLabour.name} attendance today?"
                </p>
              </div>
            </div>

            {/* PRESENT / HALF DAY / ABSENT Pastel Tactile Buttons */}
            <div className="space-y-2.5 my-3">
              <button
                onClick={() => handleSelectStatus('PRESENT')}
                className={`w-full py-3.5 px-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all tactile-btn shadow-md ${
                  currentStatus === 'PRESENT'
                    ? 'bg-[#2A4435] text-white ring-4 ring-[#2A4435]/30 shadow-[#2A4435]/30'
                    : 'bg-[#EBF4EB] hover:bg-[#D6E8D6] text-[#2A4435] border border-[#D6E8D6]'
                }`}
              >
                <CheckCircle2 className="w-6 h-6" />
                <span>PRESENT (Full Day)</span>
              </button>

              <button
                onClick={() => handleSelectStatus('HALF_DAY')}
                className={`w-full py-3.5 px-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all tactile-btn shadow-md ${
                  currentStatus === 'HALF_DAY'
                    ? 'bg-amber-600 text-white ring-4 ring-amber-500/30 shadow-amber-900/30'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                }`}
              >
                <Clock className="w-6 h-6" />
                <span>HALF DAY (0.5 Day)</span>
              </button>

              <button
                onClick={() => handleSelectStatus('ABSENT')}
                className={`w-full py-3.5 px-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all tactile-btn shadow-md ${
                  currentStatus === 'ABSENT'
                    ? 'bg-rose-700 text-white ring-4 ring-rose-500/30 shadow-rose-900/30'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                }`}
              >
                <XCircle className="w-6 h-6" />
                <span>ABSENT</span>
              </button>
            </div>

            {/* Navigation Bottom Controls */}
            <div className="flex items-center justify-between pt-2 border-t border-[#E8E0D2] text-xs font-bold">
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                className="flex items-center gap-1 text-[#6B8E7B] hover:text-[#1C2D23] disabled:opacity-30 disabled:hover:text-[#6B8E7B] py-1 px-2"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <button
                disabled={currentIndex >= totalCount - 1}
                onClick={() => setCurrentIndex(prev => Math.min(totalCount - 1, prev + 1))}
                className="flex items-center gap-1 text-[#6B8E7B] hover:text-[#1C2D23] disabled:opacity-30 disabled:hover:text-[#6B8E7B] py-1 px-2"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Finished Quiz Summary Card */
          <div className="bg-[#FAF6EE] border border-[#E8E0D2] rounded-[2.5rem] p-7 text-center shadow-2xl text-[#1C2D23] quiz-card-enter">
            <div className="w-16 h-16 rounded-3xl bg-[#EBF4EB] text-[#2A4435] border-2 border-[#D6E8D6] flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-8 h-8 animate-bounce text-[#2A4435]" />
            </div>

            <h2 className="text-xl font-black text-[#1C2D23] mb-1 font-serif">
              Attendance completed ✓
            </h2>
            <p className="text-[#6B8E7B] text-xs font-semibold mb-5">
              All {labours.length} staff members recorded for {formatDisplayDate(todayDateStr, 'short')}
            </p>

            {/* Stats Breakdown */}
            <div className="grid grid-cols-3 gap-2.5 mb-6">
              <div className="bg-[#EBF4EB] border border-[#D6E8D6] rounded-2xl p-3 text-center">
                <span className="text-[10px] uppercase font-black text-[#2A4435] block mb-1">
                  Present
                </span>
                <span className="text-2xl font-black text-[#2A4435]">
                  {completedStats ? completedStats.present : Array.from(localMap.values()).filter(v => v === 'PRESENT').length}
                </span>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
                <span className="text-[10px] uppercase font-black text-amber-900 block mb-1">
                  Half Day
                </span>
                <span className="text-2xl font-black text-amber-900">
                  {completedStats ? completedStats.halfDay : Array.from(localMap.values()).filter(v => v === 'HALF_DAY').length}
                </span>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-center">
                <span className="text-[10px] uppercase font-black text-rose-800 block mb-1">
                  Absent
                </span>
                <span className="text-2xl font-black text-rose-800">
                  {completedStats ? completedStats.absent : Array.from(localMap.values()).filter(v => v === 'ABSENT').length}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 bg-[#2A4435] hover:bg-[#1C2E24] text-white font-black rounded-2xl text-sm shadow-xl active:scale-98 transition-all tactile-btn"
            >
              Done & Return Home
            </button>
          </div>
        )}
      </div>

      <div />
    </div>
  );
}
