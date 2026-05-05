import { create } from 'zustand';
import { db } from '../lib/firebase';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useAuthStore } from './authStore';

export interface ReportElement {
    id: string;
    type: 'text' | 'table' | 'chart' | 'image';
    content: any;
    layout: { x: number; y: number; w: number; h: number };
}

export interface Report {
    id: string;
    name: string;
    description?: string;
    workspaceId: string;
    elements: ReportElement[];
    createdAt: string;
    published?: boolean;
}

interface ReportStore {
    reports: Report[];
    setReports: (reports: Report[]) => void;
    addReport: (report: Report) => Promise<void>;
    updateReport: (id: string, updates: Partial<Report>) => Promise<void>;
    deleteReport: (id: string) => Promise<void>;
}

export const useReportStore = create<ReportStore>((set) => ({
    reports: [],
    setReports: (reports) => set({ reports }),
    addReport: async (report) => {
        const wsId = useAuthStore.getState().selectedProjectId;
        if (!wsId) return;

        set((state) => ({ reports: [...state.reports, report] }));
        const ref = doc(db, 'workspaces', wsId, 'reports', report.id);
        await setDoc(ref, report);
    },
    updateReport: async (id, updates) => {
        const wsId = useAuthStore.getState().selectedProjectId;
        if (!wsId) return;

        set((state) => ({
            reports: state.reports.map(r => r.id === id ? { ...r, ...updates } : r)
        }));
        const ref = doc(db, 'workspaces', wsId, 'reports', id);
        await updateDoc(ref, updates);
    },
    deleteReport: async (id) => {
        const wsId = useAuthStore.getState().selectedProjectId;
        if (!wsId) return;

        set((state) => ({
            reports: state.reports.filter(r => r.id !== id)
        }));
        const ref = doc(db, 'workspaces', wsId, 'reports', id);
        await deleteDoc(ref);
    }
}));
