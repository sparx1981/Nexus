import { create } from 'zustand';
import { db } from '../lib/firebase';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useAuthStore } from './authStore';
import { Dashboard, DashboardCard } from '../types/dashboard';

interface DashboardStore {
    dashboards: Dashboard[];
    selectedDashboardId: string | null;
    setDashboards: (dashboards: Dashboard[]) => void;
    setSelectedDashboardId: (id: string | null) => void;
    addDashboard: (dashboard: Dashboard) => Promise<void>;
    updateDashboard: (id: string, updates: Partial<Dashboard>) => Promise<void>;
    deleteDashboard: (id: string) => Promise<void>;
    addCard: (dashboardId: string, card: DashboardCard) => Promise<void>;
    updateCard: (dashboardId: string, cardId: string, updates: Partial<DashboardCard>) => Promise<void>;
    deleteCard: (dashboardId: string, cardId: string) => Promise<void>;
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
    dashboards: [],
    selectedDashboardId: null,
    setDashboards: (dashboards) => set({ dashboards }),
    setSelectedDashboardId: (selectedDashboardId) => set({ selectedDashboardId }),
    addDashboard: async (dashboard) => {
        const wsId = useAuthStore.getState().selectedProjectId;
        if (!wsId) return;

        set((state) => ({ dashboards: [...state.dashboards, dashboard] }));
        const ref = doc(db, 'workspaces', wsId, 'dashboards', dashboard.id);
        await setDoc(ref, dashboard);
    },
    updateDashboard: async (id, updates) => {
        const wsId = useAuthStore.getState().selectedProjectId;
        if (!wsId) return;

        set((state) => ({
            dashboards: state.dashboards.map(d => d.id === id ? { ...d, ...updates } : d)
        }));
        const ref = doc(db, 'workspaces', wsId, 'dashboards', id);
        await updateDoc(ref, updates);
    },
    deleteDashboard: async (id) => {
        const wsId = useAuthStore.getState().selectedProjectId;
        if (!wsId) return;

        set((state) => ({
            dashboards: state.dashboards.filter(d => d.id !== id),
            selectedDashboardId: state.selectedDashboardId === id ? null : state.selectedDashboardId
        }));
        const ref = doc(db, 'workspaces', wsId, 'dashboards', id);
        await deleteDoc(ref);
    },
    addCard: async (dashboardId, card) => {
        const wsId = useAuthStore.getState().selectedProjectId;
        if (!wsId) return;

        set((state) => ({
            dashboards: state.dashboards.map(d => {
                if (d.id === dashboardId) {
                    return { ...d, cards: [...d.cards, card] };
                }
                return d;
            })
        }));
        const dashboard = get().dashboards.find(d => d.id === dashboardId);
        if (dashboard) {
            const ref = doc(db, 'workspaces', wsId, 'dashboards', dashboardId);
            await updateDoc(ref, { cards: dashboard.cards });
        }
    },
    updateCard: async (dashboardId, cardId, updates) => {
        const wsId = useAuthStore.getState().selectedProjectId;
        if (!wsId) return;

        set((state) => ({
            dashboards: state.dashboards.map(d => {
                if (d.id === dashboardId) {
                    return {
                        ...d,
                        cards: d.cards.map(c => c.id === cardId ? { ...c, ...updates } : c)
                    };
                }
                return d;
            })
        }));
        const dashboard = get().dashboards.find(d => d.id === dashboardId);
        if (dashboard) {
            const ref = doc(db, 'workspaces', wsId, 'dashboards', dashboardId);
            await updateDoc(ref, { cards: dashboard.cards });
        }
    },
    deleteCard: async (dashboardId, cardId) => {
        const wsId = useAuthStore.getState().selectedProjectId;
        if (!wsId) return;

        set((state) => ({
            dashboards: state.dashboards.map(d => {
                if (d.id === dashboardId) {
                    return {
                        ...d,
                        cards: d.cards.filter(c => c.id !== cardId)
                    };
                }
                return d;
            })
        }));
        const dashboard = get().dashboards.find(d => d.id === dashboardId);
        if (dashboard) {
            const ref = doc(db, 'workspaces', wsId, 'dashboards', dashboardId);
            await updateDoc(ref, { cards: dashboard.cards });
        }
    }
}));
