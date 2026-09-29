import React from 'react';
import { HardHat, Download, Upload, RefreshCw, Trash2, LogOut, User } from 'lucide-react';
import { exportAttendanceCSV } from '../utils/csvExport';
import { seedSampleData, clearAllData } from '../db/database';

export default function Header({ currentDateStr, onDataChanged, currentUser, onLogout, onOpenImportModal }) {
  const handleSeed = async () => {
    if (confirm('Load sample labours and past attendance data for testing?')) {
      await seedSampleData(true);
      if (onDataChanged) onDataChanged();
    }
  };

  const handleClear = async () => {
    if (confirm('Are you sure you want to CLEAR ALL LABOURS and ATTENDANCE DATA?\n\nThis will allow you to start fresh with your own labourers.')) {
      await clearAllData(currentUser?.id);
      if (onDataChanged) onDataChanged();
    }
  };

  const handleExport = async () => {
    await exportAttendanceCSV(null, currentUser?.id);
  };

  return (
    <header className="sticky top-0 z-30 bg-[#FAF7F2]/95 backdrop-blur-xl border-b border-[#EFEAE1] px-4 pt-4 sm:pt-3 pb-3.5 pt-[calc(env(safe-area-inset-top,0px)+14px)] shadow-sm">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#1E382B] flex items-center justify-center text-white shadow-md shadow-[#1E382B]/15 tactile-btn">
            <HardHat className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="font-black text-sm leading-tight tracking-tight text-[#1E382B] flex items-center gap-1.5">
              <span>Staff Attendance</span>
            </h1>
            <p className="text-[11px] text-[#5A7A68] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              <span className="truncate max-w-[130px]">{currentUser?.site_name || currentUser?.username || 'My Site'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleClear}
            title="Clear All Data"
            className="p-2 rounded-2xl bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 border border-rose-500/20 tactile-btn text-xs font-bold"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          
          <button
            onClick={onOpenImportModal}
            title="Upload Attendance CSV"
            className="p-2 rounded-2xl bg-[#E8F5E9] text-[#1E382B] hover:bg-[#D2EBD5] border border-[#D2EBD5] tactile-btn text-xs font-bold flex items-center gap-1"
          >
            <Upload className="w-4 h-4 stroke-[2.2]" />
          </button>

          <button
            onClick={handleExport}
            title="Export Attendance CSV"
            className="p-2 rounded-2xl bg-[#E8F5E9] text-[#1E382B] hover:bg-[#D2EBD5] border border-[#D2EBD5] tactile-btn text-xs font-bold"
          >
            <Download className="w-4 h-4 stroke-[2.2]" />
          </button>

          {/* User Logout Button */}
          {currentUser && (
            <button
              onClick={onLogout}
              title={`Logout (${currentUser.username})`}
              className="p-2 rounded-2xl bg-[#1E382B] text-white hover:bg-[#14281E] shadow-sm tactile-btn text-xs font-bold flex items-center gap-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
