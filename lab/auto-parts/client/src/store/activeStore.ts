import { create } from 'zustand';

interface ActiveStoreState {
  activeStoreId: number | null;
  activeStoreName: string | null;
  setActiveStore: (id: number, name: string) => void;
  clearActiveStore: () => void;
}

export const useActiveStore = create<ActiveStoreState>((set) => ({
  activeStoreId: (() => { const v = localStorage.getItem('activeStoreId'); return v ? Number(v) : null; })(),
  activeStoreName: localStorage.getItem('activeStoreName'),
  setActiveStore: (id, name) => {
    localStorage.setItem('activeStoreId', String(id));
    localStorage.setItem('activeStoreName', name);
    set({ activeStoreId: id, activeStoreName: name });
  },
  clearActiveStore: () => {
    localStorage.removeItem('activeStoreId');
    localStorage.removeItem('activeStoreName');
    set({ activeStoreId: null, activeStoreName: null });
  },
}));
