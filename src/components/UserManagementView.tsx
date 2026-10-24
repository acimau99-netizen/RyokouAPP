import React, { useState } from 'react';
import {
  RyokoDatabase,
  AppUser,
  UserRole,
  UserPermissions,
} from '../types/ryoko';
import {
  getUserEffectivePermissions,
  ROLE_LABELS,
  DEFAULT_CUSTOM_ADMIN_PERMISSIONS,
} from '../utils/userPermissions';
import {
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  UserCheck,
  Phone,
  Info,
  Sliders,
  Eye,
  CalendarCheck2,
  Compass,
  Wrench,
  Bike,
  Settings,
  Database,
  Lock,
} from 'lucide-react';

interface UserManagementViewProps {
  db: RyokoDatabase;
  activeUser: AppUser;
  onSwitchUser: (userId: string) => void;
  onSaveUser: (user: AppUser) => void;
  onDeleteUser: (userId: string) => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  db,
  activeUser,
  onSwitchUser,
  onSaveUser,
  onDeleteUser,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    id: string;
    nama: string;
    username: string;
    role: UserRole;
    phone: string;
    avatarIcon: string;
    isActive: boolean;
    catatan: string;
    customPermissions: UserPermissions;
  }>({
    id: '',
    nama: '',
    username: '',
    role: 'operator',
    phone: '',
    avatarIcon: '📋',
    isActive: true,
    catatan: '',
    customPermissions: { ...DEFAULT_CUSTOM_ADMIN_PERMISSIONS },
  });

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      id: `usr-${Date.now().toString(36)}`,
      nama: '',
      username: '',
      role: 'operator',
      phone: '',
      avatarIcon: '📋',
      isActive: true,
      catatan: '',
      customPermissions: { ...DEFAULT_CUSTOM_ADMIN_PERMISSIONS },
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: AppUser) => {
    setEditingUser(user);
    setFormData({
      id: user.id,
      nama: user.nama,
      username: user.username,
      role: user.role,
      phone: user.phone || '',
      avatarIcon: user.avatarIcon || (user.role === 'administrator' ? '👑' : user.role === 'admin_custom' ? '🛠️' : user.role === 'operator' ? '📋' : '🛵'),
      isActive: user.isActive,
      catatan: user.catatan || '',
      customPermissions: user.customPermissions || { ...DEFAULT_CUSTOM_ADMIN_PERMISSIONS },
    });
    setIsModalOpen(true);
  };

  const handleRoleChange = (role: UserRole) => {
    let icon = formData.avatarIcon;
    if (role === 'administrator') icon = '👑';
    else if (role === 'admin_custom') icon = '🛠️';
    else if (role === 'operator') icon = '📋';
    else if (role === 'kurir') icon = '🛵';

    setFormData(prev => ({
      ...prev,
      role,
      avatarIcon: icon,
    }));
  };

  const handleTogglePermission = (key: keyof UserPermissions) => {
    setFormData(prev => ({
      ...prev,
      customPermissions: {
        ...prev.customPermissions,
        [key]: !prev.customPermissions[key],
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim() || !formData.username.trim()) {
      alert('Nama lengkap dan Username wajib diisi!');
      return;
    }

    const updatedUser: AppUser = {
      id: formData.id,
      nama: formData.nama.trim(),
      username: formData.username.trim().toLowerCase(),
      role: formData.role,
      phone: formData.phone.trim(),
      avatarIcon: formData.avatarIcon,
      isActive: formData.isActive,
      catatan: formData.catatan.trim(),
      customPermissions: formData.role === 'admin_custom' ? formData.customPermissions : undefined,
      createdAt: editingUser?.createdAt || new Date().toLocaleString('id-ID'),
    };

    onSaveUser(updatedUser);
    setIsModalOpen(false);
  };

  const countActivePermissions = (perms?: UserPermissions) => {
    if (!perms) return 0;
    return Object.values(perms).filter(Boolean).length;
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Users className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Manajemen Pengguna & Hak Akses
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Kelola 4 tingkatan hak akses: Administrator (All Access), Admin Custom, Operator Terbatas, & Kurir Lapangan.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-md shadow-indigo-950/50 transition active:scale-95 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Pengguna</span>
        </button>
      </div>

      {/* Role Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {(['administrator', 'admin_custom', 'operator', 'kurir'] as UserRole[]).map(roleKey => {
          const meta = ROLE_LABELS[roleKey];
          const userCount = db.users.filter(u => u.role === roleKey).length;
          return (
            <div
              key={roleKey}
              className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl select-none">{meta.icon}</span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">{meta.label}</h3>
                    <span className="text-[10px] text-slate-400">{userCount} Akun terdaftar</span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badgeColor}`}>
                  Tier
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                {meta.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Active User Card Banner */}
      <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xl shrink-0">
            {activeUser.avatarIcon || '👤'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Akun Aktif Saat Ini
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ROLE_LABELS[activeUser.role].badgeColor}`}>
                {ROLE_LABELS[activeUser.role].label}
              </span>
            </div>
            <h3 className="text-sm font-bold text-white truncate">{activeUser.nama}</h3>
            <p className="text-xs text-slate-400">@{activeUser.username} {activeUser.phone && `· ${activeUser.phone}`}</p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[11px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 font-mono">
            ID: {activeUser.id}
          </span>
        </div>
      </div>

      {/* User Accounts List */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Daftar Seluruh Pengguna ({db.users.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {db.users.map(user => {
            const isCurrent = user.id === activeUser.id;
            const meta = ROLE_LABELS[user.role];
            const effPerms = getUserEffectivePermissions(user);

            return (
              <div
                key={user.id}
                className={`bg-slate-900/90 border rounded-xl p-3.5 transition flex flex-col justify-between gap-3 ${
                  isCurrent
                    ? 'border-emerald-500/50 shadow-md shadow-emerald-950/30 ring-1 ring-emerald-500/30'
                    : 'border-slate-800/90 hover:border-slate-700'
                }`}
              >
                {/* Header Profile */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shrink-0">
                      {user.avatarIcon || meta.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-bold text-white truncate">{user.nama}</h4>
                        {isCurrent && (
                          <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.2 rounded">
                            AKTIF
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">@{user.username}</p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${meta.badgeColor}`}>
                    {meta.label}
                  </span>
                </div>

                {/* Details & Notes */}
                <div className="text-xs text-slate-400 space-y-1 bg-slate-950/50 rounded-lg p-2.5 border border-slate-800/60">
                  {user.phone && (
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Phone className="w-3 h-3 text-cyan-400" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                  {user.catatan && (
                    <p className="text-[11px] text-slate-400 italic line-clamp-2">
                      "{user.catatan}"
                    </p>
                  )}

                  {/* Permissions pill for custom admin */}
                  {user.role === 'admin_custom' && (
                    <div className="pt-1 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                      <span className="text-purple-300 font-medium">Izin Kustom:</span>
                      <span className="text-slate-300 font-mono">
                        {countActivePermissions(user.customPermissions)} / 8 Izin Aktif
                      </span>
                    </div>
                  )}

                  {user.role === 'operator' && (
                    <div className="pt-1 border-t border-slate-800/60 text-[11px] text-cyan-400/90">
                      Akses operasional harian (Omset finansial disembunyikan)
                    </div>
                  )}

                  {user.role === 'kurir' && (
                    <div className="pt-1 border-t border-slate-800/60 text-[11px] text-amber-400/90">
                      Mode Kurir khusus antar/jemput (Zero-access sistem)
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  {!isCurrent ? (
                    <button
                      onClick={() => onSwitchUser(user.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 text-xs font-semibold py-1.5 px-3 rounded-lg border border-slate-700 transition active:scale-95"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Ganti ke Akun Ini</span>
                    </button>
                  ) : (
                    <div className="flex-1 text-center py-1.5 px-3 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs font-medium">
                      ✓ Sedang Digunakan
                    </div>
                  )}

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(user)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                      title="Edit Pengguna & Hak Akses"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {user.id !== 'usr-admin' && (
                      <button
                        onClick={() => {
                          if (confirm(`Hapus akun pengguna "${user.nama}" (@${user.username})?`)) {
                            onDeleteUser(user.id);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800/50 transition"
                        title="Hapus Pengguna"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: Tambah / Edit Pengguna */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-4 sm:p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{formData.avatarIcon}</span>
                <h3 className="text-base font-bold text-white">
                  {editingUser ? 'Edit Pengguna & Hak Akses' : 'Tambah Pengguna Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nama & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Dimas Pratama"
                    value={formData.nama}
                    onChange={e => setFormData({ ...formData, nama: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="operator.dimas"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              {/* No WhatsApp & Avatar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    No. WhatsApp (opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="081234567890"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Simbol Avatar
                  </label>
                  <select
                    value={formData.avatarIcon}
                    onChange={e => setFormData({ ...formData, avatarIcon: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="👑">👑 Mahkota (Super Admin)</option>
                    <option value="🛠️">🛠️ Kunci Pas (Custom Admin)</option>
                    <option value="📋">📋 Papan Data (Operator)</option>
                    <option value="🛵">🛵 Motor (Kurir Malang)</option>
                    <option value="⚡">⚡ Kilat (Kurir Cepat)</option>
                    <option value="👤">👤 Pengguna Biasa</option>
                  </select>
                </div>
              </div>

              {/* Pilihan Peran (4 Tiers) */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Tingkatan Peran / Hak Akses *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(['administrator', 'admin_custom', 'operator', 'kurir'] as UserRole[]).map(r => {
                    const meta = ROLE_LABELS[r];
                    const isSelected = formData.role === r;
                    return (
                      <div
                        key={r}
                        onClick={() => handleRoleChange(r)}
                        className={`cursor-pointer border rounded-xl p-2.5 transition flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500/40'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-xl shrink-0 select-none">{meta.icon}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white">{meta.label}</span>
                            {isSelected && <span className="text-[10px] text-cyan-400 font-bold">✓</span>}
                          </div>
                          <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                            {meta.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Granular Permission Checklist for admin_custom */}
              {formData.role === 'admin_custom' && (
                <div className="bg-purple-950/20 border border-purple-800/40 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold text-purple-200">
                        Atur Izin Granular (Custom Access)
                      </span>
                    </div>
                    <span className="text-[10px] text-purple-300 font-mono">
                      {countActivePermissions(formData.customPermissions)} / 8 Aktif
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {[
                      { key: 'canViewRevenue' as keyof UserPermissions, label: 'Laporan Omset & Finansial', icon: Eye },
                      { key: 'canManageBookings' as keyof UserPermissions, label: 'Kelola Booking / Pemesanan', icon: CalendarCheck2 },
                      { key: 'canManageTracking' as keyof UserPermissions, label: 'Lacak Unit Garasi & Kurir', icon: Compass },
                      { key: 'canManageService' as keyof UserPermissions, label: 'Catat Servis Rutin 7 Kat', icon: Wrench },
                      { key: 'canManageFleet' as keyof UserPermissions, label: 'Tarif & Unit Armada Garasi', icon: Bike },
                      { key: 'canManageSettings' as keyof UserPermissions, label: 'Pengaturan Jam & Pool', icon: Settings },
                      { key: 'canManageUsers' as keyof UserPermissions, label: 'Manajemen Pengguna', icon: Users },
                      { key: 'canAccessRecovery' as keyof UserPermissions, label: 'Recovery & Snapshot ZLCE', icon: Database },
                    ].map(perm => {
                      const isAllowed = formData.customPermissions[perm.key];
                      const IconComp = perm.icon;
                      return (
                        <button
                          type="button"
                          key={perm.key}
                          onClick={() => handleTogglePermission(perm.key)}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs border text-left transition ${
                            isAllowed
                              ? 'bg-purple-900/40 border-purple-500/60 text-white'
                              : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <IconComp className={`w-3.5 h-3.5 ${isAllowed ? 'text-purple-300' : 'text-slate-500'}`} />
                            <span className="text-[11px] font-medium">{perm.label}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isAllowed ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-500'
                          }`}>
                            {isAllowed ? 'IZINKAN' : 'KUNCI'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Information message for Operator or Kurir */}
              {formData.role === 'operator' && (
                <div className="flex items-start gap-2 bg-cyan-950/30 border border-cyan-800/40 rounded-xl p-2.5 text-xs text-cyan-300">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-cyan-400" />
                  <span>
                    <strong>Operator:</strong> Dapat mengelola booking, lacak unit, dan servis. Omset finansial disembunyikan dan tarif sewa armada berstatus hanya-baca (view-only).
                  </span>
                </div>
              )}

              {formData.role === 'kurir' && (
                <div className="flex items-start gap-2 bg-amber-950/30 border border-amber-800/40 rounded-xl p-2.5 text-xs text-amber-300">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    <strong>Kurir:</strong> Tampilan khusus antar/jemput unit motor dengan tombol chat WhatsApp ke penyewa dan konfirmasi serah terima di lapangan. Seluruh menu administrasi & finansial dikunci.
                  </span>
                </div>
              )}

              {formData.role === 'administrator' && (
                <div className="flex items-start gap-2 bg-rose-950/30 border border-rose-800/40 rounded-xl p-2.5 text-xs text-rose-300">
                  <Lock className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>
                    <strong>Administrator:</strong> Memiliki akses 100% tanpa batas ke seluruh data omset, booking, armada, servis, setting, user management, dan ZLCE recovery snapshot.
                  </span>
                </div>
              )}

              {/* Catatan */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Catatan / Keterangan Tugas
                </label>
                <input
                  type="text"
                  placeholder="Misal: Penanggung jawab shift pagi Dinoyo"
                  value={formData.catatan}
                  onChange={e => setFormData({ ...formData, catatan: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-4 py-2 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold px-5 py-2 rounded-xl shadow-md transition active:scale-95"
                >
                  {editingUser ? 'Simpan Perubahan' : 'Buat Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
