import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  RyokoDatabase,
  BookingRecord,
  UnitTracking,
  MotorModel,
  PhysicalUnit,
  RentalSettings,
  PoolLocation,
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
import { FleetView } from './components/FleetView';
import { SettingsView } from './components/SettingsView';
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
  const [selectedApproveBooking, setSelectedApproveBooking] = useState<BookingRecord | null>(null);
  const [selectedHandoverBooking, setSelectedHandoverBooking] = useState<BookingRecord | null>(null);
  const [selectedExchangeBooking, setSelectedExchangeBooking] = useState<BookingRecord | null>(null);
  const [selectedFinishBooking, setSelectedFinishBooking] = useState<BookingRecord | null>(null);
  const [selectedUpdateTracking, setSelectedUpdateTracking] = useState<UnitTracking | null>(null);

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

    updateDatabaseState(
      newDb,
      'Update Posisi Lacak Unit',
      `Posisi unit ${updated.kodeUnit} diubah menjadi ${updated.statusPosisi} (${updated.poolParkir === 'batu' ? 'Pool Batu' : 'Pool Malang'})`
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
        harga2Minggu: roundToThousand(m.harga2Minggu),
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
          onToggleDeviceView={() => setIsMobileDeviceView(prev => !prev)}
          onOpenNewBooking={() => setIsNewBookingModalOpen(true)}
          onOpenInstallGuide={() => setIsInstallGuideOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-3 sm:p-5 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              db={db}
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

          {activeTab === 'fleet' && (
            <FleetView
              db={db}
              onUpdateMotor={m => {
                const updated = db.motors.map(item => (item.id === m.id ? m : item));
                updateDatabaseState({ ...db, motors: updated }, 'Update Model Motor', `Perbarui tarif ${m.namaModel}`);
              }}
              onAddPhysicalUnit={handleAddPhysicalUnit}
              onApplyBulkPriceAdjustment={handleApplyBulkPriceAdjustment}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              db={db}
              onUpdateSettings={handleUpdateSettings}
              onResetDatabase={handleResetDatabase}
              onImportSuccess={handleImportSuccess}
              onOpenInstallGuide={() => setIsInstallGuideOpen(true)}
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
    </div>
  );
};

export default App;
