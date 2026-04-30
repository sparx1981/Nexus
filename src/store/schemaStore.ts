import { create } from 'zustand';
import { Table, Relationship } from '../types';

interface SchemaStore {
  tables: Table[];
  relationships: Relationship[];
  nodePositions: Record<string, { x: number; y: number }>;
  addTable: (table: Table) => void;
  updateTable: (id: string, updates: Partial<Table>) => void;
  deleteTable: (id: string) => void;
  addField: (tableId: string, field: any) => void;
  addRelationship: (rel: Relationship) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
}

export const useSchemaStore = create<SchemaStore>((set) => ({
  tables: [],
  relationships: [],
  nodePositions: {},
  addTable: (table) => set((state) => ({ tables: [...state.tables, table] })),
  updateTable: (id, updates) => set((state) => ({
    tables: state.tables.map((t) => (t.id === id ? { ...t, ...updates } : t))
  })),
  deleteTable: (id) => set((state) => ({
    tables: state.tables.filter((t) => t.id !== id),
    nodePositions: Object.fromEntries(Object.entries(state.nodePositions).filter(([k]) => k !== id)),
    relationships: state.relationships.filter(
      (r) => r.sourceTableId !== id && r.targetTableId !== id
    )
  })),
  addField: (tableId, field) => set((state) => ({
    tables: state.tables.map((t) => 
      t.id === tableId ? { ...t, fields: [...t.fields, field] } : t
    )
  })),
  addRelationship: (rel) => set((state) => ({ relationships: [...state.relationships, rel] })),
  updateNodePosition: (id, position) => set((state) => ({
    nodePositions: { ...state.nodePositions, [id]: position }
  })),
}));
