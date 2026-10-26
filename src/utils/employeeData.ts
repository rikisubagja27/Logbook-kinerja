// src/utils/employeeData.ts

export interface EmployeeProfile {
  nip: string;
  name: string;
  position: string;
  workUnit: string;
}

// Daftar database pegawai sementara (bisa Anda tambahkan sesuai kebutuhan)
export const EMPLOYEE_DATABASE: EmployeeProfile[] = [
  {
    nip: "199303252025211136",
    name: "Haris Akbar, S.P.",
    position: "Penata Layanan Operasional",
    workUnit: "Pusat Pelindungan Varietas Tanaman dan Perizinan Pertanian (PVTPP)"
  },
  {
    nip: "199212032025211060",
    name: "Abdul Rohim",
    position: "Operator Layanan Operasional",
    workUnit: "Kebun Pemeriksaan Substantif Manoko, Lembang"
  },
  // Tambahkan NIP pegawai lainnya di sini sesuai kebutuhan
];

// Fungsi untuk mencari data berdasarkan NIP
export function findEmployeeByNip(nip: string): EmployeeProfile | null {
  const found = EMPLOYEE_DATABASE.find(emp => emp.nip.trim() === nip.trim());
  return found || null;
}
