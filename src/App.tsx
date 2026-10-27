import React, { useState, useEffect } from 'react';
import { 
  LogbookEntry, 
  UserProfile 
} from './types/logbook';
import { 
  loadLogbookEntries, 
  saveLogbookEntries, 
  loadUserProfile, 
  saveUserProfile 
} from './utils/storage';
import { Header } from './components/Header';
import { LogbookForm } from './components/LogbookForm';
import { LogbookList } from './components/LogbookList';
import { OfficialReportView } from './components/OfficialReportView';
import { EPersonalView } from './components/EPersonalView';
import { ProfileView } from './components/ProfileView';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  const [activeTab, setActiveTab] = useState<'form' | 'list' | 'report' | 'epersonal' | 'profile'>('form');
  const [entries, setEntries] = useState<LogbookEntry[]>(() => loadLogbookEntries());
  const [profile, setProfile] = useState<UserProfile>(() => loadUserProfile());
  const [editingEntry, setEditingEntry] = useState<LogbookEntry | null>(null);

  // Sync entries to localStorage
  const handleSaveEntry = (newOrUpdatedEntry: LogbookEntry) => {
    setEntries((prev) => {
      const exists = prev.some((e) => e.id === newOrUpdatedEntry.id);
      let updated: LogbookEntry[];
      if (exists) {
        updated = prev.map((e) => (e.id === newOrUpdatedEntry.id ? newOrUpdatedEntry : e));
      } else {
        updated = [newOrUpdatedEntry, ...prev];
      }
      saveLogbookEntries(updated);
      return updated;
    });
    setEditingEntry(null);
  };

  const handleDeleteEntry = (id: string) => {
    setEntries((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveLogbookEntries(updated);
      return updated;
    });
    if (editingEntry?.id === id) {
      setEditingEntry(null);
    }
  };

  const handleEditEntry = (entry: LogbookEntry) => {
    setEditingEntry(entry);
    setActiveTab('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImportBackup = (imported: LogbookEntry[]) => {
    setEntries(imported);
    saveLogbookEntries(imported);
  };

  const handleSaveProfile = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    saveUserProfile(updatedProfile);
  };

  return (
    <div className="min-h-screen app-bg-gradient flex flex-col font-sans text-stone-900 selection:bg-emerald-400 selection:text-stone-950">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab !== 'form') setEditingEntry(null);
          setActiveTab(tab);
        }}
        profile={profile}
      />

      {/* Offline Status Alert */}
      <OfflineIndicator />

      {/* Main Content Area */}
      <main className="flex-1 pb-16 space-y-4">
        {/* PWA Standalone Banner (auto-hides when installed in standalone mode) */}
        <div className="max-w-7xl mx-auto px-4 pt-3 sm:px-6">
          <PWAInstallButton variant="banner" />
        </div>

        {activeTab === 'form' && (
          <LogbookForm
            onSaveEntry={handleSaveEntry}
            onCancelEdit={() => setEditingEntry(null)}
            editingEntry={editingEntry}
            onNavigateToReport={() => setActiveTab('report')}
          />
        )}

        {activeTab === 'list' && (
          <LogbookList
            entries={entries}
            onEditEntry={handleEditEntry}
            onDeleteEntry={handleDeleteEntry}
            onAddNew={() => {
              setEditingEntry(null);
              setActiveTab('form');
            }}
            onImportBackup={handleImportBackup}
          />
        )}

        {activeTab === 'report' && (
          <OfficialReportView
            entries={entries}
            profile={profile}
          />
        )}

        {activeTab === 'epersonal' && (
          <EPersonalView
            currentProfile={profile}
            onSelectProfile={handleSaveProfile}
            onNavigateToProfile={() => setActiveTab('profile')}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            profile={profile}
            onSaveProfile={handleSaveProfile}
            onNavigateToEpersonal={() => setActiveTab('epersonal')}
          />
        )}
      </main>

      {/* Quiet Government Footer */}
      <footer className="bg-stone-950/85 backdrop-blur-md border-t border-emerald-500/20 py-6 px-4 sm:px-6 text-center text-xs text-stone-400 no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-emerald-300">Logbook Kinerja Kps 1 manoko</span>
            <span aria-hidden="true" className="text-stone-600">·</span>
            <span className="text-stone-300">Pusat Pelindungan Varietas Tanaman dan Perizinan Pertanian (PVTPP)</span>
          </div>
          <div className="text-stone-400">
            Kementerian Pertanian Republik Indonesia · Kebun Pemeriksaan Substantif Manoko, Lembang
          </div>
        </div>
      </footer>
    </div>
  );
}
