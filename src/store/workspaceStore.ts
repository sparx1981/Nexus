import { create } from 'zustand';
import { db } from '../lib/firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

export interface Workspace {
    id: string;
    name: string;
    description?: string;
    ownerId: string;
    createdAt: string;
}

interface WorkspaceStore {
    currentWorkspace: Workspace | null;
    isLoading: boolean;
    setCurrentWorkspace: (workspace: Workspace | null) => void;
    fetchWorkspace: (id: string, ownerUid?: string) => Promise<void>;
    updateWorkspace: (id: string, updates: Partial<Workspace>) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
    currentWorkspace: null,
    isLoading: false,
    setCurrentWorkspace: (currentWorkspace) => set({ currentWorkspace }),
    fetchWorkspace: async (id, ownerUid) => {
        set({ isLoading: true });
        try {
            const ref = doc(db, 'workspaces', id);
            const snap = await getDoc(ref);
            if (snap.exists()) {
                set({ currentWorkspace: { id: snap.id, ...snap.data() } as Workspace });
            } else {
                // Create default workspace owned by the current user (never 'system')
                const newWS: Workspace = {
                    id,
                    name: 'Default Workspace',
                    ownerId: ownerUid || id, // fallback to the workspace ID if UID somehow missing
                    createdAt: new Date().toISOString()
                };
                await setDoc(ref, newWS);
                set({ currentWorkspace: newWS });
            }
        } finally {
            set({ isLoading: false });
        }
    },
    updateWorkspace: async (id, updates) => {
        const ref = doc(db, 'workspaces', id);
        await updateDoc(ref, updates);
        set((state) => ({
            currentWorkspace: state.currentWorkspace?.id === id ? { ...state.currentWorkspace, ...updates } : state.currentWorkspace
        }));
    }
}));
