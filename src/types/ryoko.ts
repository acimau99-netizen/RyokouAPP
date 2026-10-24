export type BookingStatus =
  | 'ryokou_booking'   // 1. Pemesanan Baru (Perlu Approval & Kunci Unit)
  | 'ryokou_approved'  // 2. Disetujui (Unit Terkunci, Menunggu Serah Terima)
  | 'ryokou_disewa'    // 3. Sedang Berjalan (Unit dibawa penyewa)
  | 'ryokou_selesai';  // 4. Selesai (Unit telah dikembalikan ke Pool)

export type UnitPositionStatus = 'parkir' | 'servis' | 'disewa';

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
  | '2_minggu'
  | '3_jam'
  | '6_jam'
  | '9_jam'
  | '12_jam'
  | 'paket_promo';

export interface MotorModel {
  id: number;
  namaModel: string;
  kategori: MotorCategory;
  // Multi-Tier Tariffs (D-18)
  harga1Hari: number;
  harga1Minggu: number;
  harga2Minggu: number;
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
  turnaroundBufferMinutes: number; // 90
  operatorName: string;
  auditLogs: AuditLogItem[];
}

export interface RyokoDatabase {
  version: string;
  lastUpdated: string;
  motors: MotorModel[];
  units: PhysicalUnit[];
  tracking: UnitTracking[];
  bookings: BookingRecord[];
  packages: RentalPackage[];
  settings: RentalSettings;
}

export interface OvertimePenaltyResult {
  terlambat: boolean;
  menitTelat: number;
  nominalDenda: number;
  dendaFormat: string;
  keterangan: string;
}
