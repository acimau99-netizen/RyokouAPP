import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  RyokoDatabase,
  BookingRecord,
  UnitTracking,
  MotorModel,
  PhysicalUnit,
  RentalSettings,
  PoolLocation,
  ServiceRecord,
  AppUser,
} from './types/ryoko';
import {
  loadDatabase,
  saveDatabase,
  resetDatabaseToDefault,
  appendAuditLog,
} from './services/storageService';
import { AndroidStatusBar } from './components/AndroidStatusBar';
import { AndroidTopBar } from './components/AndroidTopBar';
import { AndroidBottomNav, ActiveNavTab } from './components/AndroidBottomNav';
import { DashboardView } from './components/DashboardView';
import { BookingsView } from './components/BookingsView';
import { TrackingView } from './components/TrackingView';
import { ServiceLogsView } from './components/ServiceLogsView';
import { FleetView } from './components/FleetView';
import { SettingsView } from './components/SettingsView';
import { UserManagementView } from './components/UserManagementView';
import { CourierDashboardView } from './components/CourierDashboardView';
import { RecoveryTab } from './components/RecoveryTab';
import { parseSessionStateMarkdown } from './utils/markdownParser';
import { ParsedSessionState } from './types/zlce';
import sessionStateActual from '../SESSION_STATE.md?raw';
import { NewBookingModal } from './components/NewBookingModal';
import {
  ApproveUnitModal,
  SerahTerimaModal,
  TukarUnitModal,
  SelesaiBookingModal,
  UpdateTrackingModal,
} from './components/ActionModals';
import { PWAInstallModal } from './components/PWAInstallModal';

export const App: React.FC = () => {
  // Database State in LocalStorage
  const [db, setDb] = useState<RyokoDatabase>(() => loadDatabase());

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('dashboard');

  // Device view mode: Phone viewport simulation vs full width
  const [isMobileDeviceView, setIsMobileDeviceView] = useState<boolean>(() => {
    // Default to phone view on desktop for mobile apk feel, or adapt
    return window.innerWidth >= 1024;
  });

  // Modal States
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [selectedApproveBooking, setSelectedApproveBooking] = useState<BookingRecord | null>(null);
  const [selectedHandoverBooking, setSelectedHandoverBooking] = useState<BookingRecord | null>(null);
  const [selectedExchangeBooking, setSelectedExchangeBooking] = useState<BookingRecord | null>(null);
  const [selectedFinishBooking, setSelectedFinishBooking] = useState<BookingRecord | null>(null);
  const [selectedUpdateTracking, setSelectedUpdateTracking] = useState<UnitTracking | null>(null);

  // Parsed ZLCE Session State for Recovery Wizard
  const recoverySessionState: ParsedSessionState = useMemo(() => {
    try {
      return parseSessionStateMarkdown(sessionStateActual);
    } catch {
      return {
        context: {
          projectName: 'RyokoRent Android APK',
          stack: 'React 19 / TypeScript / Vite 8 / Tailwind CSS v4',
          mode: 'LITE' as const,
          fileWriteCapability: 'YA',
          execCapability: 'YA',
        },
        status: {
          timestampAudit: new Date().toISOString(),
          gitBranch: 'main',
          lastDoneTask: 'TASK-001',
          activeTask: 'TASK-002',
          activeTaskStatus: 'IN_PROGRESS' as const,
          nextTask: 'TASK-003',
        },
        tasks: [],
        wal: {
          task: 'TASK-002',
          currentStep: 'Implementasi Panel Servis & Kurir',
          plannedFiles: 'src/components/ServiceLogsView.tsx',
          completedSoFar: 'Skema disiapkan',
          nextStepExact: 'Verifikasi ZLCE Recovery',
          verificationCommand: 'python3 scripts/zlce/zlce-check.py .',
          updatedTimestamp: '2026-10-24 15:00:00 WIB',
        },
        assumptions: [],
        revisions: [],
        handoverNotes: 'Sesi dilanjutkan dengan ZLCE v3.2.2',
        auditLog: [],
      };
    }
  }, []);

  // Sync state helper
  const updateDatabaseState = useCallback((newDb: RyokoDatabase, actionName?: string, detail?: string) => {
    if (actionName && detail) {
      appendAuditLog(newDb, actionName, detail);
    } else {
      saveDatabase(newDb);
    }
    setDb({ ...newDb });
  }, []);

  // Sync Armada helper (D-26 & Opsi 3A: 1 Baris per Unit Fisik)
  const handleSyncArmada = useCallback(() => {
    const existingTrackingMap = new Map(db.tracking.map(t => [t.unitId, t]));
    const nowStr =
      new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) +
      ' ' +
      new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) +
      ' WIB';

    const syncedTracking: UnitTracking[] = db.units.map(u => {
      const existing = existingTrackingMap.get(u.id);
      if (existing) {
        return {
          ...existing,
          kodeUnit: u.kodeUnit,
          motorId: u.motorId,
        };
      }
      return {
        unitId: u.id,
        kodeUnit: u.kodeUnit,
        motorId: u.motorId,
        statusPosisi: u.statusServis === 'servis' ? 'servis' : 'parkir',
        poolParkir: u.poolLokasi,
        updatedAt: nowStr,
        updatedBy: db.settings.operatorName || 'System',
      };
    });

    const newDb: RyokoDatabase = {
      ...db,
      tracking: syncedTracking,
    };
    updateDatabaseState(newDb, 'Sinkronisasi Armada', `Sinkronisasi posisi ${syncedTracking.length} unit armada garasi`);
    alert(`Sinkronisasi selesai! ${syncedTracking.length} unit armada garasi terdaftar aktif di pelacakan.`);
  }, [db, updateDatabaseState]);

  // Operational metrics for top/bottom badges
  const pendingCount = useMemo(() => {
    return db.bookings.filter(b => b.status === 'ryokou_booking').length;
  }, [db.bookings]);

  const activeRentalsCount = useMemo(() => {
    return db.bookings.filter(b => b.status === 'ryokou_disewa').length;
  }, [db.bookings]);

  const repairCount = useMemo(() => {
    return db.tracking.filter(t => t.statusPosisi === 'servis').length;
  }, [db.tracking]);

  /* ------------------------------------------------------------------------ */
  /* BUSINESS ACTIONS                                                         */
  /* ------------------------------------------------------------------------ */

  // 1. Create New Booking
  const handleCreateBooking = (newBooking: BookingRecord, lockUnitId?: number) => {
    let updatedTracking = [...db.tracking];

    if (lockUnitId) {
      updatedTracking = updatedTracking.map(t => {
        if (t.unitId === lockUnitId) {
          return {
            ...t,
            statusPosisi: 'disewa' as const,
            bookingId: newBooking.id,
            noBooking: newBooking.noBooking,
            namaPenyewa: newBooking.nama,
            tenggatKembali: newBooking.jamTanggalSelesai.replace('T', ' '),
            catatan: `Sewa langsung dikunci ke ${newBooking.nama}`,
            updatedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
            updatedBy: db.settings.operatorName || 'Operator Ryoko',
          };
        }
        return t;
      });
    }

    const newDb: RyokoDatabase = {
      ...db,
      bookings: [newBooking, ...db.bookings],
      tracking: updatedTracking,
    };

    updateDatabaseState(
      newDb,
      'Input Booking Baru',
      `Booking #${newBooking.noBooking} oleh ${newBooking.nama} (${newBooking.snapshotNamaMotor} - ${newBooking.labelDurasi})`
    );
  };

  // 2. Approve Booking & Lock Unit (D-04)
  const handleConfirmApprove = (bookingId: number, unitId: number) => {
    const unit = db.units.find(u => u.id === unitId);
    if (!unit) return;

    const nowStr =
      new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) +
      ' ' +
      new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) +
      ' WIB';

    const updatedBookings = db.bookings.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          status: 'ryokou_approved' as const,
          unitId: unit.id,
          snapshotKodeUnit: unit.kodeUnit,
          approvedAt: nowStr,
        };
      }
      return b;
    });

    const targetBooking = db.bookings.find(b => b.id === bookingId);

    const newDb: RyokoDatabase = {
      ...db,
      bookings: updatedBookings,
    };

    updateDatabaseState(
      newDb,
      'Approve & Kunci Unit',
      `Booking #${targetBooking?.noBooking || bookingId} diapprove dengan unit ${unit.kodeUnit} (${unit.nomorPlat})`
    );
  };

  // 3. Handover Unit / Serah Terima (Mulai Sewa D-04)
  const handleConfirmHandover = (bookingId: number) => {
    const nowStr =
      new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) +
      ' ' +
      new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) +
      ' WIB';

    const targetBooking = db.bookings.find(b => b.id === bookingId);
    if (!targetBooking) return;

    const updatedBookings = db.bookings.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          status: 'ryokou_disewa' as const,
          serahTerimaAt: nowStr,
        };
      }
      return b;
    });

    // Update tracking unit to 'disewa'
    const updatedTracking = db.tracking.map(t => {
      if (t.unitId === targetBooking.unitId) {
        return {
          ...t,
          statusPosisi: 'disewa' as const,
          bookingId: targetBooking.id,
          noBooking: targetBooking.noBooking,
          namaPenyewa: targetBooking.nama,
          tenggatKembali: targetBooking.jamTanggalSelesai.replace('T', ' '),
          updatedAt: nowStr,
          updatedBy: db.settings.operatorName || 'Operator Ryoko',
        };
      }
      return t;
    });

    const newDb: RyokoDatabase = {
      ...db,
      bookings: updatedBookings,
      tracking: updatedTracking,
    };

    updateDatabaseState(
      newDb,
      'Serah Terima Unit',
      `Unit ${targetBooking.snapshotKodeUnit} diserahterimakan ke ${targetBooking.nama} (Mulai Sewa)`
    );
  };

  // 4. Tukar Unit Berkala (D-19)
  const handleConfirmExchange = (bookingId: number, newUnitId: number, reason: string) => {
    const targetBooking = db.bookings.find(b => b.id === bookingId);
    const newUnit = db.units.find(u => u.id === newUnitId);
    if (!targetBooking || !newUnit) return;

    const nowStr =
      new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) +
      ' ' +
      new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) +
      ' WIB';

    const exchangeLogItem = {
      id: `exc-${Date.now()}`,
      waktu: nowStr,
      unitLamaId: targetBooking.unitId || 0,
      unitLamaKode: targetBooking.snapshotKodeUnit || '-',
      unitBaruId: newUnit.id,
      unitBaruKode: newUnit.kodeUnit,
      alasan: reason,
      operator: db.settings.operatorName || 'Operator Ryoko',
    };

    // Update booking
    const updatedBookings = db.bookings.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          unitId: newUnit.id,
          snapshotKodeUnit: newUnit.kodeUnit,
          riwayatTukarUnit: [...(b.riwayatTukarUnit || []), exchangeLogItem],
        };
      }
      return b;
    });

    // Update tracking: old unit back to parkir (or marked for check), new unit to disewa
    const updatedTracking = db.tracking.map(t => {
      if (t.unitId === targetBooking.unitId) {
        return {
          ...t,
          statusPosisi: 'parkir' as const,
          bookingId: undefined,
          noBooking: undefined,
          namaPenyewa: undefined,
          tenggatKembali: undefined,
          catatan: `Unit ditarik dari booking #${targetBooking.noBooking}. Alasan: ${reason}`,
          updatedAt: nowStr,
          updatedBy: db.settings.operatorName || 'Operator Ryoko',
        };
      }
      if (t.unitId === newUnit.id) {
        return {
          ...t,
          statusPosisi: 'disewa' as const,
          bookingId: targetBooking.id,
          noBooking: targetBooking.noBooking,
          namaPenyewa: targetBooking.nama,
          tenggatKembali: targetBooking.jamTanggalSelesai.replace('T', ' '),
          catatan: `Unit pengganti sewa berjalan booking #${targetBooking.noBooking}`,
          updatedAt: nowStr,
          updatedBy: db.settings.operatorName || 'Operator Ryoko',
        };
      }
      return t;
    });

    const newDb: RyokoDatabase = {
      ...db,
      bookings: updatedBookings,
      tracking: updatedTracking,
    };

    updateDatabaseState(
      newDb,
      'Tukar Unit Berkala (D-19)',
      `Pertukaran unit #${targetBooking.noBooking}: ${targetBooking.snapshotKodeUnit} digantikan ${newUnit.kodeUnit}. Alasan: ${reason}`
    );
  };

  // 5. Complete Booking & Overtime Penalties (D-27)
  const handleConfirmFinish = (
    bookingId: number,
    returnPool: PoolLocation,
    denda: { nominal: number; keterangan: string }
  ) => {
    const targetBooking = db.bookings.find(b => b.id === bookingId);
    if (!targetBooking) return;

    const nowEpoch = Math.floor(Date.now() / 1000);
    const nowStr =
      new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) +
      ' ' +
      new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) +
      ' WIB';

    const updatedBookings = db.bookings.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          status: 'ryokou_selesai' as const,
          selesaiAt: nowStr,
          actualReturnEpoch: nowEpoch,
          returnPool,
          dendaNominal: denda.nominal,
          dendaKeterangan: denda.keterangan,
        };
      }
      return b;
    });

    // Return unit to pool
    const updatedTracking = db.tracking.map(t => {
      if (t.unitId === targetBooking.unitId) {
        return {
          ...t,
          statusPosisi: 'parkir' as const,
          poolParkir: returnPool,
          bookingId: undefined,
          noBooking: undefined,
          namaPenyewa: undefined,
          tenggatKembali: undefined,
          catatan: `Unit kembali dari sewa #${targetBooking.noBooking} di ${returnPool === 'batu' ? 'Pool Batu' : 'Pool Malang'}`,
          updatedAt: nowStr,
          updatedBy: db.settings.operatorName || 'Operator Ryoko',
        };
      }
      return t;
    });

    const newDb: RyokoDatabase = {
      ...db,
      bookings: updatedBookings,
      tracking: updatedTracking,
    };

    updateDatabaseState(
      newDb,
      'Selesai Sewa & Pengembalian',
      `Booking #${targetBooking.noBooking} selesai. Unit ${targetBooking.snapshotKodeUnit} masuk ke ${returnPool === 'batu' ? 'Pool Batu' : 'Pool Malang'}. Denda: Rp ${denda.nominal.toLocaleString('id-ID')}`
    );
  };

  // 6. Cancel / Reject Booking (D-20 & F-21)
  const handleCancelBooking = (bookingId: number) => {
    const targetBooking = db.bookings.find(b => b.id === bookingId);
    if (!targetBooking) return;

    if (targetBooking.status === 'ryokou_disewa') {
      alert('Proteksi Keamanan (D-20 & F-21): Unit yang sedang berstatus "Disewa" dilarang dihapus sebelum transaksi diselesaikan!');
      return;
    }

    const ok = window.confirm(
      `Apakah Anda yakin ingin membatalkan/menghapus booking #${targetBooking.noBooking} oleh ${targetBooking.nama}? Tindakan ini permanen.`
    );
    if (!ok) return;

    const updatedBookings = db.bookings.filter(b => b.id !== bookingId);

    // If unit was locked, release it back to pool
    let updatedTracking = [...db.tracking];
    if (targetBooking.unitId) {
      updatedTracking = updatedTracking.map(t => {
        if (t.unitId === targetBooking.unitId && t.statusPosisi !== 'servis') {
          return {
            ...t,
            statusPosisi: 'parkir' as const,
            bookingId: undefined,
            noBooking: undefined,
            namaPenyewa: undefined,
            tenggatKembali: undefined,
            catatan: `Booking #${targetBooking.noBooking} dibatalkan operator`,
            updatedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
            updatedBy: db.settings.operatorName || 'Operator Ryoko',
          };
        }
        return t;
      });
    }

    const newDb: RyokoDatabase = {
      ...db,
      bookings: updatedBookings,
      tracking: updatedTracking,
    };

    updateDatabaseState(
      newDb,
      'Batal Booking (D-20)',
      `Pembatalan booking #${targetBooking.noBooking} oleh operator`
    );
  };

  // 7. Update Tracking Position (D-26)
  const handleConfirmUpdateTracking = (updated: UnitTracking) => {
    const updatedTracking = db.tracking.map(t => {
      if (t.unitId === updated.unitId) {
        return updated;
      }
      return t;
    });

    // Also sync physical unit statusServis & poolLokasi
    const updatedUnits = db.units.map(u => {
      if (u.id === updated.unitId) {
        return {
          ...u,
          poolLokasi: updated.poolParkir,
          statusServis: (updated.statusPosisi === 'servis' ? 'servis' : 'aktif') as 'aktif' | 'servis',
        };
      }
      return u;
    });

    const newDb: RyokoDatabase = {
      ...db,
      tracking: updatedTracking,
      units: updatedUnits,
    };

    const positionLabel =
      updated.statusPosisi === 'kurir'
        ? `Kurir (${updated.namaKurir || 'Kurir Ryoko'})`
        : updated.statusPosisi === 'servis'
        ? `Servis (${updated.namaBengkel || 'Bengkel'})`
        : updated.statusPosisi === 'disewa'
        ? `Disewa (${updated.namaPenyewa || 'Penyewa'})`
        : `Parkir (${updated.poolParkir === 'batu' ? 'Pool Batu' : 'Pool Malang'})`;

    updateDatabaseState(
      newDb,
      'Update Posisi Lacak Unit',
      `Posisi unit ${updated.kodeUnit} diubah menjadi ${positionLabel}`
    );
  };

  // 7.5 Catat Servis Rutin (7 Kategori BR-08)
  const handleAddServiceRecord = (record: Omit<ServiceRecord, 'id' | 'createdAt'>) => {
    const newRecord: ServiceRecord = {
      ...record,
      id: `SRV-${String((db.serviceRecords?.length || 0) + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString(),
    };
    const updatedServiceRecords = [newRecord, ...(db.serviceRecords || [])];

    const nowStr =
      new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) +
      ' ' +
      new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) +
      ' WIB';

    // Perbarui catatan di tabel pelacakan armada fisik
    const updatedTracking = db.tracking.map(t => {
      if (t.unitId === record.unitId) {
        return {
          ...t,
          statusPosisi: 'servis' as const,
          namaBengkel: record.bengkelMekanik,
          catatan: `Servis [${record.kategoriServis}]: ${record.keterangan}`,
          updatedAt: nowStr,
          updatedBy: db.settings.operatorName || 'Operator Ryoko',
        };
      }
      return t;
    });

    const updatedUnits = db.units.map(u => {
      if (u.id === record.unitId) {
        return {
          ...u,
          statusServis: 'servis' as const,
        };
      }
      return u;
    });

    const newDb: RyokoDatabase = {
      ...db,
      serviceRecords: updatedServiceRecords,
      tracking: updatedTracking,
      units: updatedUnits,
    };

    updateDatabaseState(
      newDb,
      'Catat Servis Rutin (7 Kategori)',
      `Servis ${record.kodeUnit} [${record.kategoriServis}] di ${record.bengkelMekanik} - Biaya: Rp ${record.biaya.toLocaleString('id-ID')}`
    );
  };

  // 8. Add Physical Unit to Garage
  const handleAddPhysicalUnit = (unitData: Omit<PhysicalUnit, 'id'>) => {
    const newId = 100 + db.units.length + 1;
    const newUnit: PhysicalUnit = {
      ...unitData,
      id: newId,
    };

    const nowStr =
      new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) +
      ' ' +
      new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) +
      ' WIB';

    // Auto-create tracking row (D-26 Opsi 3A: 1 Baris per Unit Fisik)
    const newTracking: UnitTracking = {
      unitId: newId,
      kodeUnit: newUnit.kodeUnit,
      motorId: newUnit.motorId,
      statusPosisi: newUnit.statusServis === 'servis' ? 'servis' : 'parkir',
      poolParkir: newUnit.poolLokasi,
      catatan: 'Unit baru didaftarkan ke garasi armada',
      updatedAt: nowStr,
      updatedBy: db.settings.operatorName || 'Operator Ryoko',
    };

    const newDb: RyokoDatabase = {
      ...db,
      units: [...db.units, newUnit],
      tracking: [...db.tracking, newTracking],
    };

    updateDatabaseState(
      newDb,
      'Registrasi Unit Fisik Baru',
      `Pendaftaran unit fisik ${newUnit.kodeUnit} (${newUnit.nomorPlat}) ke garasi armada`
    );
    alert(`Unit fisik ${newUnit.kodeUnit} (${newUnit.nomorPlat}) berhasil ditambahkan dan disinkronkan ke Lacak Unit!`);
  };

  // 9. Bulk Price Adjustment (-50% to +200% with rounding to 1,000)
  const handleApplyBulkPriceAdjustment = (percentChange: number) => {
    const multiplier = 1 + percentChange / 100;
    const roundToThousand = (val: number) => Math.round((val * multiplier) / 1000) * 1000;

    const updatedMotors = db.motors.map(m => {
      return {
        ...m,
        harga1Hari: roundToThousand(m.harga1Hari),
        harga1Minggu: roundToThousand(m.harga1Minggu),
        harga1Bulan: roundToThousand(m.harga1Bulan),
        harga12Jam: roundToThousand(m.harga12Jam),
        harga9Jam: roundToThousand(m.harga9Jam),
        harga6Jam: roundToThousand(m.harga6Jam),
        harga3Jam: roundToThousand(m.harga3Jam),
      };
    });

    const newDb: RyokoDatabase = {
      ...db,
      motors: updatedMotors,
    };

    updateDatabaseState(
      newDb,
      'Penyesuaian Harga Massal (D-22)',
      `Penyesuaian seluruh tarif rental sebesar ${percentChange > 0 ? '+' : ''}${percentChange}% (pembulatan ribuan)`
    );
  };

  // 10. Settings & Reset
  const handleUpdateSettings = (settings: RentalSettings) => {
    const newDb: RyokoDatabase = {
      ...db,
      settings,
    };
    updateDatabaseState(newDb, 'Update Pengaturan Operasional', 'Pembaruan nomor WhatsApp admin dan data operasional');
  };

  const handleResetDatabase = () => {
    const freshDb = resetDatabaseToDefault();
    setDb(freshDb);
    alert('Database berhasil direset ke data standar Ryoko Rent v3.2.2.');
  };

  const handleImportSuccess = (importedDb: RyokoDatabase) => {
    setDb(importedDb);
  };

  // Active User Resolution
  const activeUser: AppUser = useMemo(() => {
    return (
      db.users?.find(u => u.id === db.currentUserId) ||
      db.users?.[0] || {
        id: 'usr-admin',
        nama: 'Budi Santoso',
        username: 'admin.budi',
        role: 'administrator',
        avatarIcon: '👑',
        isActive: true,
        createdAt: '2026-10-24 07:00 WIB',
      }
    );
  }, [db.users, db.currentUserId]);

  // Switch Active User (Testing and operational profile switching)
  const handleSwitchUser = useCallback(
    (userId: string) => {
      const target = db.users?.find(u => u.id === userId);
      if (!target) return;
      const newDb: RyokoDatabase = {
        ...db,
        currentUserId: userId,
      };
      if (target.role === 'kurir') {
        setActiveTab('courier');
      } else if (activeTab === 'courier') {
        setActiveTab('dashboard');
      }
      updateDatabaseState(newDb, 'Ganti Akun Pengguna', `Beralih profil ke ${target.nama} (${target.role})`);
    },
    [db, activeTab, updateDatabaseState]
  );

  // Save / Update User
  const handleSaveUser = useCallback(
    (user: AppUser) => {
      const exists = db.users?.some(u => u.id === user.id);
      const updatedUsers = exists
        ? db.users.map(u => (u.id === user.id ? user : u))
        : [...(db.users || []), user];

      const newDb: RyokoDatabase = {
        ...db,
        users: updatedUsers,
      };
      updateDatabaseState(
        newDb,
        exists ? 'Update Pengguna' : 'Tambah Pengguna Baru',
        `Menyimpan pengguna ${user.nama} (${user.role})`
      );
    },
    [db, updateDatabaseState]
  );

  // Delete User
  const handleDeleteUser = useCallback(
    (userId: string) => {
      if (userId === 'usr-admin') {
        alert('Super Administrator utama tidak dapat dihapus.');
        return;
      }
      const target = db.users?.find(u => u.id === userId);
      const updatedUsers = db.users?.filter(u => u.id !== userId) || [];
      let newCurrent = db.currentUserId;
      if (db.currentUserId === userId) {
        newCurrent = 'usr-admin';
      }
      const newDb: RyokoDatabase = {
        ...db,
        users: updatedUsers,
        currentUserId: newCurrent,
      };
      updateDatabaseState(newDb, 'Hapus Pengguna', `Menghapus akun ${target?.nama || userId}`);
    },
    [db, updateDatabaseState]
  );

  // Courier park unit back to garage
  const handleCourierParkBack = useCallback(
    (unitId: number, pool: PoolLocation) => {
      const nowStr =
        new Date().toLocaleDateString('id-ID', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }) +
        ' ' +
        new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) +
        ' WIB';

      const updatedTracking = db.tracking.map(t => {
        if (t.unitId === unitId) {
          return {
            ...t,
            statusPosisi: 'parkir' as const,
            poolParkir: pool,
            namaKurir: undefined,
            catatan: `Unit diparkirkan kembali oleh kurir ${activeUser.nama} ke Pool ${pool}`,
            updatedAt: nowStr,
            updatedBy: activeUser.nama,
          };
        }
        return t;
      });
      const newDb: RyokoDatabase = {
        ...db,
        tracking: updatedTracking,
      };
      updateDatabaseState(newDb, 'Kembalikan Motor Kurir', `Unit #${unitId} diparkirkan kembali ke Pool ${pool}`);
      alert(`Unit motor berhasil diparkirkan kembali ke Pool ${pool === 'batu' ? 'Batu' : 'Malang'}!`);
    },
    [db, activeUser.nama, updateDatabaseState]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-text antialiased">
      {/* Container wrapper: Switch between Simulated Mobile APK Viewport vs Full Screen */}
      <div
        className={`mx-auto w-full transition-all duration-200 flex flex-col min-h-screen ${
          isMobileDeviceView
            ? 'max-w-md my-0 sm:my-4 border-0 sm:border sm:border-slate-800/90 sm:rounded-3xl sm:shadow-2xl sm:shadow-cyan-950/50 overflow-hidden'
            : 'max-w-7xl'
        }`}
      >
        {/* Android Native Status Bar */}
        <AndroidStatusBar />

        {/* Android Top App Bar */}
        <AndroidTopBar
          pendingBookingsCount={pendingCount}
          activeDisewaCount={activeRentalsCount}
          isMobileDeviceView={isMobileDeviceView}
          activeUser={activeUser}
          allUsers={db.users || []}
          onSwitchUser={handleSwitchUser}
          onOpenUserManagement={() => setActiveTab('users')}
          onToggleDeviceView={() => setIsMobileDeviceView(prev => !prev)}
          onOpenNewBooking={() => setIsNewBookingModalOpen(true)}
          onOpenInstallGuide={() => setIsInstallGuideOpen(true)}
          onOpenRecoveryWizard={() => setIsRecoveryModalOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-3 sm:p-5 overflow-y-auto">
          {activeTab === 'courier' && (
            <CourierDashboardView
              db={db}
              activeUser={activeUser}
              onConfirmHandover={handleConfirmHandover}
              onConfirmFinish={handleConfirmFinish}
              onParkUnitBack={handleCourierParkBack}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              db={db}
              activeUser={activeUser}
              onNavigateTab={tab => setActiveTab(tab)}
              onOpenNewBooking={() => setIsNewBookingModalOpen(true)}
              onSelectBooking={b => {
                setActiveTab('bookings');
              }}
              onSelectTracking={t => {
                setSelectedUpdateTracking(t);
              }}
              onSyncArmada={handleSyncArmada}
            />
          )}

          {activeTab === 'bookings' && (
            <BookingsView
              db={db}
              onOpenNewBooking={() => setIsNewBookingModalOpen(true)}
              onOpenApproveModal={b => setSelectedApproveBooking(b)}
              onOpenHandoverModal={b => setSelectedHandoverBooking(b)}
              onOpenExchangeModal={b => setSelectedExchangeBooking(b)}
              onOpenFinishModal={b => setSelectedFinishBooking(b)}
              onCancelBooking={handleCancelBooking}
            />
          )}

          {activeTab === 'tracking' && (
            <TrackingView
              db={db}
              onOpenUpdateTrackingModal={t => setSelectedUpdateTracking(t)}
              onSyncArmada={handleSyncArmada}
              onNavigateToBooking={bookingId => {
                setActiveTab('bookings');
              }}
            />
          )}

          {activeTab === 'service' && (
            <ServiceLogsView
              db={db}
              onAddServiceRecord={handleAddServiceRecord}
            />
          )}

          {activeTab === 'fleet' && (
            <FleetView
              db={db}
              activeUser={activeUser}
              onUpdateMotor={m => {
                const updated = db.motors.map(item => (item.id === m.id ? m : item));
                updateDatabaseState({ ...db, motors: updated }, 'Update Model Motor', `Perbarui tarif ${m.namaModel}`);
              }}
              onAddPhysicalUnit={handleAddPhysicalUnit}
              onApplyBulkPriceAdjustment={handleApplyBulkPriceAdjustment}
            />
          )}

          {activeTab === 'users' && (
            <UserManagementView
              db={db}
              activeUser={activeUser}
              onSwitchUser={handleSwitchUser}
              onSaveUser={handleSaveUser}
              onDeleteUser={handleDeleteUser}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              db={db}
              activeUser={activeUser}
              onUpdateSettings={handleUpdateSettings}
              onResetDatabase={handleResetDatabase}
              onImportSuccess={handleImportSuccess}
              onOpenInstallGuide={() => setIsInstallGuideOpen(true)}
              onNavigateToUsers={() => setActiveTab('users')}
            />
          )}
        </main>

        {/* Android Bottom Navigation Bar */}
        <AndroidBottomNav
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          pendingCount={pendingCount}
          activeRentalsCount={activeRentalsCount}
          repairCount={repairCount}
          activeUser={activeUser}
        />
      </div>

      {/* MODALS */}
      {/* 1. New Booking Modal */}
      {isNewBookingModalOpen && (
        <NewBookingModal
          db={db}
          onClose={() => setIsNewBookingModalOpen(false)}
          onSubmitBooking={handleCreateBooking}
        />
      )}

      {/* 2. Approve Unit Modal */}
      {selectedApproveBooking && (
        <ApproveUnitModal
          booking={selectedApproveBooking}
          db={db}
          onClose={() => setSelectedApproveBooking(null)}
          onConfirmApprove={handleConfirmApprove}
        />
      )}

      {/* 3. Handover Modal */}
      {selectedHandoverBooking && (
        <SerahTerimaModal
          booking={selectedHandoverBooking}
          onClose={() => setSelectedHandoverBooking(null)}
          onConfirmHandover={handleConfirmHandover}
        />
      )}

      {/* 4. Tukar Unit Modal (D-19) */}
      {selectedExchangeBooking && (
        <TukarUnitModal
          booking={selectedExchangeBooking}
          db={db}
          onClose={() => setSelectedExchangeBooking(null)}
          onConfirmExchange={handleConfirmExchange}
        />
      )}

      {/* 5. Selesai Booking Modal (D-27) */}
      {selectedFinishBooking && (
        <SelesaiBookingModal
          booking={selectedFinishBooking}
          db={db}
          onClose={() => setSelectedFinishBooking(null)}
          onConfirmFinish={handleConfirmFinish}
        />
      )}

      {/* 6. Update Tracking Modal (D-26) */}
      {selectedUpdateTracking && (
        <UpdateTrackingModal
          unitTracking={selectedUpdateTracking}
          db={db}
          onClose={() => setSelectedUpdateTracking(null)}
          onConfirmUpdate={handleConfirmUpdateTracking}
        />
      )}

      {/* 7. PWA / APK Install Modal */}
      {isInstallGuideOpen && (
        <PWAInstallModal onClose={() => setIsInstallGuideOpen(false)} />
      )}

      {/* 8. ZLCE Recovery Wizard Modal (Recovery Tab Studio) */}
      {isRecoveryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/80">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400 font-bold text-sm">
                  ⚡
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span>ZLCE Studio v3.2.2 - Wizard Recovery</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 font-mono">
                      Single Source of Truth
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Generator snapshot pemulihan dan verifikasi integritas konteks sesi AI agent (D-26 & ZLCE Standard)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRecoveryModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition"
                title="Tutup Wizard"
              >
                ✕
              </button>
            </div>
            <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-slate-950/50">
              <RecoveryTab stateData={recoverySessionState} rawMarkdown={sessionStateActual} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
