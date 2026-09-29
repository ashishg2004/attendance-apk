import React, { useState } from 'react';
import { Plus, Search, SlidersHorizontal, ChevronLeft, Calendar, Phone, MoreVertical, Edit2 } from 'lucide-react';
import { getWorkerAvatar } from '../utils/avatarHelper';

export default function LabourView({
  labours = [],
  onOpenAddModal,
  onOpenEditModal,
  onOpenLabourDetail
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('active');

  const filteredLabours = labours.filter((labour) => {
    const matchesSearch =
      labour.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (labour.trade && labour.trade.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (labour.phone && labour.phone.includes(searchTerm)) ||
      (labour.id && labour.id.toLowerCase().includes(searchTerm.toLowerCase()));

    if (filterTab === 'active') return matchesSearch && labour.active !== false;
    if (filterTab === 'deactivated') return matchesSearch && labour.active === false;
    return matchesSearch;
  });

  const activeCount = labours.filter(l => l.active !== false).length;
  const deactivatedCount = labours.filter(l => l.active === false).length;

  return (
    <div className="space-y-4 pb-28">
      {/* Top Header Bar Matching Mockup Screen 2 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-white border border-[#EFEAE1] flex items-center justify-center text-[#1E382B]">
            <ChevronLeft className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#1E382B] leading-tight">Staff Directory</h2>
            <p className="text-xs text-[#5A7A68] font-semibold">
              Total {labours.length} staff members
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAddModal}
          className="py-2 px-4 bg-[#1E382B] hover:bg-[#14281E] text-white font-extrabold rounded-2xl text-xs flex items-center gap-1.5 shadow-md shadow-[#1E382B]/20 tactile-btn"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add</span>
        </button>
      </div>

      {/* Search Input Bar with Filter Icon */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#5A7A68]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, trade, or ID..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-[#EFEAE1] rounded-2xl text-[#1E382B] placeholder-[#7A8E82] focus:outline-none focus:border-[#1E382B] text-xs font-semibold shadow-xs"
          />
        </div>
        <button className="p-3 rounded-2xl bg-white border border-[#EFEAE1] text-[#1E382B] shadow-xs hover:bg-[#FAF7F2] tactile-btn">
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Segmented Tab Filter Pills Matching Mockup */}
      <div className="flex bg-[#EFEAE1]/60 p-1 rounded-2xl text-xs font-bold border border-[#EFEAE1]">
        <button
          onClick={() => setFilterTab('active')}
          className={`flex-1 py-2 rounded-xl transition-all ${
            filterTab === 'active' ? 'bg-[#1E382B] text-white shadow-xs font-extrabold' : 'text-[#5A7A68]'
          }`}
        >
          Active ({activeCount})
        </button>
        <button
          onClick={() => setFilterTab('deactivated')}
          className={`flex-1 py-2 rounded-xl transition-all ${
            filterTab === 'deactivated' ? 'bg-[#1E382B] text-white shadow-xs font-extrabold' : 'text-[#5A7A68]'
          }`}
        >
          Deactivated ({deactivatedCount})
        </button>
        <button
          onClick={() => setFilterTab('all')}
          className={`flex-1 py-2 rounded-xl transition-all ${
            filterTab === 'all' ? 'bg-[#1E382B] text-white shadow-xs font-extrabold' : 'text-[#5A7A68]'
          }`}
        >
          All ({labours.length})
        </button>
      </div>

      {/* Labour List Cards */}
      {filteredLabours.length === 0 ? (
        <div className="mockup-card rounded-3xl p-8 text-center shadow-xs">
          <h3 className="font-bold text-[#1E382B] text-sm">No Staff Found</h3>
          <p className="text-xs text-[#5A7A68] mt-1">
            {searchTerm ? `No match for "${searchTerm}"` : 'Tap "+ Add" to create your first staff member.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLabours.map((labour) => {
            const initial = labour.name ? labour.name.charAt(0).toUpperCase() : 'W';
            const joinedDateDisplay = labour.created_at ? new Date(labour.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '10 Sep 2026';
            const avatarImg = getWorkerAvatar(labour.name, labour.trade);

            return (
              <div
                key={labour.id}
                className="mockup-card rounded-[24px] p-4 border border-[#EFEAE1] hover:border-[#1E382B]/30 transition-all space-y-2.5"
              >
                {/* Card Top Header */}
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
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-[#1E382B] text-sm leading-tight">
                          {labour.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E8F5E9] text-[#1E382B] border border-[#D2EBD5] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1E382B]" />
                          Active
                        </span>
                      </div>
                      <p className="text-xs text-[#5A7A68] font-medium">
                        {labour.trade || 'Mason'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenEditModal(labour)}
                    className="p-1.5 rounded-xl hover:bg-[#FAF7F2] text-[#5A7A68] hover:text-[#1E382B]"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                {/* Sub-details line matching mockup */}
                <div className="pt-2 border-t border-[#EFEAE1] text-xs text-[#5A7A68] space-y-1 font-medium">
                  <div className="flex items-center justify-between">
                    <span>ID: {labour.id || 'L001'}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#5A7A68]" />
                      Joined: {joinedDateDisplay}
                    </span>
                    {labour.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-[#5A7A68]" />
                        {labour.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
