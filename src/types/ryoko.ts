export type BookingStatus =
  | 'ryokou_booking'    // 1. Pemesanan Baru (Perlu Approval & Kunci Unit)
  | 'ryokou_approved'   // 2. Disetujui (Unit Terkunci, Menunggu Serah Terima)
  | 'ryokou_disewa'     // 3. Sedang Berjalan (Unit dibawa penyewa)
  | 'ryokou_diservis'   // 4. Diservis (Unit sedang dalam perawatan di bengkel)
  | 'ryokou_selesai';   // 5. Selesai (Unit telah dikembalikan ke Pool)

export type UnitPositionStatus = 'parkir' | 'kurir' | 'servis' | 'disewa';

export type PoolLocation = 'malang' | 'batu';

export type MotorCategory = 'Matic' | 'Sport' | 'Trail' | 'Retro';

export type SupportIdType =
  | 'SIM_C'
  | 'KTM'
  | 'NPWP'
  | 'Paspor'
  | 'BPJS'
  | 'Kartu_Pegawai';

export type CustomerTag = 'baru' | 'langganan';

export type TariffCategory = 'harian' | 'jam' | 'paket';

export type DurationOption =
  | '1_hari'
  | '1_minggu'
  | '1_bulan'       // Menggantikan 2_minggu sesuai BR-01 revisi
  | '3_jam'
  | '6_jam'
  | '9_jam'
  | '12_jam'
  | 'paket_promo';

export type ServiceCategory =
  | 'oli_mesin'     // Ganti Oli Mesin
  | 'oli_gardan'    // Ganti Gear Oli / Gardan
  | 'kampas_rem'    // Ganti Kampas Rem Depan / Belakang
  | 'ganti_ban'     // Ganti Ban Depan / Belakang
  | 'cvt_part'      // Servis CVT Part (Roller, V-Belt, Slider)
  | 'aki_baterai'   // Baterai Kering / Aki
  | 'kecelakaan';   // Servis Kecelakaan / Insiden

export interface ServiceRecord {
  id: string;
  unitId: number;
  kodeUnit: string;
  tanggal: string; // YYYY-MM-DD
  kategoriServis: ServiceCategory;
  kmMotor: number;
  biaya: number;
  bengkelMekanik: string;
  keterangan: string;
  createdAt: string;
}

export interface MotorModel {
  id: number;
  namaModel: string;
  kategori: MotorCategory;
  // Multi-Tier Tariffs (D-18 & BR-01 Revisi: 1 Bulan menggantikan 2 Minggu)
  harga1Hari: number;
  harga1Minggu: number;
  harga1Bulan: number;
  harga12Jam: number;
  harga9Jam: number;
  harga6Jam: number;
  harga3Jam: number;
  dendaHarianPerJam: number; // Default Rp 20.000 / jam
  fasilitas: string;
  spesifikasi: string;
  imageUrl?: string;
  isActive: boolean;
}

export interface PhysicalUnit {
  id: number;
  kodeUnit: string; // Unique & permanent (e.g. SCP-01, NMAX-02)
  motorId: number;  // References MotorModel.id
  nomorPlat: string;
  tahun: number;
  warna: string;
  noRangka?: string;
  noMesin?: string;
  poolLokasi: PoolLocation;
  statusServis: 'aktif' | 'servis';
  catatan?: string;
}

export interface UnitTracking {
  unitId: number;
  kodeUnit: string;
  motorId: number;
  statusPosisi: UnitPositionStatus;
  poolParkir: PoolLocation;
  // Kurir details
  namaKurir?: string;
  // Servis details
  namaBengkel?: string;
  kontakBengkel?: string;
  estimasiSelesai?: string;
  // Disewa details
  bookingId?: number;
  noBooking?: string;
  namaPenyewa?: string;
  tenggatKembali?: string;
  // Audit
  catatan?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface UnitExchangeLog {
  id: string;
  waktu: string;
  unitLamaId: number;
  unitLamaKode: string;
  unitBaruId: number;
  unitBaruKode: string;
  alasan: string;
  operator: string;
}

export interface BookingRecord {
  id: number;
  noBooking: string; // RYK-YYYYMMDD-XXX
  status: BookingStatus;
  nama: string;
  nomorWa: string;
  jenisIdPendukung: SupportIdType;
  tandaPelanggan: CustomerTag;
  motorId: number;
  snapshotNamaMotor: string;
  unitId: number | null;
  snapshotKodeUnit: string | null;
  kategoriTarif: TariffCategory;
  pilihanDurasi: DurationOption;
  labelDurasi: string;
  jamTanggalMulai: string;   // YYYY-MM-DDTHH:mm
  jamTanggalSelesai: string; // YYYY-MM-DDTHH:mm
  startEpoch: number;
  endEpoch: number;
  pool: PoolLocation;
  alamatPengantaran: string;
  alamatPenjemputan: string;
  kurirPengantar?: string;
  totalHargaEstimasi: number;
  luarJamOperasional: boolean;
  catatanKhusus?: string;
  // Timestamps
  createdAt: string;
  approvedAt?: string | null;
  serahTerimaAt?: string | null;
  selesaiAt?: string | null;
  actualReturnEpoch?: number | null;
  returnPool?: PoolLocation | null;
  // Overtime penalty (D-27)
  dendaNominal: number;
  dendaKeterangan: string;
  // Unit Exchange History (D-19)
  riwayatTukarUnit?: UnitExchangeLog[];
}

export interface RentalPackage {
  id: number;
  namaPaket: string;
  kategoriMotor: string;
  durasiDeskripsi: string;
  hargaPaket: number;
  fasilitasEkstra: string;
  isActive: boolean;
}

export interface AuditLogItem {
  id: string;
  waktu: string;
  user: string;
  aktivitas: string;
  detail: string;
}

export interface RentalSettings {
  adminWhatsapp: string;
  namaRental: string;
  poolMalangAlamat: string;
  poolBatuAlamat: string;
  jamBuka: string; // "07:00"
  jamTutup: string; // "23:00"
  turnaroundBufferMinutes: number; // 60 menit (BR-04 revisi)
  operatorName: string;
  auditLogs: AuditLogItem[];
}

export type UserRole = 'administrator' | 'admin_custom' | 'operator' | 'kurir';

export interface UserPermissions {
  canViewRevenue: boolean;      // Melihat laporan omset, pendapatan, grafik finansial
  canManageBookings: boolean;   // Buat, approve, serah terima, tukar, selesai, batalkan booking
  canManageTracking: boolean;   // Update status posisi unit (parkir, kurir, servis)
  canManageService: boolean;    // Catat & lihat riwayat servis rutin 7 kategori armada
  canManageFleet: boolean;      // Tambah unit fisik, ubah tarif sewa model motor, diskon massal
  canManageSettings: boolean;   // Ubah pengaturan rental, pool, jam buka, buffer waktu
  canManageUsers: boolean;      // Tambah, edit, aktif/nonaktifkan user & permissions
  canAccessRecovery: boolean;   // Export snapshot ZLCE, recovery data
}

export interface AppUser {
  id: string;
  nama: string;
  username: string;
  role: UserRole;
  phone?: string;
  avatarIcon?: string;
  isActive: boolean;
  customPermissions?: UserPermissions;
  catatan?: string;
  createdAt: string;
}

export interface RyokoDatabase {
  version: string;
  lastUpdated: string;
  motors: MotorModel[];
  units: PhysicalUnit[];
  tracking: UnitTracking[];
  bookings: BookingRecord[];
  packages: RentalPackage[];
  serviceRecords: ServiceRecord[];
  users: AppUser[];
  currentUserId: string;
  settings: RentalSettings;
}

export interface OvertimePenaltyResult {
  terlambat: boolean;
  menitTelat: number;
  nominalDenda: number;
  dendaFormat: string;
  keterangan: string;
}
