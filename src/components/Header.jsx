import React, { useState } from 'react';
import { HardHat as HardHatIcon, Download as DownloadIcon, Upload as UploadIcon, Trash2 as Trash2Icon, LogOut as LogOutIcon, X as XIcon, Copy as CopyIcon, Check as CheckIcon, FileText as FileTextIcon } from 'lucide-react';
import { exportAttendanceCSV } from '../utils/csvExport';
import { clearAllData } from '../db/database';

export default function Header({ currentDateStr, onDataChanged, currentUser, onLogout, onOpenImportModal }) {
  const [exportModalData, setExportModalData] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleClear = async () => {
    if (confirm('Are you sure you want to CLEAR ALL LABOURS and ATTENDANCE DATA?\n\nThis will allow you to start fresh with your own labourers.')) {
      await clearAllData(currentUser?.id);
      if (onDataChanged) onDataChanged();
    }
  };

  const handleExport = async () => {
    const res = await exportAttendanceCSV(null, currentUser?.id);
    if (res) {
      setExportModalData(res);
    }
  };

  const handleCopyCsv = () => {
    if (exportModalData?.csvText) {
      navigator.clipboard.writeText(exportModalData.csvText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#FAF7F2]/95 backdrop-blur-xl border-b border-[#EFEAE1] px-4 pt-4 sm:pt-3 pb-3.5 pt-[calc(env(safe-area-inset-top,0px)+14px)] shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#1E382B] flex items-center justify-center text-white shadow-md shadow-[#1E382B]/15 tactile-btn">
              <HardHatIcon className="w-5 h-5 stroke-[2.2]" />
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
              <Trash2Icon className="w-4 h-4" />
            </button>
            
            <button
              onClick={onOpenImportModal}
              title="Upload Attendance CSV"
              className="p-2 rounded-2xl bg-[#E8F5E9] text-[#1E382B] hover:bg-[#D2EBD5] border border-[#D2EBD5] tactile-btn text-xs font-bold flex items-center gap-1"
            >
              <UploadIcon className="w-4 h-4 stroke-[2.2]" />
            </button>

            <button
              onClick={handleExport}
              title="Export Attendance CSV"
              className="p-2 rounded-2xl bg-[#E8F5E9] text-[#1E382B] hover:bg-[#D2EBD5] border border-[#D2EBD5] tactile-btn text-xs font-bold"
            >
              <DownloadIcon className="w-4 h-4 stroke-[2.2]" />
            </button>

            {/* User Logout Button */}
            {currentUser && (
              <button
                onClick={onLogout}
                title={`Logout (${currentUser.username})`}
                className="p-2 rounded-2xl bg-[#1E382B] text-white hover:bg-[#14281E] shadow-sm tactile-btn text-xs font-bold flex items-center gap-1"
              >
                <LogOutIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* CSV EXPORT & DOWNLOAD MODAL */}
      {exportModalData && (
        <div className="fixed inset-0 z-50 bg-[#1E382B]/80 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto modal-backdrop-animate">
          <div className="bg-[#FAF7F2] border border-[#EFEAE1] text-[#1E382B] rounded-[28px] w-full max-w-md p-6 shadow-2xl modal-content-animate my-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEAE1]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <FileTextIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1E382B]">CSV Backup Ready</h3>
                  <p className="text-xs text-[#5A7A68] font-semibold">
                    {exportModalData.recordCount} total records generated
                  </p>
                </div>
              </div>
              <button
                onClick={() => setExportModalData(null)}
                className="p-1.5 rounded-full text-[#5A7A68] hover:text-[#1E382B] hover:bg-white"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Direct Download Button */}
            <a
              href={exportModalData.dataUri}
              download={exportModalData.filename}
              className="w-full py-3.5 px-4 bg-[#1E382B] hover:bg-[#14281E] text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md shadow-[#1E382B]/20 tactile-btn"
            >
              <DownloadIcon className="w-4 h-4 stroke-[2.5]" />
              <span>Tap Here to Download File (.csv)</span>
            </a>

            {/* Copy CSV Text Button */}
            <button
              onClick={handleCopyCsv}
              className="w-full py-3 px-4 bg-white border border-[#EFEAE1] hover:bg-emerald-50 text-[#1E382B] font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 tactile-btn shadow-xs"
            >
              {copied ? (
                <>
                  <CheckIcon className="w-4 h-4 text-emerald-600 stroke-[3]" />
                  <span className="text-emerald-700">✓ Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <CopyIcon className="w-4 h-4 text-[#5A7A68]" />
                  <span>Copy CSV Text to Clipboard</span>
                </>
              )}
            </button>

            {/* Code / Text Preview */}
            <div>
              <label className="block text-[11px] font-extrabold text-[#5A7A68] uppercase tracking-wider mb-1">
                CSV Data Preview
              </label>
              <textarea
                readOnly
                value={exportModalData.csvText}
                rows={5}
                className="w-full p-3 bg-white border border-[#EFEAE1] rounded-2xl text-[11px] font-mono text-[#1E382B] focus:outline-none shadow-xs"
              />
            </div>

            {/* Close Button */}
            <div className="pt-2">
              <button
                onClick={() => setExportModalData(null)}
                className="w-full py-3 px-4 bg-[#EFEAE1]/70 hover:bg-[#EFEAE1] text-[#1E382B] font-bold rounded-2xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
