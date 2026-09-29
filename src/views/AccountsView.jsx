import React, { useState, useEffect } from 'react';
import { Search, IndianRupee, Plus, History, Trash2, Edit2, X, Check, ArrowUpRight, ArrowDownLeft, Wallet, AlertCircle, Calendar } from 'lucide-react';
import { getWorkerAvatar } from '../utils/avatarHelper';
import { db, addPayment, updatePayment, deletePayment, formatDisplayDate, getTodayDateString, calculateStaffEarnings } from '../db/database';

export default function AccountsView({ labours = [], onAttendanceUpdated }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'pending', 'advance', 'settled'
  const [attendances, setAttendances] = useState([]);
  const [payments, setPayments] = useState([]);
  
  // Payment Modal State (for both Add and Edit)
  const [selectedLabourForPayment, setSelectedLabourForPayment] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null); // Payment object if editing
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(getTodayDateString());
  const [paymentNotes, setPaymentNotes] = useState('');
  
  // History Modal State
  const [selectedLabourForHistory, setSelectedLabourForHistory] = useState(null);

  useEffect(() => {
    loadData();
  }, [labours]);

  const loadData = async () => {
    const allAtt = await db.attendances.toArray();
    const allPay = await db.payments.toArray();
    setAttendances(allAtt);
    setPayments(allPay);
  };

  // Sync active history modal payments list automatically when payments change
  useEffect(() => {
    if (selectedLabourForHistory) {
      const updatedWorkerPayments = payments.filter(
        p => p.labour_id === selectedLabourForHistory.labour.id
      );
      setSelectedLabourForHistory(prev => ({
        ...prev,
        payments: updatedWorkerPayments
      }));
    }
  }, [payments]);

  // Compute stats per worker
  const activeLabours = labours.filter(l => l.active !== false);

  const workerAccountStats = activeLabours.map((labour) => {
    const isMonthly = labour.wage_type === 'monthly';
    const dailyWage = labour.daily_wage || 500;
    const monthlySalary = labour.monthly_salary || (dailyWage * 30);
    
    // Count Present Days & Half Days
    const presentRecords = attendances.filter(
      a => a.labour_id === labour.id && a.status === 'PRESENT'
    );
    const halfDayRecords = attendances.filter(
      a => a.labour_id === labour.id && a.status === 'HALF_DAY'
    );
    const presentDays = presentRecords.length;
    const halfDays = halfDayRecords.length;
    
    // Calculate Earned Amount (using calculateStaffEarnings with 0.5x credit for half days)
    const totalEarned = calculateStaffEarnings(labour, presentDays, halfDays, 30);

    // Sum Payments
    const workerPayments = payments.filter(p => p.labour_id === labour.id);
    const totalPaid = workerPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    const balance = totalEarned - totalPaid;

    return {
      labour,
      isMonthly,
      dailyWage,
      monthlySalary,
      presentDays,
      halfDays,
      totalEarned,
      totalPaid,
      balance,
      payments: workerPayments
    };
  });

  // Overall Aggregate Stats
  const totalEarnedOverall = workerAccountStats.reduce((acc, s) => acc + s.totalEarned, 0);
  const totalPaidOverall = workerAccountStats.reduce((acc, s) => acc + s.totalPaid, 0);
  const totalBalanceOverall = totalEarnedOverall - totalPaidOverall;

  // Filtered workers
  const filteredAccounts = workerAccountStats.filter(({ labour, balance }) => {
    const matchesSearch =
      labour.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (labour.trade && labour.trade.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (labour.id && labour.id.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterTab === 'pending') return balance > 0;
    if (filterTab === 'advance') return balance < 0;
    if (filterTab === 'settled') return balance === 0;
    return true;
  });

  const handleOpenAddPayment = (labour) => {
    setEditingPayment(null);
    setSelectedLabourForPayment(labour);
    setPaymentAmount('');
    setPaymentDate(getTodayDateString());
    setPaymentNotes('');
  };

  const handleOpenEditPayment = (payment, labour) => {
    setEditingPayment(payment);
    setSelectedLabourForPayment(labour);
    setPaymentAmount(String(payment.amount));
    setPaymentDate(payment.date || getTodayDateString());
    setPaymentNotes(payment.notes || '');
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedLabourForPayment || !paymentAmount || Number(paymentAmount) <= 0) return;

    if (editingPayment) {
      await updatePayment(editingPayment.id, {
        amount: Number(paymentAmount),
        date: paymentDate,
        notes: paymentNotes
      });
    } else {
      await addPayment({
        labour_id: selectedLabourForPayment.id,
        amount: Number(paymentAmount),
        date: paymentDate,
        notes: paymentNotes
      });
    }

    setSelectedLabourForPayment(null);
    setEditingPayment(null);
    setPaymentAmount('');
    setPaymentNotes('');
    await loadData();
    if (onAttendanceUpdated) onAttendanceUpdated();
  };

  const handleDeletePaymentItem = async (paymentId) => {
    await deletePayment(paymentId);
    await loadData();
    if (onAttendanceUpdated) onAttendanceUpdated();
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-[#1E382B] leading-tight flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#1E382B]" />
            <span>Accounts & Payments</span>
          </h2>
          <p className="text-xs text-[#5A7A68] font-semibold">
            Track daily wages, payouts & balances (₹)
          </p>
        </div>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Total Earned Card */}
        <div className="mockup-card rounded-2xl p-3 border border-[#EFEAE1] space-y-1">
          <span className="text-[10px] font-extrabold text-[#5A7A68] block uppercase tracking-wider">Total Earned</span>
          <span className="text-base font-black text-[#1E382B] block">
            ₹{totalEarnedOverall.toLocaleString('en-IN')}
          </span>
          <span className="text-[9px] text-[#5A7A68] font-medium block">All workers</span>
        </div>

        {/* Total Paid Card */}
        <div className="mockup-card rounded-2xl p-3 border border-[#EFEAE1] space-y-1">
          <span className="text-[10px] font-extrabold text-[#5A7A68] block uppercase tracking-wider">Total Paid</span>
          <span className="text-base font-black text-[#1E382B] block">
            ₹{totalPaidOverall.toLocaleString('en-IN')}
          </span>
          <span className="text-[9px] text-[#5A7A68] font-medium block">Payouts given</span>
        </div>

        {/* Net Balance Card */}
        <div className={`rounded-2xl p-3 border space-y-1 ${
          totalBalanceOverall > 0 
            ? 'bg-[#FFF8E1] border-[#FFE082]' 
            : totalBalanceOverall < 0 
            ? 'bg-[#E3F2FD] border-[#90CAF9]'
            : 'bg-[#E8F5E9] border-[#A5D6A7]'
        }`}>
          <span className="text-[10px] font-extrabold text-[#1E382B] block uppercase tracking-wider">Net Balance</span>
          <span className="text-base font-black text-[#1E382B] block">
            ₹{Math.abs(totalBalanceOverall).toLocaleString('en-IN')}
          </span>
          <span className="text-[9px] font-bold block">
            {totalBalanceOverall > 0 ? 'Dena Baaki' : totalBalanceOverall < 0 ? 'Advance Paid' : 'Settled'}
          </span>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#5A7A68]" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by worker name, trade..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-[#EFEAE1] rounded-2xl text-[#1E382B] placeholder-[#7A8E82] focus:outline-none focus:border-[#1E382B] text-xs font-semibold shadow-xs"
        />
      </div>

      {/* Segmented Filter Pills */}
      <div className="flex bg-[#EFEAE1]/60 p-1 rounded-2xl text-xs font-bold border border-[#EFEAE1]">
        <button
          onClick={() => setFilterTab('all')}
          className={`flex-1 py-2 rounded-xl transition-all ${
            filterTab === 'all' ? 'bg-[#1E382B] text-white shadow-xs font-extrabold' : 'text-[#5A7A68]'
          }`}
        >
          All ({workerAccountStats.length})
        </button>
        <button
          onClick={() => setFilterTab('pending')}
          className={`flex-1 py-2 rounded-xl transition-all ${
            filterTab === 'pending' ? 'bg-[#1E382B] text-white shadow-xs font-extrabold' : 'text-[#5A7A68]'
          }`}
        >
          Dena Baaki ({workerAccountStats.filter(s => s.balance > 0).length})
        </button>
        <button
          onClick={() => setFilterTab('advance')}
          className={`flex-1 py-2 rounded-xl transition-all ${
            filterTab === 'advance' ? 'bg-[#1E382B] text-white shadow-xs font-extrabold' : 'text-[#5A7A68]'
          }`}
        >
          Advance ({workerAccountStats.filter(s => s.balance < 0).length})
        </button>
      </div>

      {/* Worker Accounts List Cards */}
      {filteredAccounts.length === 0 ? (
        <div className="mockup-card rounded-3xl p-8 text-center shadow-xs">
          <h3 className="font-bold text-[#1E382B] text-sm">No Accounts Found</h3>
          <p className="text-xs text-[#5A7A68] mt-1">
            {searchTerm ? `No match for "${searchTerm}"` : 'No workers registered yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAccounts.map(({ labour, isMonthly, dailyWage, monthlySalary, presentDays, halfDays, totalEarned, totalPaid, balance, payments: workerPayList }) => {
            const initial = labour.name ? labour.name.charAt(0).toUpperCase() : 'W';
            const avatarImg = getWorkerAvatar(labour.name, labour.trade);

            return (
              <div
                key={labour.id}
                className="mockup-card rounded-[24px] p-4 border border-[#EFEAE1] hover:border-[#1E382B]/30 transition-all space-y-3"
              >
                {/* Header Row */}
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
                      <h3 className="font-extrabold text-[#1E382B] text-sm leading-tight">
                        {labour.name}
                      </h3>
                      <p className="text-xs text-[#5A7A68] font-medium flex items-center gap-1.5">
                        <span>{labour.trade || 'Staff'}</span>
                        <span>•</span>
                        <span className="font-bold text-[#1E382B] bg-[#EFEAE1]/80 px-2 py-0.5 rounded-lg text-[11px]">
                          {isMonthly ? `₹${monthlySalary.toLocaleString('en-IN')}/mo` : `₹${dailyWage}/day`}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Balance Badge */}
                  <div className="text-right">
                    {balance > 0 ? (
                      <div>
                        <span className="text-[10px] text-amber-700 font-extrabold block">DENA BAAKI</span>
                        <span className="text-sm font-black text-amber-900">
                          ₹{balance.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ) : balance < 0 ? (
                      <div>
                        <span className="text-[10px] text-blue-700 font-extrabold block">ADVANCE PAID</span>
                        <span className="text-sm font-black text-blue-900">
                          ₹{Math.abs(balance).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-[10px] text-emerald-700 font-extrabold block">SETTLED</span>
                        <span className="text-sm font-black text-emerald-900">₹0</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Summary Breakdown */}
                <div className="bg-[#FAF7F2] rounded-2xl p-2.5 border border-[#EFEAE1] grid grid-cols-4 gap-1.5 text-center text-xs font-semibold">
                  <div>
                    <span className="text-[9px] text-[#5A7A68] block">Present</span>
                    <span className="font-extrabold text-[#1E382B]">{presentDays}d</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-amber-800 block">Half Day</span>
                    <span className="font-extrabold text-amber-900">{halfDays || 0}d</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#5A7A68] block">Earned</span>
                    <span className="font-extrabold text-[#1E382B]">₹{totalEarned.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#5A7A68] block">Paid</span>
                    <span className="font-extrabold text-emerald-800">₹{totalPaid.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Action Buttons: Record Payment & View History */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleOpenAddPayment(labour)}
                    className="flex-1 py-2 px-3 bg-[#1E382B] hover:bg-[#14281E] text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs tactile-btn"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Pay / Deduct</span>
                  </button>

                  <button
                    onClick={() => setSelectedLabourForHistory({ labour, payments: workerPayList })}
                    className="py-2 px-3 bg-white border border-[#EFEAE1] text-[#1E382B] hover:bg-[#FAF7F2] font-bold rounded-xl text-xs flex items-center justify-center gap-1 tactile-btn"
                  >
                    <History className="w-3.5 h-3.5 text-[#5A7A68]" />
                    <span>History ({workerPayList.length})</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RECORD / EDIT PAYMENT MODAL */}
      {selectedLabourForPayment && (
        <div className="fixed inset-0 z-50 bg-[#1E382B]/80 backdrop-blur-xl flex items-center justify-center p-4 modal-backdrop-animate">
          <div className="bg-[#FAF7F2] border border-[#EFEAE1] text-[#1E382B] rounded-[28px] w-full max-w-md p-6 shadow-2xl modal-content-animate">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEAE1]">
              <div>
                <h3 className="text-base font-black text-[#1E382B]">
                  {editingPayment ? 'Edit Payment Entry' : `Record Payment: ${selectedLabourForPayment.name}`}
                </h3>
                <p className="text-xs text-[#5A7A68] font-medium">
                  {editingPayment ? `Worker: ${selectedLabourForPayment.name}` : `Daily Wage: ₹${selectedLabourForPayment.daily_wage || 500}/day`}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedLabourForPayment(null);
                  setEditingPayment(null);
                }}
                className="p-1.5 rounded-full text-[#5A7A68] hover:text-[#1E382B] hover:bg-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="mt-4 space-y-4">
              {/* Payment Amount */}
              <div>
                <label className="block text-xs font-extrabold text-[#5A7A68] uppercase tracking-wider mb-1">
                  Amount Given (₹) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-[#1E382B] font-black text-sm">₹</span>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="e.g. 1000"
                    min="1"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-[#EFEAE1] rounded-2xl text-[#1E382B] placeholder-[#7A8E82] focus:outline-none focus:border-[#1E382B] text-base font-bold shadow-xs"
                    autoFocus
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-extrabold text-[#5A7A68] uppercase tracking-wider mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-[#EFEAE1] rounded-2xl text-[#1E382B] focus:outline-none focus:border-[#1E382B] text-xs font-semibold shadow-xs"
                />
              </div>

              {/* Remarks / Notes */}
              <div>
                <label className="block text-xs font-extrabold text-[#5A7A68] uppercase tracking-wider mb-1">
                  Remarks / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Weekly payout, Advance"
                  className="w-full px-4 py-3 bg-white border border-[#EFEAE1] rounded-2xl text-[#1E382B] placeholder-[#7A8E82] focus:outline-none focus:border-[#1E382B] text-xs font-semibold shadow-xs"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 px-4 bg-[#1E382B] hover:bg-[#14281E] text-white font-black rounded-2xl text-sm shadow-md shadow-[#1E382B]/20 tactile-btn"
                >
                  {editingPayment ? 'Update Payment Entry' : 'Save Payment Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WORKER PAYMENT HISTORY MODAL */}
      {selectedLabourForHistory && (
        <div className="fixed inset-0 z-50 bg-[#1E382B]/80 backdrop-blur-xl flex items-center justify-center p-4 modal-backdrop-animate">
          <div className="bg-[#FAF7F2] border border-[#EFEAE1] text-[#1E382B] rounded-[28px] w-full max-w-md p-6 shadow-2xl modal-content-animate">
            <div className="flex items-center justify-between pb-3 border-b border-[#EFEAE1]">
              <div>
                <h3 className="text-base font-black text-[#1E382B]">
                  Payment History: {selectedLabourForHistory.labour.name}
                </h3>
                <p className="text-xs text-[#5A7A68] font-medium">
                  {selectedLabourForHistory.payments.length} payment entries recorded
                </p>
              </div>
              <button
                onClick={() => setSelectedLabourForHistory(null)}
                className="p-1.5 rounded-full text-[#5A7A68] hover:text-[#1E382B] hover:bg-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 max-h-72 overflow-y-auto space-y-2 pr-1">
              {selectedLabourForHistory.payments.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#5A7A68] font-medium">
                  No payments recorded for this worker yet.
                </div>
              ) : (
                selectedLabourForHistory.payments.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-white border border-[#EFEAE1] rounded-2xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-[#1E382B] text-sm">
                          ₹{Number(p.amount).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-[#5A7A68]">
                          {formatDisplayDate(p.date, 'short')}
                        </span>
                      </div>
                      {p.notes && (
                        <p className="text-[11px] text-[#5A7A68] font-medium mt-0.5">
                          {p.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditPayment(p, selectedLabourForHistory.labour)}
                        className="p-1.5 rounded-xl hover:bg-amber-50 text-amber-700 border border-amber-200"
                        title="Edit payment"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeletePaymentItem(p.id)}
                        className="p-1.5 rounded-xl hover:bg-rose-50 text-rose-600 border border-rose-100"
                        title="Delete payment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-[#EFEAE1] mt-4">
              <button
                onClick={() => setSelectedLabourForHistory(null)}
                className="w-full py-3 px-4 bg-white border border-[#EFEAE1] text-[#1E382B] font-extrabold rounded-2xl text-xs hover:bg-[#FAF7F2]"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
