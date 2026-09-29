import React, { useState, useRef } from 'react';
import { Upload, X, FileSpreadsheet, CheckCircle, AlertCircle, ArrowRight, Table, Sparkles, RefreshCw, Check, Info } from 'lucide-react';
import { parseCSVText, detectColumnMapping, importAttendanceFromCSV, parseAndNormalizeDate, parseAndNormalizeStatus } from '../utils/csvImport';

export default function ImportAttendanceModal({ isOpen, onClose, activeUserId, onImportComplete }) {
  const [step, setStep] = useState('upload'); // 'upload' | 'mapping' | 'importing' | 'result'
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState({ headers: [], rows: [] });
  const [mapping, setMapping] = useState({
    date: '',
    labour_id: '',
    name: '',
    trade: '',
    status: ''
  });
  const [isDragOver, setIsDragOver] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setCsvData({ headers: [], rows: [] });
    setMapping({ date: '', labour_id: '', name: '', trade: '', status: '' });
    setImportResult(null);
    setIsProcessing(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const processFile = (selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv') && selectedFile.type !== 'text/csv' && selectedFile.type !== 'application/vnd.ms-excel') {
      alert('Please upload a valid .csv file.');
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target.result;
      const parsed = parseCSVText(text);

      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        alert('The uploaded CSV file is empty or could not be parsed.');
        return;
      }

      setCsvData(parsed);
      const autoMapping = detectColumnMapping(parsed.headers);
      setMapping(autoMapping);
      setStep('mapping');
    };

    reader.readAsText(selectedFile);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    processFile(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleMappingChange = (field, selectedHeader) => {
    setMapping(prev => ({ ...prev, [field]: selectedHeader }));
  };

  const handleConfirmImport = async () => {
    if (!mapping.date || !mapping.status || (!mapping.labour_id && !mapping.name)) {
      alert('Please select mandatory column mappings: Date, Status, and Labour ID or Name.');
      return;
    }

    setStep('importing');
    setIsProcessing(true);

    try {
      const result = await importAttendanceFromCSV({
        headers: csvData.headers,
        rows: csvData.rows,
        mapping,
        activeUserId
      });

      setImportResult(result);
      setStep('result');
      if (onImportComplete) {
        onImportComplete(result);
      }
    } catch (err) {
      console.error(err);
      setImportResult({
        success: false,
        error: err.message || 'An unexpected error occurred during CSV import.'
      });
      setStep('result');
    } finally {
      setIsProcessing(false);
    }
  };

  // Preview mapped values from first 3 rows
  const previewRows = csvData.rows.slice(0, 3).map((row, rIdx) => {
    const dateIdx = csvData.headers.indexOf(mapping.date);
    const labourIdIdx = mapping.labour_id ? csvData.headers.indexOf(mapping.labour_id) : -1;
    const nameIdx = mapping.name ? csvData.headers.indexOf(mapping.name) : -1;
    const tradeIdx = mapping.trade ? csvData.headers.indexOf(mapping.trade) : -1;
    const statusIdx = csvData.headers.indexOf(mapping.status);

    const rawDate = dateIdx >= 0 ? row[dateIdx] : '-';
    const normDate = dateIdx >= 0 ? parseAndNormalizeDate(rawDate) : null;

    const rawLabourId = labourIdIdx >= 0 ? row[labourIdIdx] : '-';
    const rawName = nameIdx >= 0 ? row[nameIdx] : '-';
    const rawTrade = tradeIdx >= 0 ? row[tradeIdx] : 'General Helper';

    const rawStatus = statusIdx >= 0 ? row[statusIdx] : '-';
    const normStatus = statusIdx >= 0 ? parseAndNormalizeStatus(rawStatus) : 'ABSENT';

    return {
      rowNum: rIdx + 1,
      rawDate,
      normDate: normDate || 'Invalid Date',
      labourId: rawLabourId,
      name: rawName,
      trade: rawTrade,
      rawStatus,
      normStatus
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#FAF7F2] rounded-3xl border border-[#EFEAE1] shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-white border-b border-[#EFEAE1] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#E8F5E9] border border-[#D2EBD5] flex items-center justify-center text-[#1E382B]">
              <Upload className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#1E382B] leading-tight">
                Upload Attendance CSV
              </h3>
              <p className="text-[11px] text-[#5A7A68] font-bold">
                {step === 'upload' && 'Select past attendance CSV file'}
                {step === 'mapping' && 'Verify column mapping'}
                {step === 'importing' && 'Updating attendance database...'}
                {step === 'result' && 'Import complete'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full text-[#5A7A68] hover:bg-[#EFEAE1] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* STEP 1: FILE UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[190px] ${
                  isDragOver
                    ? 'border-[#1E382B] bg-[#E8F5E9]/50 scale-[0.99]'
                    : 'border-[#D2EBD5] bg-white hover:border-[#1E382B] hover:bg-[#FAF7F2]'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,text/csv,application/vnd.ms-excel"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-[#E8F5E9] text-[#1E382B] flex items-center justify-center mb-3 shadow-xs">
                  <FileSpreadsheet className="w-6 h-6 stroke-[2]" />
                </div>
                <h4 className="font-extrabold text-[#1E382B] text-sm mb-1">
                  Click to choose CSV file or drop here
                </h4>
                <p className="text-xs text-[#5A7A68] font-medium max-w-[240px]">
                  Supports exported CSVs & custom spreadsheets (.csv)
                </p>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-[#EFEAE1] space-y-1.5 text-xs text-[#5A7A68]">
                <div className="flex items-center gap-1.5 text-[#1E382B] font-extrabold">
                  <Info className="w-4 h-4 text-[#1E382B]" />
                  <span>CSV Requirements & Format</span>
                </div>
                <p className="font-medium text-[11px] leading-relaxed">
                  Your CSV should have header columns for <b>Date</b>, <b>Labour ID / Name</b>, and <b>Status</b>.
                  Existing records will be updated automatically, and new labourers will be added if not found.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING & PREVIEW */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="p-3 bg-white rounded-2xl border border-[#EFEAE1] flex items-center justify-between">
                <div className="flex items-center space-x-2.5 overflow-hidden">
                  <FileSpreadsheet className="w-5 h-5 text-[#1E382B] flex-shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-extrabold text-[#1E382B] truncate">{file?.name}</p>
                    <p className="text-[10px] text-[#5A7A68] font-semibold">{csvData.rows.length} attendance rows found</p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs text-[#1E382B] hover:underline font-bold flex-shrink-0"
                >
                  Change File
                </button>
              </div>

              {/* Column Mapping Fields */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-[#1E382B] uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Column Mapping</span>
                </h4>

                {/* Date Column */}
                <div className="bg-white p-3 rounded-2xl border border-[#EFEAE1] space-y-1">
                  <div className="flex items-center justify-between text-xs font-extrabold text-[#1E382B]">
                    <label>Date Column <span className="text-rose-500">*</span></label>
                    <span className="text-[10px] text-[#5A7A68] font-normal">(YYYY-MM-DD or DD-MM-YYYY)</span>
                  </div>
                  <select
                    value={mapping.date}
                    onChange={(e) => handleMappingChange('date', e.target.value)}
                    className="w-full py-2 px-3 bg-[#FAF7F2] border border-[#EFEAE1] rounded-xl text-xs font-semibold text-[#1E382B] focus:outline-none focus:border-[#1E382B]"
                  >
                    <option value="">-- Select Column --</option>
                    {csvData.headers.map((h, i) => (
                      <option key={i} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Labour ID Column */}
                <div className="bg-white p-3 rounded-2xl border border-[#EFEAE1] space-y-1">
                  <div className="flex items-center justify-between text-xs font-extrabold text-[#1E382B]">
                    <label>Labour ID Column</label>
                    <span className="text-[10px] text-[#5A7A68] font-normal">(e.g. L001, L002)</span>
                  </div>
                  <select
                    value={mapping.labour_id}
                    onChange={(e) => handleMappingChange('labour_id', e.target.value)}
                    className="w-full py-2 px-3 bg-[#FAF7F2] border border-[#EFEAE1] rounded-xl text-xs font-semibold text-[#1E382B] focus:outline-none focus:border-[#1E382B]"
                  >
                    <option value="">-- None / Select Column --</option>
                    {csvData.headers.map((h, i) => (
                      <option key={i} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Labour Name Column */}
                <div className="bg-white p-3 rounded-2xl border border-[#EFEAE1] space-y-1">
                  <div className="flex items-center justify-between text-xs font-extrabold text-[#1E382B]">
                    <label>Labour Name Column <span className="text-rose-500">*</span></label>
                    <span className="text-[10px] text-[#5A7A68] font-normal">(e.g. Raj Kumar)</span>
                  </div>
                  <select
                    value={mapping.name}
                    onChange={(e) => handleMappingChange('name', e.target.value)}
                    className="w-full py-2 px-3 bg-[#FAF7F2] border border-[#EFEAE1] rounded-xl text-xs font-semibold text-[#1E382B] focus:outline-none focus:border-[#1E382B]"
                  >
                    <option value="">-- None / Select Column --</option>
                    {csvData.headers.map((h, i) => (
                      <option key={i} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Status Column */}
                <div className="bg-white p-3 rounded-2xl border border-[#EFEAE1] space-y-1">
                  <div className="flex items-center justify-between text-xs font-extrabold text-[#1E382B]">
                    <label>Status Column <span className="text-rose-500">*</span></label>
                    <span className="text-[10px] text-[#5A7A68] font-normal">(Present / Absent)</span>
                  </div>
                  <select
                    value={mapping.status}
                    onChange={(e) => handleMappingChange('status', e.target.value)}
                    className="w-full py-2 px-3 bg-[#FAF7F2] border border-[#EFEAE1] rounded-xl text-xs font-semibold text-[#1E382B] focus:outline-none focus:border-[#1E382B]"
                  >
                    <option value="">-- Select Column --</option>
                    {csvData.headers.map((h, i) => (
                      <option key={i} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Trade Column (Optional) */}
                <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#EFEAE1] space-y-1">
                  <div className="flex items-center justify-between text-xs font-extrabold text-[#1E382B]">
                    <label>Trade Column (Optional)</label>
                    <span className="text-[10px] text-[#5A7A68] font-normal">(e.g. Mason, Helper)</span>
                  </div>
                  <select
                    value={mapping.trade}
                    onChange={(e) => handleMappingChange('trade', e.target.value)}
                    className="w-full py-2 px-3 bg-white border border-[#EFEAE1] rounded-xl text-xs font-semibold text-[#1E382B] focus:outline-none focus:border-[#1E382B]"
                  >
                    <option value="">-- None / Select Column --</option>
                    {csvData.headers.map((h, i) => (
                      <option key={i} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-[#1E382B] uppercase tracking-wider flex items-center gap-1">
                  <Table className="w-3.5 h-3.5 text-[#1E382B]" />
                  <span>Data Mapping Preview (First 3 Rows)</span>
                </h4>
                <div className="bg-white rounded-2xl border border-[#EFEAE1] overflow-hidden text-[11px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#FAF7F2] border-b border-[#EFEAE1] text-[#5A7A68] font-bold">
                        <th className="p-2">Date</th>
                        <th className="p-2">Labour</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFEAE1]">
                      {previewRows.map((r, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-mono text-[10px] text-[#1E382B]">
                            {r.normDate}
                          </td>
                          <td className="p-2 font-bold text-[#1E382B]">
                            {r.name !== '-' ? r.name : (r.labourId !== '-' ? r.labourId : 'Unknown')}
                            {r.trade && r.trade !== 'General Helper' && (
                              <span className="text-[9px] text-[#5A7A68] block font-normal">{r.trade}</span>
                            )}
                          </td>
                          <td className="p-2">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${
                              r.normStatus === 'PRESENT'
                                ? 'bg-[#E8F5E9] text-[#1E382B]'
                                : 'bg-[#FFEBEE] text-[#C62828]'
                            }`}>
                              {r.normStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: IMPORTING SPINNER */}
          {step === 'importing' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <RefreshCw className="w-10 h-10 text-[#1E382B] animate-spin" />
              <div>
                <h4 className="font-extrabold text-[#1E382B] text-base">Processing CSV & Updating Database...</h4>
                <p className="text-xs text-[#5A7A68] font-medium mt-1">
                  Matching labours and updating records. Please wait...
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: RESULT SUMMARY */}
          {step === 'result' && importResult && (
            <div className="space-y-4 py-2">
              {importResult.success ? (
                <div className="bg-[#E8F5E9] border border-[#D2EBD5] rounded-3xl p-5 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#1E382B] text-white flex items-center justify-center mx-auto shadow-md">
                    <CheckCircle className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div>
                    <h4 className="font-black text-[#1E382B] text-base">Attendance Updated Successfully!</h4>
                    <p className="text-xs text-[#1E382B]/80 font-semibold mt-1">
                      Processed past CSV log records into IndexedDB.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 text-left">
                    <div className="p-3 bg-white/80 rounded-2xl border border-[#D2EBD5]">
                      <span className="text-[10px] font-bold text-[#5A7A68] uppercase block">Records Updated</span>
                      <span className="text-lg font-black text-[#1E382B]">{importResult.importedCount}</span>
                    </div>
                    <div className="p-3 bg-white/80 rounded-2xl border border-[#D2EBD5]">
                      <span className="text-[10px] font-bold text-[#5A7A68] uppercase block">Dates Covered</span>
                      <span className="text-lg font-black text-[#1E382B]">{importResult.updatedDatesCount}</span>
                    </div>
                    {importResult.createdLaboursCount > 0 && (
                      <div className="col-span-2 p-3 bg-white/80 rounded-2xl border border-[#D2EBD5]">
                        <span className="text-[10px] font-bold text-[#5A7A68] uppercase block">New Labourers Registered</span>
                        <span className="text-base font-black text-[#1E382B]">{importResult.createdLaboursCount} new worker(s) created</span>
                      </div>
                    )}
                  </div>

                  {importResult.skippedCount > 0 && (
                    <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-xs text-amber-900 font-medium">
                      ⚠️ {importResult.skippedCount} row(s) skipped due to missing/invalid date or worker info.
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-5 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-rose-500 text-white flex items-center justify-center mx-auto shadow-md">
                    <AlertCircle className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <div>
                    <h4 className="font-black text-rose-900 text-base">Import Failed</h4>
                    <p className="text-xs text-rose-800 font-semibold mt-1">
                      {importResult.error || 'Failed to update attendance records.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-[#EFEAE1] flex items-center justify-end space-x-2">
          {step === 'upload' && (
            <button
              onClick={handleClose}
              className="px-4 py-2.5 rounded-2xl bg-[#FAF7F2] text-[#5A7A68] hover:bg-[#EFEAE1] text-xs font-extrabold transition-all tactile-btn"
            >
              Cancel
            </button>
          )}

          {step === 'mapping' && (
            <>
              <button
                onClick={handleReset}
                className="px-4 py-2.5 rounded-2xl bg-[#FAF7F2] text-[#5A7A68] hover:bg-[#EFEAE1] text-xs font-extrabold transition-all tactile-btn"
              >
                Back
              </button>
              <button
                onClick={handleConfirmImport}
                className="px-5 py-2.5 rounded-2xl bg-[#1E382B] text-white hover:bg-[#14281E] text-xs font-black shadow-md transition-all tactile-btn flex items-center gap-1.5"
              >
                <span>Confirm & Update Attendance</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 'result' && (
            <button
              onClick={handleClose}
              className="w-full py-3 rounded-2xl bg-[#1E382B] text-white hover:bg-[#14281E] text-xs font-black shadow-md transition-all tactile-btn flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Done</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
