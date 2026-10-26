import React, { useState } from 'react';
import { UserProfile } from '../types/logbook';
import { findEmployeeByNip } from '../utils/employeeData'; // Import database NIP

interface ProfileViewProps {
  profile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
}

export function ProfileView({ profile, onSaveProfile }: ProfileViewProps) {
  const [nipInput, setNipInput] = useState(profile.nip || '');
  const [name, setName] = useState(profile.name || '');
  const [position, setPosition] = useState(profile.position || '');
  const [workUnit, setWorkUnit] = useState(profile.workUnit || '');
  const [message, setMessage] = useState('');

  // Fungsi untuk otomatis mencocokkan NIP
  const handleNipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputNip = e.target.value;
    setNipInput(inputNip);

    // Cari data pegawai berdasarkan NIP
    const employeeData = findEmployeeByNip(inputNip);
    if (employeeData) {
      setName(employeeData.name);
      setPosition(employeeData.position);
      setWorkUnit(employeeData.workUnit);
      setMessage('✔ Data pegawai ditemukan dan diisi otomatis!');
    } else {
      setMessage('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      nip: nipInput,
      name,
      position,
      workUnit,
    });
    alert('Profil berhasil diperbarui!');
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow-md mt-6">
      <h2 className="text-lg font-bold text-stone-900 mb-4">Pengaturan Profil & Login NIP</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Input NIP */}
        <div>
          <label className="block text-sm font-medium text-stone-700">Nomor NIP</label>
          <input 
            type="text" 
            value={nipInput} 
            onChange={handleNipChange}
            placeholder="Masukkan NIP Anda (Cth: 199005052015032002)" 
            className="w-full border border-stone-300 p-2 rounded-lg text-sm"
            required
          />
          {message && <p className="text-xs text-emerald-600 mt-1 font-medium">{message}</p>}
          <p className="text-xs text-stone-500 mt-1">Masukkan NIP untuk mengisi data profil secara otomatis.</p>
        </div>

        {/* Nama Otomatis */}
        <div>
          <label className="block text-sm font-medium text-stone-700">Nama Lengkap</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="w-full border border-stone-300 p-2 rounded-lg text-sm bg-stone-50"
            required
          />
        </div>

        {/* Jabatan Otomatis */}
        <div>
          <label className="block text-sm font-medium text-stone-700">Jabatan</label>
          <input 
            type="text" 
            value={position} 
            onChange={(e) => setPosition(e.target.value)} 
            className="w-full border border-stone-300 p-2 rounded-lg text-sm bg-stone-50"
            required
          />
        </div>

        {/* Unit Kerja Otomatis */}
        <div>
          <label className="block text-sm font-medium text-stone-700">Unit Kerja</label>
          <input 
            type="text" 
            value={workUnit} 
            onChange={(e) => setWorkUnit(e.target.value)} 
            className="w-full border border-stone-300 p-2 rounded-lg text-sm bg-stone-50"
            required
          />
        </div>

        <button 
          type="submit" 
          className="w-full bg-emerald-600 text-white p-2 rounded-lg font-medium hover:bg-emerald-700 transition"
        >
          Simpan Profil
        </button>
      </form>
    </div>
  );
}
