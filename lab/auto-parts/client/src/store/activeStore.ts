import { create } from 'zustand';

interface ActiveStoreState {
  activeStoreId: number | null;
  activeStoreName: string | null;
  setActiveStore: (id: number, name: string) => void;
  clearActiveStore: () => void;
}

export const useActiveStore = create<ActiveStoreState>((set) => ({
  activeStoreId: null,
  activeStoreName: null,
  setActiveStore: (id, name) => set({ activeStoreId: id, activeStoreName: name }),
  clearActiveStore: () => set({ activeStoreId: null, activeStoreName: null }),
}));
