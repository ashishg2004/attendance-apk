import React, { useState, useEffect } from 'react';
import { X, User, Phone, Briefcase, Trash2, Power, IndianRupee, Calendar, Sparkles } from 'lucide-react';
import { addLabour, updateLabour, toggleLabourActive, deleteLabour } from '../db/database';

const ROLE_PRESETS = [
  'Housekeeping',
  'Front Desk',
  'Chef / Cook',
  'Waiter',
  'Room Service',
  'Manager',
  'Security',
  'Maintenance',
  'Mason',
  'Helper',
  'Carpenter',
  'Plumber',
  'Electrician',
  'Painter',
  'Supervisor'
];

export default function LabourModal({ isOpen, onClose, labourToEdit = null, onSaved }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [trade, setTrade] = useState('Housekeeping');
  const [customTrade, setCustomTrade] = useState('');
  const [wageType, setWageType] = useState('daily'); // 'daily' | 'monthly'
  const [salaryAmount, setSalaryAmount] = useState('500');
  const [error, setError] = useState('');

  useEffect(() => {
    if (labourToEdit) {
      setName(labourToEdit.name || '');
      setPhone(labourToEdit.phone || '');
      const currentWageType = labourToEdit.wage_type || 'daily';
      setWageType(currentWageType);

      if (currentWageType === 'monthly') {
        setSalaryAmount(labourToEdit.monthly_salary ? String(labourToEdit.monthly_salary) : '15000');
      } else {
        setSalaryAmount(labourToEdit.daily_wage ? String(labourToEdit.daily_wage) : '500');
      }

      if (ROLE_PRESETS.includes(labourToEdit.trade)) {
        setTrade(labourToEdit.trade);
        setCustomTrade('');
      } else {
        setTrade('Other');
        setCustomTrade(labourToEdit.trade || '');
      }
    } else {
      setName('');
      setPhone('');
      setWageType('daily');
      setSalaryAmount('500');
      setTrade('Housekeeping');
      setCustomTrade('');
    }
    setError('');
  }, [isOpen, labourToEdit]);

  if (!isOpen) return null;

  const handleWageTypeChange = (newType) => {
    setWageType(newType);
    if (newType === 'monthly') {
      if (salaryAmount === '500' || !salaryAmount) setSalaryAmount('15000');
    } else {
      if (salaryAmount === '15000' || !salaryAmount) setSalaryAmount('500');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Staff Name is required');
      return;
    }

    const finalTrade = trade === 'Other' ? (customTrade.trim() || 'General Staff') : trade;
    const amountNum = parseFloat(salaryAmount) || 0;

    const dailyWageVal = wageType === 'daily' ? amountNum : Math.round(amountNum / 30);
    const monthlySalaryVal = wageType === 'monthly' ? amountNum : Math.round(amountNum * 30);

    if (labourToEdit) {
      await updateLabour(labourToEdit.id, {
        name: name.trim(),
        phone: phone.trim(),
        trade: finalTrade,
        wage_type: wageType,
        daily_wage: dailyWageVal,
        monthly_salary: monthlySalaryVal
      });
    } else {
      await addLabour({
        name: name.trim(),
        phone: phone.trim(),
        trade: finalTrade,
        wage_type: wageType,
        daily_wage: dailyWageVal,
        monthly_salary: monthlySalaryVal
      });
    }

    if (onSaved) onSaved();
    onClose();
  };

  const handleToggleActive = async () => {
    if (!labourToEdit) return;
    const actionStr = labourToEdit.active ? 'deactivate' : 'activate';
    if (confirm(`Are you sure you want to ${actionStr} ${labourToEdit.name}?`)) {
      await toggleLabourActive(labourToEdit.id, labourToEdit.active);
      if (onSaved) onSaved();
      onClose();
    }
  };

  const handleDeletePermanent = async () => {
    if (!labourToEdit) return;
    if (confirm(`Are you sure you want to PERMANENTLY DELETE ${labourToEdit.name}?\n\nThis will remove their profile and all attendance records.`)) {
      await deleteLabour(labourToEdit.id);
      if (onSaved) onSaved();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1E382B]/80 backdrop-blur-xl flex items-center justify-center p-4 modal-backdrop-animate">
      <div className="bg-[#FAF7F2] border border-[#EFEAE1] text-[#1E382B] rounded-[28px] w-full max-w-md p-6 shadow-2xl modal-content-animate max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[#EFEAE1]">
          <h2 className="text-lg font-black tracking-tight text-[#1E382B]">
            {labourToEdit ? 'Edit Staff Details' : 'Add New Staff Member'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#5A7A68] hover:text-[#1E382B] hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-[#FFEBEE] border border-[#FFCDD2] text-[#C62828] text-xs font-bold">
              {error}
            </div>
          )}

          {/* Staff Name */}
          <div>
            <label className="block text-xs font-extrabold text-[#5A7A68] uppercase tracking-wider mb-1.5">
              Staff Name <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-3.5 text-[#5A7A68]" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Sharma"
                className="w-full pl-10 pr-4 py-3 bg-white border border-[#EFEAE1] rounded-2xl text-[#1E382B] placeholder-[#7A8E82] focus:outline-none focus:border-[#1E382B] text-sm font-semibold shadow-xs"
                autoFocus
              />
            </div>
          </div>

          {/* Department / Role */}
          <div>
            <label className="block text-xs font-extrabold text-[#5A7A68] uppercase tracking-wider mb-1.5">
              Department / Role
            </label>
            <div className="relative">
              <Briefcase className="w-4 h-4 absolute left-3.5 top-3.5 text-[#5A7A68]" />
              <select
                value={trade}
                onChange={(e) => setTrade(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-[#EFEAE1] rounded-2xl text-[#1E382B] focus:outline-none focus:border-[#1E382B] text-sm font-semibold appearance-none cursor-pointer shadow-xs"
              >
                {ROLE_PRESETS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                <option value="Other">Other...</option>
              </select>
            </div>
          </div>

          {trade === 'Other' && (
            <div>
              <input
                type="text"
                value={customTrade}
                onChange={(e) => setCustomTrade(e.target.value)}
                placeholder="Enter custom role..."
                className="w-full px-4 py-2.5 bg-white border border-[#EFEAE1] rounded-2xl text-[#1E382B] placeholder-[#7A8E82] focus:outline-none focus:border-[#1E382B] text-xs font-semibold shadow-xs"
              />
            </div>
          )}

          {/* Phone Number (Optional) */}
          <div>
            <label className="block text-xs font-extrabold text-[#5A7A68] uppercase tracking-wider mb-1.5">
              Phone Number (Optional)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-[#5A7A68]" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full pl-10 pr-4 py-3 bg-white border border-[#EFEAE1] rounded-2xl text-[#1E382B] placeholder-[#7A8E82] focus:outline-none focus:border-[#1E382B] text-sm font-semibold shadow-xs"
              />
            </div>
          </div>

          {/* Salary Basis Selector (Daily vs Monthly) */}
          <div>
            <label className="block text-xs font-extrabold text-[#5A7A68] uppercase tracking-wider mb-1.5">
              Salary Basis <span className="text-rose-600">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-white border border-[#EFEAE1] rounded-2xl">
              <button
                type="button"
                onClick={() => handleWageTypeChange('daily')}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  wageType === 'daily'
                    ? 'bg-[#1E382B] text-white shadow-xs'
                    : 'text-[#5A7A68] hover:text-[#1E382B]'
                }`}
              >
                <span>Daily Wage</span>
                <span className="text-[10px] opacity-80">(₹/day)</span>
              </button>
              <button
                type="button"
                onClick={() => handleWageTypeChange('monthly')}
                className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  wageType === 'monthly'
                    ? 'bg-[#1E382B] text-white shadow-xs'
                    : 'text-[#5A7A68] hover:text-[#1E382B]'
                }`}
              >
                <span>Monthly Salary</span>
                <span className="text-[10px] opacity-80">(₹/month)</span>
              </button>
            </div>
          </div>

          {/* Salary Amount Input */}
          <div>
            <label className="block text-xs font-extrabold text-[#5A7A68] uppercase tracking-wider mb-1.5">
              {wageType === 'daily' ? 'Daily Wage (₹ / day)' : 'Monthly Salary (₹ / month)'} <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-[#1E382B] font-black text-sm">₹</span>
              <input
                type="number"
                value={salaryAmount}
                onChange={(e) => setSalaryAmount(e.target.value)}
                placeholder={wageType === 'daily' ? 'e.g. 500' : 'e.g. 15000'}
                min="0"
                step={wageType === 'daily' ? '50' : '500'}
                className="w-full pl-10 pr-4 py-3 bg-white border border-[#EFEAE1] rounded-2xl text-[#1E382B] placeholder-[#7A8E82] focus:outline-none focus:border-[#1E382B] text-sm font-semibold shadow-xs"
              />
            </div>
            <p className="text-[11px] text-[#5A7A68] font-medium mt-1">
              {wageType === 'daily'
                ? 'Calculated per day present (e.g. 10 days = ₹' + (parseFloat(salaryAmount || 0) * 10).toLocaleString() + ')'
                : 'Pro-rated per month present days (e.g. 30 days = ₹' + parseFloat(salaryAmount || 0).toLocaleString() + ')'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex flex-col gap-2.5">
            <div className="flex items-center gap-3">
              {labourToEdit && (
                <button
                  type="button"
                  onClick={handleToggleActive}
                  className={`py-3 px-4 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 border transition-colors ${
                    labourToEdit.active
                      ? 'bg-[#E8F5E9] border-[#D2EBD5] text-[#1E382B] hover:bg-[#D2EBD5]'
                      : 'bg-[#FFEBEE] border-[#FFCDD2] text-[#C62828] hover:bg-[#FFCDD2]'
                  }`}
                >
                  <Power className="w-4 h-4" />
                  <span>{labourToEdit.active ? 'Deactivate' : 'Activate'}</span>
                </button>
              )}

              <button
                type="submit"
                className="flex-1 py-3 px-4 bg-[#1E382B] hover:bg-[#14281E] text-white font-extrabold rounded-2xl text-sm shadow-md shadow-[#1E382B]/20 tactile-btn transition-all"
              >
                {labourToEdit ? 'Save Changes' : 'Add Staff Member'}
              </button>
            </div>

            {labourToEdit && (
              <button
                type="button"
                onClick={handleDeletePermanent}
                className="w-full py-2.5 px-4 bg-[#FFEBEE] hover:bg-[#FFCDD2] border border-[#FFCDD2] text-[#C62828] font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Staff Member Permanently</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
