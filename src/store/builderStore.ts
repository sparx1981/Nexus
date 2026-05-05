import { create } from 'zustand';
import { ComponentConfig } from '../types';

interface BuilderState {
  components: ComponentConfig[];
  selectedId: string | null;
  selectedIds: Set<string>;
  currentAppId: string | null;
  history: ComponentConfig[][];
  historyIndex: number;
  
  addComponent: (component: ComponentConfig) => void;
  updateComponent: (id: string, updates: Partial<ComponentConfig>) => void;
  deleteComponent: (id: string) => void;
  deleteSelected: () => void;
  selectComponent: (id: string | null) => void;
  toggleSelectComponent: (id: string) => void;
  clearSelection: () => void;
  moveComponent: (id: string, x: number, y: number) => void;
  updateComponentSize: (id: string, width: number, height: number) => void;
  setComponentParent: (id: string, parentId: string | null, slotKey?: string | null) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  alignSelected: (direction: 'left' | 'right' | 'top' | 'bottom') => void;
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  setComponents: (components: ComponentConfig[]) => void;
  setCurrentAppId: (id: string | null) => void;
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  components: [],
  selectedId: null,
  selectedIds: new Set<string>(),
  currentAppId: null,
  history: [[]],
  historyIndex: 0,

  setCurrentAppId: (currentAppId) => set({ currentAppId }),

  addComponent: (component) => {
    const { components, history, historyIndex } = get();
    const newComponents = [...components, component];
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newComponents);
    set({ components: newComponents, selectedId: component.id, selectedIds: new Set([component.id]), history: newHistory, historyIndex: newHistory.length - 1 });
  },

  updateComponent: (id, updates) => {
    const { components, history, historyIndex } = get();
    const newComponents = components.map(c => c.id === id ? { ...c, ...updates } : c);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newComponents);
    set({ components: newComponents, history: newHistory, historyIndex: newHistory.length - 1 });
  },

  deleteComponent: (id) => {
    const { components, selectedId, selectedIds, history, historyIndex } = get();
    const newComponents = components.filter(c => c.id !== id);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newComponents);
    const newIds = new Set(selectedIds); newIds.delete(id);
    set({ components: newComponents, selectedId: selectedId === id ? null : selectedId, selectedIds: newIds, history: newHistory, historyIndex: newHistory.length - 1 });
  },

  deleteSelected: () => {
    const { components, selectedIds, selectedId, history, historyIndex } = get();
    const toDelete = selectedIds.size > 0 ? selectedIds : (selectedId ? new Set([selectedId]) : new Set<string>());
    if (toDelete.size === 0) return;
    const newComponents = components.filter(c => !toDelete.has(c.id));
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newComponents);
    set({ components: newComponents, selectedId: null, selectedIds: new Set(), history: newHistory, historyIndex: newHistory.length - 1 });
  },

  selectComponent: (id) => set({ selectedId: id, selectedIds: id ? new Set([id]) : new Set() }),

  toggleSelectComponent: (id) => {
    const { selectedIds } = get();
    const newIds = new Set(selectedIds);
    if (newIds.has(id)) newIds.delete(id); else newIds.add(id);
    const arr = Array.from(newIds);
    set({ selectedIds: newIds, selectedId: arr.length === 1 ? arr[0] : (arr.length > 0 ? arr[arr.length - 1] : null) });
  },

  clearSelection: () => set({ selectedId: null, selectedIds: new Set() }),

  moveComponent: (id, x, y) => {
    const { components } = get();
    set({ components: components.map(c => c.id === id ? { ...c, position: { x, y } } : c) });
  },

  updateComponentSize: (id, width, height) => {
    const { components } = get();
    set({ components: components.map(c => c.id === id ? { ...c, size: { width, height } } : c) });
  },

  setComponentParent: (id, parentId, slotKey = null) => {
    const { components } = get();
    set({ components: components.map(c => c.id === id ? { ...c, parentId, slotKey } : c) });
  },

  bringToFront: (id) => {
    const { components, history, historyIndex } = get();
    const idx = components.findIndex(c => c.id === id);
    if (idx === -1 || idx === components.length - 1) return;
    const newComponents = [...components.filter(c => c.id !== id), components[idx]];
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newComponents);
    set({ components: newComponents, history: newHistory, historyIndex: newHistory.length - 1 });
  },

  sendToBack: (id) => {
    const { components, history, historyIndex } = get();
    const idx = components.findIndex(c => c.id === id);
    if (idx === -1 || idx === 0) return;
    const newComponents = [components[idx], ...components.filter(c => c.id !== id)];
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newComponents);
    set({ components: newComponents, history: newHistory, historyIndex: newHistory.length - 1 });
  },

  alignSelected: (direction) => {
    const { components, selectedIds, history, historyIndex } = get();
    const ids = Array.from(selectedIds);
    if (ids.length < 2) return;
    const sel = components.filter(c => ids.includes(c.id));
    let newComponents: ComponentConfig[];
    if (direction === 'left') {
      const minX = Math.min(...sel.map(c => c.position?.x || 0));
      newComponents = components.map(c => ids.includes(c.id) ? { ...c, position: { x: minX, y: c.position?.y || 0 } } : c);
    } else if (direction === 'right') {
      const maxRight = Math.max(...sel.map(c => (c.position?.x || 0) + (c.size?.width || 200)));
      newComponents = components.map(c => ids.includes(c.id) ? { ...c, position: { x: maxRight - (c.size?.width || 200), y: c.position?.y || 0 } } : c);
    } else if (direction === 'top') {
      const minY = Math.min(...sel.map(c => c.position?.y || 0));
      newComponents = components.map(c => ids.includes(c.id) ? { ...c, position: { x: c.position?.x || 0, y: minY } } : c);
    } else {
      const maxBottom = Math.max(...sel.map(c => (c.position?.y || 0) + (c.size?.height || 80)));
      newComponents = components.map(c => ids.includes(c.id) ? { ...c, position: { x: c.position?.x || 0, y: maxBottom - (c.size?.height || 80) } } : c);
    }
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newComponents);
    set({ components: newComponents, history: newHistory, historyIndex: newHistory.length - 1 });
  },

  saveToHistory: () => {
    const { components, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(components)));
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) set({ components: history[historyIndex - 1], historyIndex: historyIndex - 1 });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) set({ components: history[historyIndex + 1], historyIndex: historyIndex + 1 });
  },

  setComponents: (components) => set({ components, history: [components], historyIndex: 0 }),
}));
