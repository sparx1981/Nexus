import { create } from 'zustand';
import { ComponentConfig } from '../types';

interface BuilderState {
  components: ComponentConfig[];
  selectedId: string | null;
  currentAppId: string | null;
  history: ComponentConfig[][];
  historyIndex: number;
  
  addComponent: (component: ComponentConfig) => void;
  updateComponent: (id: string, updates: Partial<ComponentConfig>) => void;
  deleteComponent: (id: string) => void;
  selectComponent: (id: string | null) => void;
  moveComponent: (id: string, x: number, y: number) => void;
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  setComponents: (components: ComponentConfig[]) => void;
  setCurrentAppId: (id: string | null) => void;
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  components: [],
  selectedId: null,
  currentAppId: null,
  history: [[]],
  historyIndex: 0,

  setCurrentAppId: (currentAppId) => set({ currentAppId }),
  addComponent: (component) => {
    const { components, history, historyIndex } = get();
    const newComponents = [...components, component];
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newComponents);
    
    set({
      components: newComponents,
      selectedId: component.id,
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
  },

  updateComponent: (id, updates) => {
    const { components, history, historyIndex } = get();
    const newComponents = components.map(c => c.id === id ? { ...c, ...updates } : c);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newComponents);

    set({
      components: newComponents,
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
  },

  deleteComponent: (id) => {
    const { components, selectedId, history, historyIndex } = get();
    const newComponents = components.filter(c => c.id !== id);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newComponents);

    set({
      components: newComponents,
      selectedId: selectedId === id ? null : selectedId,
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
  },

  selectComponent: (id) => set({ selectedId: id }),

  moveComponent: (id, x, y) => {
    const { components } = get();
    set({
      components: components.map(c => c.id === id ? { ...c, position: { x, y } } : c)
    });
  },

  saveToHistory: () => {
     const { components, history, historyIndex } = get();
     const newHistory = history.slice(0, historyIndex + 1);
     newHistory.push(JSON.parse(JSON.stringify(components)));
     set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      set({
        components: history[historyIndex - 1],
        historyIndex: historyIndex - 1
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      set({
        components: history[historyIndex + 1],
        historyIndex: historyIndex + 1
      });
    }
  },
  setComponents: (components) => {
    set({
      components,
      history: [components],
      historyIndex: 0
    });
  }
}));
