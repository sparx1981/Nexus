import { create } from 'zustand';
import { Table, Relationship } from './types';

interface SchemaStore {
  tables: Table[];
  relationships: Relationship[];
  addTable: (table: Table) => void;
  updateTable: (id: string, updates: Partial<Table>) => void;
  deleteTable: (id: string) => void;
  addRelationship: (rel: Relationship) => void;
}

export const useSchemaStore = create<SchemaStore>((set) => ({
  tables: [],
  relationships: [],
  addTable: (table) => set((state) => ({ tables: [...state.tables, table] })),
  updateTable: (id, updates) => set((state) => ({
    tables: state.tables.map((t) => (t.id === id ? { ...t, ...updates } : t))
  })),
  deleteTable: (id) => set((state) => ({
    tables: state.tables.filter((t) => t.id !== id),
    relationships: state.relationships.filter(
      (r) => r.sourceTableId !== id && r.targetTableId !== id
    )
  })),
  addRelationship: (rel) => set((state) => ({ relationships: [...state.relationships, rel] })),
}));
