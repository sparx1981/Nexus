import { create } from 'zustand';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useAuthStore } from './authStore';

export interface ProjectSettings {
  enableApplicationHeadings: boolean;
  headingBackgroundColour: string;
  headingText: string;
  headingHeight: number;
  headingLogoUrl: string;
  headingFontFamily: string;
  applicationBackgroundColour: string;
  componentPrimaryColour: string;
  componentSecondaryColour: string;
  labelFontFamily: string;
  textFontFamily: string;
  buttonColourStandard: string;
  buttonColourHover: string;
  buttonColourClicked: string;
  requireSignIn: boolean;
  // Navigation menu
  menuEnabled: boolean;
  menuType: 'burger-left' | 'burger-right' | 'slide-left';
  menuAppIds: string[];  // ordered list of app IDs to show in the menu
  menuColour: string | null; // null = same as header background
  // App component colours
  textColour: string;
}

export const FONT_OPTIONS = [
  { label: 'System Default',   value: 'system-ui, sans-serif' },
  { label: 'Inter',            value: "'Inter', sans-serif" },
  { label: 'Roboto',           value: "'Roboto', sans-serif" },
  { label: 'Open Sans',        value: "'Open Sans', sans-serif" },
  { label: 'Lato',             value: "'Lato', sans-serif" },
  { label: 'Poppins',          value: "'Poppins', sans-serif" },
  { label: 'Montserrat',       value: "'Montserrat', sans-serif" },
  { label: 'Nunito',           value: "'Nunito', sans-serif" },
  { label: 'Source Sans 3',    value: "'Source Sans 3', sans-serif" },
  { label: 'DM Sans',          value: "'DM Sans', sans-serif" },
  { label: 'Georgia',          value: "Georgia, serif" },
  { label: 'Merriweather',     value: "'Merriweather', serif" },
  { label: 'Playfair Display', value: "'Playfair Display', serif" },
];

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  enableApplicationHeadings: true,
  headingBackgroundColour: '#1A56DB',
  headingText: '',
  headingHeight: 48,
  headingLogoUrl: '',
  headingFontFamily: 'system-ui, sans-serif',
  applicationBackgroundColour: '#ffffff',
  componentPrimaryColour: '#1A56DB',
  componentSecondaryColour: '#6B7280',
  labelFontFamily: 'system-ui, sans-serif',
  textFontFamily: 'system-ui, sans-serif',
  buttonColourStandard: '#1A56DB',
  buttonColourHover: '#1E40AF',
  buttonColourClicked: '#1E3A8A',
  requireSignIn: false,
  menuEnabled: false,
  menuType: 'burger-left',
  menuAppIds: [],
  menuColour: null,
  textColour: '#111827',
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
    // Never persist large base64 logo inline — store separately if needed
    await setDoc(settingsRef, { ...current, ...updates }, { merge: true });
  },
}));
