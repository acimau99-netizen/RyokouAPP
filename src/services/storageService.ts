import { RyokoDatabase, AuditLogItem } from '../types/ryoko';
import { INITIAL_DATABASE } from '../data/seedData';

const STORAGE_KEY = 'ryokourent_db_v1';

export function loadDatabase(): RyokoDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveDatabase(INITIAL_DATABASE);
      return INITIAL_DATABASE;
    }
    const parsed = JSON.parse(raw) as RyokoDatabase;
    if (!parsed.motors || !parsed.units || !parsed.bookings) {
      // Corrupt or old format, reseed
      saveDatabase(INITIAL_DATABASE);
      return INITIAL_DATABASE;
    }
    return parsed;
  } catch (error) {
    console.error('Failed to load database from LocalStorage:', error);
    return INITIAL_DATABASE;
  }
}

export function saveDatabase(db: RyokoDatabase): void {
  try {
    db.lastUpdated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (error) {
    console.error('Failed to save database to LocalStorage:', error);
  }
}

export function resetDatabaseToDefault(): RyokoDatabase {
  saveDatabase(INITIAL_DATABASE);
  return INITIAL_DATABASE;
}

export function exportDatabaseJSON(): string {
  const db = loadDatabase();
  return JSON.stringify(db, null, 2);
}

export function importDatabaseJSON(jsonStr: string): { success: boolean; message: string; db?: RyokoDatabase } {
  try {
    const parsed = JSON.parse(jsonStr) as RyokoDatabase;
    if (!parsed.motors || !Array.isArray(parsed.motors) || !parsed.units || !parsed.bookings) {
      return { success: false, message: 'Format file JSON tidak valid untuk database RyokoRent.' };
    }
    parsed.lastUpdated = new Date().toISOString();
    saveDatabase(parsed);
    return { success: true, message: 'Database berhasil dipulihkan dari file cadangan.', db: parsed };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Kesalahan parsing JSON';
    return { success: false, message: `Gagal memulihkan database: ${errorMsg}` };
  }
}

export function getStorageUsage(): { bytes: number; kb: number; percentEstimate: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || '';
    const bytes = new Blob([raw]).size;
    const kb = Math.round(bytes / 1024 * 10) / 10;
    // Typical LocalStorage limit is 5MB
    const percentEstimate = Math.min(100, Math.round((bytes / (5 * 1024 * 1024)) * 1000) / 10);
    return { bytes, kb, percentEstimate };
  } catch {
    return { bytes: 0, kb: 0, percentEstimate: 0 };
  }
}

export function appendAuditLog(db: RyokoDatabase, aktivitas: string, detail: string): RyokoDatabase {
  const now = new Date();
  const timeStr = now.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }) + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

  const newLog: AuditLogItem = {
    id: `aud-${Date.now().toString(36)}`,
    waktu: timeStr,
    user: db.settings.operatorName || 'Operator Ryoko',
    aktivitas,
    detail,
  };

  const updatedLogs = [newLog, ...(db.settings.auditLogs || [])].slice(0, 50); // Keep last 50
  db.settings.auditLogs = updatedLogs;
  saveDatabase(db);
  return db;
}
