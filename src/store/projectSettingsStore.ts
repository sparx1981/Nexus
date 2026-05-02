import { create } from 'zustand';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useAuthStore } from './authStore';

export interface ProjectSettings {
  enableApplicationHeadings: boolean;
  headingBackgroundColour: string;
  headingText: string;
  headingHeight: number;
  applicationBackgroundColour: string;
  componentPrimaryColour: string;
  componentSecondaryColour: string;
  buttonColourStandard: string;
  buttonColourHover: string;
  buttonColourClicked: string;
  requireSignIn: boolean;
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  enableApplicationHeadings: true,
  headingBackgroundColour: '#1A56DB',
  headingText: '',
  headingHeight: 48,
  applicationBackgroundColour: '#ffffff',
  componentPrimaryColour: '#1A56DB',
  componentSecondaryColour: '#6B7280',
  buttonColourStandard: '#1A56DB',
  buttonColourHover: '#1E40AF',
  buttonColourClicked: '#1E3A8A',
  requireSignIn: false,
};

interface ProjectSettingsStore {
  settings: ProjectSettings;
  setSettings: (settings: Partial<ProjectSettings>) => Promise<void>;
  loadSettings: () => () => void;
}

export const useProjectSettingsStore = create<ProjectSettingsStore>((set) => ({
  settings: DEFAULT_PROJECT_SETTINGS,
  loadSettings: () => {
    const wsId = useAuthStore.getState().selectedProjectId || 'default';
    const settingsRef = doc(db, 'workspaces', wsId, 'config', 'projectSettings');
    const unsub = onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) {
        set({ settings: { ...DEFAULT_PROJECT_SETTINGS, ...snap.data() } as ProjectSettings });
      }
    });
    return unsub;
  },
  setSettings: async (updates) => {
    const wsId = useAuthStore.getState().selectedProjectId || 'default';
    set((state) => ({ settings: { ...state.settings, ...updates } }));
    const settingsRef = doc(db, 'workspaces', wsId, 'config', 'projectSettings');
    const current = useProjectSettingsStore.getState().settings;
    await setDoc(settingsRef, { ...current, ...updates }, { merge: true });
  },
}));
