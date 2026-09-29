import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getTodayDateString, getActiveUserSession, clearActiveUserSession } from './db/database';

import Header from './components/Header';
import Navigation from './components/Navigation';

import TodayView from './views/TodayView';
import LabourView from './views/LabourView';
import AccountsView from './views/AccountsView';
import HistoryView from './views/HistoryView';
import MonthlySummaryView from './views/MonthlySummaryView';
import LoginView from './views/LoginView';

import AttendanceQuizModal from './components/AttendanceQuizModal';
import LabourModal from './components/LabourModal';
import LabourDetailModal from './components/LabourDetailModal';
import ImportAttendanceModal from './components/ImportAttendanceModal';

// Helper to add/subtract days from a YYYY-MM-DD date string
function getOffsetDateString(baseDateStr, daysOffset) {
  if (!baseDateStr) return getTodayDateString();
  const [y, m, d] = baseDateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + daysOffset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => getActiveUserSession());

  const [activeTab, setActiveTab] = useState('today');

  // Real current date (source of truth for real today)
  const [realTodayDateStr, setRealTodayDateStr] = useState(() => getTodayDateString());

  // Active selected date for viewing & marking attendance (defaults to real today)
  const [selectedDateStr, setSelectedDateStr] = useState(() => getTodayDateString());

  // Automatic midnight date rollover effect
  useEffect(() => {
    const checkRollover = () => {
      const nowReal = getTodayDateString();
      setRealTodayDateStr((prevReal) => {
        if (prevReal !== nowReal) {
          setSelectedDateStr((prevSelected) => {
            if (prevSelected === prevReal) {
              return nowReal;
            }
            return prevSelected;
          });
          return nowReal;
        }
        return prevReal;
      });
    };

    const intervalId = setInterval(checkRollover, 10000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkRollover();
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', checkRollover);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', checkRollover);
    };
  }, []);

  // Modals state
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [quizInitialIndex, setQuizInitialIndex] = useState(0);

  const [isLabourModalOpen, setIsLabourModalOpen] = useState(false);
  const [labourToEdit, setLabourToEdit] = useState(null);

  const [selectedLabourForDetail, setSelectedLabourForDetail] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const activeUserId = currentUser?.id || 'user_demo';

  // Live Queries from Dexie IndexedDB scoped strictly to activeUserId
  const labours = useLiveQuery(
    () => db.labours.where('user_id').equals(activeUserId).toArray(),
    [activeUserId]
  ) || [];

  const selectedAttendances = useLiveQuery(
    async () => {
      const allForDate = await db.attendances.where('date').equals(selectedDateStr).toArray();
      return allForDate.filter(a => a.user_id === activeUserId || (!a.user_id && activeUserId === 'user_demo'));
    },
    [selectedDateStr, activeUserId]
  ) || [];

  // Map selected date's attendance records for fast lookup
  const selectedAttendancesMap = new Map();
  selectedAttendances.forEach((record) => {
    selectedAttendancesMap.set(record.labour_id, record.status);
  });

  // Date Navigation Handlers
  const handlePrevDay = () => {
    setSelectedDateStr((prev) => getOffsetDateString(prev, -1));
  };

  const handleNextDay = () => {
    setSelectedDateStr((prev) => getOffsetDateString(prev, 1));
  };

  const handleGoToToday = () => {
    setSelectedDateStr(realTodayDateStr);
  };

  const handleSelectDate = (dateStr) => {
    if (dateStr) {
      setSelectedDateStr(dateStr);
    }
  };

  const handleSelectDateAndEdit = (dateStr) => {
    if (dateStr) {
      setSelectedDateStr(dateStr);
      setActiveTab('today');
    }
  };

  // Modal Handlers
  const handleOpenQuiz = (index = 0) => {
    setQuizInitialIndex(index);
    setIsQuizOpen(true);
  };

  const handleOpenAddLabour = () => {
    setLabourToEdit(null);
    setIsLabourModalOpen(true);
  };

  const handleOpenEditLabour = (labour) => {
    setLabourToEdit(labour);
    setIsLabourModalOpen(true);
  };

  const handleOpenLabourDetail = (labour) => {
    setSelectedLabourForDetail(labour);
  };

  const handleLogout = () => {
    clearActiveUserSession();
    setCurrentUser(null);
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setActiveTab('today');
  };

  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1E382B] flex flex-col font-sans selection:bg-[#1E382B] selection:text-white">
      {/* Header */}
      <Header
        currentDateStr={selectedDateStr}
        realTodayDateStr={realTodayDateStr}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onDataChanged={() => {}}
      />

      {/* Main View Container with smooth tab transition animation */}
      <main key={activeTab} className="flex-1 max-w-md w-full mx-auto p-4 pb-28 page-view-enter">
        {activeTab === 'today' && (
          <TodayView
            labours={labours}
            todayAttendancesMap={selectedAttendancesMap}
            todayDateStr={selectedDateStr}
            realTodayDateStr={realTodayDateStr}
            currentUser={currentUser}
            onOpenQuiz={handleOpenQuiz}
            onOpenLabourDetail={handleOpenLabourDetail}
            onSwitchTab={setActiveTab}
            onPrevDay={handlePrevDay}
            onNextDay={handleNextDay}
            onGoToToday={handleGoToToday}
            onSelectDate={handleSelectDate}
            onAttendanceUpdated={() => {}}
          />
        )}

        {activeTab === 'labour' && (
          <LabourView
            labours={labours}
            onOpenAddModal={handleOpenAddLabour}
            onOpenEditModal={handleOpenEditLabour}
            onOpenLabourDetail={handleOpenLabourDetail}
          />
        )}

        {activeTab === 'accounts' && (
          <AccountsView
            labours={labours}
            onAttendanceUpdated={() => {}}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            labours={labours}
            realTodayDateStr={realTodayDateStr}
            onSelectDateAndEdit={handleSelectDateAndEdit}
            onOpenImportModal={() => setIsImportModalOpen(true)}
            onAttendanceUpdated={() => {}}
          />
        )}

        {activeTab === 'summary' && (
          <MonthlySummaryView
            labours={labours}
            onOpenLabourDetail={handleOpenLabourDetail}
          />
        )}
      </main>

      {/* Quiz Modal */}
      <AttendanceQuizModal
        isOpen={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
        labours={labours.filter(l => l.active !== false)}
        todayAttendancesMap={selectedAttendancesMap}
        todayDateStr={selectedDateStr}
        initialIndex={quizInitialIndex}
        onAttendanceUpdated={() => {}}
      />

      {/* Add / Edit Labour Modal */}
      <LabourModal
        isOpen={isLabourModalOpen}
        onClose={() => setIsLabourModalOpen(false)}
        labourToEdit={labourToEdit}
        onSaved={() => {}}
      />

      {/* Individual Labour Attendance Detail Modal */}
      <LabourDetailModal
        isOpen={!!selectedLabourForDetail}
        onClose={() => setSelectedLabourForDetail(null)}
        labour={selectedLabourForDetail}
        onUpdated={() => {}}
      />

      {/* Import Attendance CSV Modal */}
      <ImportAttendanceModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        activeUserId={activeUserId}
        onImportComplete={() => {}}
      />

      {/* Bottom Navigation Bar */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
