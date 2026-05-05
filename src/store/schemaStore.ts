import { create } from 'zustand';
import { Table, Relationship, RestApiConnector } from '../types';
import { db } from '../lib/firebase';
import { doc, setDoc, deleteDoc, updateDoc, collection, addDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { useAuthStore } from './authStore';

interface SchemaStore {
  tables: Table[];
  relationships: Relationship[];
  restApiConnectors: RestApiConnector[];
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
  loadTables: () => () => void;
  
  // REST API Connectors
  addRestApiConnector: (connector: RestApiConnector) => Promise<void>;
  updateRestApiConnector: (id: string, updates: Partial<RestApiConnector>) => Promise<void>;
  deleteRestApiConnector: (id: string) => Promise<void>;
  setRestApiConnectors: (connectors: RestApiConnector[]) => void;
}

export const useSchemaStore = create<SchemaStore>((set, get) => ({
  tables: [],
  relationships: [],
  restApiConnectors: [],
  nodePositions: {},
  selectedTableId: null,
  setTables: (tables) => set({ tables }),
  setRelationships: (relationships) => set({ relationships }),
  setRestApiConnectors: (restApiConnectors) => set({ restApiConnectors }),
  setSelectedTableId: (selectedTableId) => set({ selectedTableId }),
  loadTables: () => {
    const wsId = useAuthStore.getState().selectedProjectId || 'default';
    
    const unsubscribe = onSnapshot(collection(db, 'workspaces', wsId, 'tables'), (snapshot) => {
      const tablesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Table));
      set({ tables: tablesData });
    });

    const unsubscribeRels = onSnapshot(collection(db, 'workspaces', wsId, 'relationships'), (snapshot) => {
      const relsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Relationship));
      set({ relationships: relsData });
    });

    const unsubscribeConnectors = onSnapshot(collection(db, 'workspaces', wsId, 'restApiConnectors'), (snapshot) => {
      const connectorsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RestApiConnector));
      set({ restApiConnectors: connectorsData });
    });

    return () => {
        unsubscribe();
        unsubscribeRels();
        unsubscribeConnectors();
    };
  },
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

    // In-memory update (optimistic)
    set((state) => ({
      tables: state.tables.map((t) =>
        t.id === tableId ? { ...t, fields: [...(t.fields || []), field] } : t
      )
    }));

    // Firestore: read-then-write to avoid race with onSnapshot overwriting optimistic state
    const tableRef = doc(db, 'workspaces', wsId, 'tables', tableId);
    try {
      const snap = await getDoc(tableRef);
      const existingFields: any[] = snap.exists() ? (snap.data()?.fields || []) : [];
      const merged = existingFields.some((f: any) => f.id === field.id)
        ? existingFields
        : [...existingFields, field];
      await setDoc(tableRef, { fields: merged }, { merge: true });
    } catch {
      const table = get().tables.find(t => t.id === tableId);
      if (table) await setDoc(tableRef, { fields: table.fields || [] }, { merge: true });
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
  updateNodePosition: async (id: string, position: { x: number; y: number }) => {
    const wsId = useAuthStore.getState().selectedProjectId;
    
    // In-memory update
    set((state) => ({
      nodePositions: { ...state.nodePositions, [id]: position }
    }));

    // Firestore persistence
    if (wsId) {
        const tableRef = doc(db, 'workspaces', wsId, 'tables', id);
        try {
            await updateDoc(tableRef, { position });
        } catch (e) {
            console.error('Failed to persist node position:', e);
        }
    }
  },
  addRestApiConnector: async (connector) => {
    const wsId = useAuthStore.getState().selectedProjectId;
    if (!wsId) return;

    set((state) => ({ restApiConnectors: [...state.restApiConnectors, connector] }));
    const connectorRef = doc(db, 'workspaces', wsId, 'restApiConnectors', connector.id);
    await setDoc(connectorRef, connector);
  },
  updateRestApiConnector: async (id, updates) => {
    const wsId = useAuthStore.getState().selectedProjectId;
    if (!wsId) return;

    set((state) => ({
      restApiConnectors: state.restApiConnectors.map((c) => (c.id === id ? { ...c, ...updates } : c))
    }));
    const connectorRef = doc(db, 'workspaces', wsId, 'restApiConnectors', id);
    await updateDoc(connectorRef, updates);
  },
  deleteRestApiConnector: async (id) => {
    const wsId = useAuthStore.getState().selectedProjectId;
    if (!wsId) return;

    set((state) => ({
      restApiConnectors: state.restApiConnectors.filter((c) => c.id !== id)
    }));
    const connectorRef = doc(db, 'workspaces', wsId, 'restApiConnectors', id);
    await deleteDoc(connectorRef);
  },
}));

