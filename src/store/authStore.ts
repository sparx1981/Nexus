import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  selectedProjectId: string | null;
  trimbleToken: string | null;
  trimbleUserId: string | null;
  setUser: (user: User | null) => void;
  setSelectedProjectId: (projectId: string | null) => void;
  setTrimbleAuth: (token: string, userId: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  selectedProjectId: localStorage.getItem('nexus_project_id'),
  trimbleToken: sessionStorage.getItem('trimble_token'),
  trimbleUserId: sessionStorage.getItem('trimble_user_id'),
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  setSelectedProjectId: (projectId) => {
    if (projectId) localStorage.setItem('nexus_project_id', projectId);
    else localStorage.removeItem('nexus_project_id');
    set({ selectedProjectId: projectId });
  },
  setTrimbleAuth: (token, userId) => {
    sessionStorage.setItem('trimble_token', token);
    sessionStorage.setItem('trimble_user_id', userId);
    set({ trimbleToken: token, trimbleUserId: userId });
  },
  logout: () => {
    import('../lib/firebase').then(({ auth }) => auth.signOut());
    localStorage.removeItem('nexus_project_id');
    sessionStorage.removeItem('trimble_token');
    sessionStorage.removeItem('trimble_user_id');
    set({ user: null, isAuthenticated: false, selectedProjectId: null, trimbleToken: null, trimbleUserId: null });
  },
}));
