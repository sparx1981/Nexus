import { create } from 'zustand';
import { Table, Relationship } from '../types';
import { db } from '../lib/firebase';
import { doc, setDoc, deleteDoc, updateDoc, collection, addDoc, getDoc } from 'firebase/firestore';
import { useAuthStore } from './authStore';

interface SchemaStore {
  tables: Table[];
  relationships: Relationship[];
  nodePositions: Record<string, { x: number; y: number }>;
  selectedTableId: string | null;
  addTable: (table: Table) => Promise<void>;
  updateTable: (id: string, updates: Partial<Table>) => Promise<void>;
  deleteTable: (id: string) => Promise<void>;
  addField: (tableId: string, field: any) => Promise<void>;
  addRelationship: (rel: Relationship) => Promise<void>;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  setTables: (tables: Table[]) => void;
  setRelationships: (rels: Relationship[]) => void;
  setSelectedTableId: (id: string | null) => void;
}

export const useSchemaStore = create<SchemaStore>((set, get) => ({
  tables: [],
  relationships: [],
  nodePositions: {},
  selectedTableId: null,
  setTables: (tables) => set({ tables }),
  setRelationships: (relationships) => set({ relationships }),
  setSelectedTableId: (selectedTableId) => set({ selectedTableId }),
  addTable: async (table) => {
    const wsId = useAuthStore.getState().selectedProjectId;
    if (!wsId) return;
    
    // In-memory update
    set((state) => ({ tables: [...state.tables, table] }));
    // Firestore persistence
    const tableRef = doc(db, 'workspaces', wsId, 'tables', table.id);
    await setDoc(tableRef, table);
  },
  updateTable: async (id, updates) => {
    const wsId = useAuthStore.getState().selectedProjectId;
    if (!wsId) return;

    // In-memory update
    set((state) => ({
      tables: state.tables.map((t) => (t.id === id ? { ...t, ...updates } : t))
    }));
    // Firestore persistence
    const tableRef = doc(db, 'workspaces', wsId, 'tables', id);
    await updateDoc(tableRef, updates);
  },
  deleteTable: async (id) => {
    const wsId = useAuthStore.getState().selectedProjectId;
    if (!wsId) return;

    // In-memory update
    set((state) => ({
      tables: state.tables.filter((t) => t.id !== id),
      nodePositions: Object.fromEntries(Object.entries(state.nodePositions).filter(([k]) => k !== id)),
      relationships: state.relationships.filter(
        (r) => r.sourceTableId !== id && r.targetTableId !== id
      )
    }));
    // Firestore persistence
    const tableRef = doc(db, 'workspaces', wsId, 'tables', id);
    await deleteDoc(tableRef);
  },
  addField: async (tableId, field) => {
    const wsId = useAuthStore.getState().selectedProjectId;
    if (!wsId) return;

    // In-memory update
    set((state) => ({
      tables: state.tables.map((t) => 
        t.id === tableId ? { ...t, fields: [...t.fields, field] } : t
      )
    }));
    // Firestore persistence
    const tableRef = doc(db, 'workspaces', wsId, 'tables', tableId);
    const table = get().tables.find(t => t.id === tableId);
    if (table) {
        await updateDoc(tableRef, { fields: table.fields });
    }
  },
  addRelationship: async (rel) => {
    const wsId = useAuthStore.getState().selectedProjectId;
    if (!wsId) return;

    // In-memory update
    set((state) => ({ relationships: [...state.relationships, rel] }));
    // Firestore persistence
    const relRef = doc(db, 'workspaces', wsId, 'relationships', rel.id);
    await setDoc(relRef, rel);
  },
  updateNodePosition: (id, position) => set((state) => ({
    nodePositions: { ...state.nodePositions, [id]: position }
  })),
}));

