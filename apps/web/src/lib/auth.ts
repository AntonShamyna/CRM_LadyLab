import { create } from 'zustand';

export type Role = 'SUPER_ADMIN' | 'MANAGER';

export interface AuthUser {
  id: string;
  login: string;
  role: Role;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setSession: (session: { accessToken: string; refreshToken?: string; user?: AuthUser }) => void;
  clearSession: () => void;
}

const stored = (() => {
  try {
    return JSON.parse(localStorage.getItem('crm-session') ?? '{}') as Partial<AuthState>;
  } catch {
    return {};
  }
})();

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: stored.accessToken ?? null,
  refreshToken: stored.refreshToken ?? null,
  user: stored.user ?? null,
  setSession: (session) =>
    set((state) => {
      const next = {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken ?? state.refreshToken,
        user: session.user ?? state.user,
      };
      localStorage.setItem('crm-session', JSON.stringify(next));
      return next;
    }),
  clearSession: () => {
    localStorage.removeItem('crm-session');
    set({ accessToken: null, refreshToken: null, user: null });
  },
}));
