import { AppUser, UserPermissions, UserRole } from '../types/ryoko';

export const DEFAULT_ADMIN_PERMISSIONS: UserPermissions = {
  canViewRevenue: true,
  canManageBookings: true,
  canManageTracking: true,
  canManageService: true,
  canManageFleet: true,
  canManageSettings: true,
  canManageUsers: true,
  canAccessRecovery: true,
};

export const DEFAULT_OPERATOR_PERMISSIONS: UserPermissions = {
  canViewRevenue: false,
  canManageBookings: true,
  canManageTracking: true,
  canManageService: true,
  canManageFleet: false, // View-only
  canManageSettings: false,
  canManageUsers: false,
  canAccessRecovery: false,
};

export const DEFAULT_COURIER_PERMISSIONS: UserPermissions = {
  canViewRevenue: false,
  canManageBookings: false,
  canManageTracking: false,
  canManageService: false,
  canManageFleet: false,
  canManageSettings: false,
  canManageUsers: false,
  canAccessRecovery: false,
};

export const DEFAULT_CUSTOM_ADMIN_PERMISSIONS: UserPermissions = {
  canViewRevenue: false,
  canManageBookings: true,
  canManageTracking: true,
  canManageService: true,
  canManageFleet: false,
  canManageSettings: false,
  canManageUsers: false,
  canAccessRecovery: false,
};

export function getUserEffectivePermissions(user?: AppUser | null): UserPermissions {
  if (!user) return DEFAULT_COURIER_PERMISSIONS;

  switch (user.role) {
    case 'administrator':
      return { ...DEFAULT_ADMIN_PERMISSIONS };
    case 'operator':
      return { ...DEFAULT_OPERATOR_PERMISSIONS };
    case 'kurir':
      return { ...DEFAULT_COURIER_PERMISSIONS };
    case 'admin_custom':
      return {
        ...DEFAULT_CUSTOM_ADMIN_PERMISSIONS,
        ...(user.customPermissions || {}),
      };
    default:
      return { ...DEFAULT_COURIER_PERMISSIONS };
  }
}

export const ROLE_LABELS: Record<UserRole, { label: string; badgeColor: string; description: string; icon: string }> = {
  administrator: {
    label: 'Administrator',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    description: 'All Access (Akses penuh seluruh fitur & kontrol data)',
    icon: '👑',
  },
  admin_custom: {
    label: 'Admin Custom Access',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    description: 'Akses granular yang dapat dikustomisasi per-user',
    icon: '🛠️',
  },
  operator: {
    label: 'Operator',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    description: 'Akses terbatas: operasional booking, lacak unit, & servis',
    icon: '📋',
  },
  kurir: {
    label: 'Kurir',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    description: 'Akses sangat terbatas: khusus tugas antar/jemput & WhatsApp tamu',
    icon: '🛵',
  },
};
