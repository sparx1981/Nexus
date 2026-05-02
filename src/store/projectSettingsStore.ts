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
    const wsId = useAuthStore.getState().selectedProjectId;
    if (!wsId) return () => {};
    
    const settingsRef = doc(db, 'workspaces', wsId);
    const unsub = onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        set({ settings: { 
          ...DEFAULT_PROJECT_SETTINGS, 
          ...data 
        } as ProjectSettings });
      }
    });
    return unsub;
  },
  setSettings: async (updates) => {
    const wsId = useAuthStore.getState().selectedProjectId;
    if (!wsId) return;
    
    const settingsRef = doc(db, 'workspaces', wsId);
    await setDoc(settingsRef, updates, { merge: true });
  },
}));
