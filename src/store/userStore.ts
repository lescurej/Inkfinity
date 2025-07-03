import { create } from 'zustand'

interface UserState {
  uuid: string
  artistName: string
  customName: string
  isInitialized: boolean
  setUUID: (uuid: string) => void
  setArtistName: (name: string) => void
  setCustomName: (name: string) => void
  setInitialized: (initialized: boolean) => void
  getDisplayName: () => string
}

export const useUserStore = create<UserState>((set, get) => ({
  uuid: '',
  artistName: '',
  customName: '',
  isInitialized: false,
  setUUID: (uuid: string) => {
    console.log('🆔 Setting UUID:', uuid);
    console.log('🆔 Previous UUID:', get().uuid);
    set({ uuid });
    console.log('✅ New UUID in store:', get().uuid);
  },
  setArtistName: (name: string) => {
    console.log('🎨 Setting artist name:', name);
    console.log('🎨 Previous artist name:', get().artistName);
    set({ artistName: name, isInitialized: true });
    console.log('✅ New artist name in store:', get().artistName);
  },
  setCustomName: (name: string) => {
    console.log('✏️ Setting custom name:', name);
    set({ customName: name });
  },
  setInitialized: (initialized: boolean) => {
    set({ isInitialized: initialized });
  },
  getDisplayName: () => {
    const { customName, artistName, uuid } = get();
    const displayName = customName || artistName || 'Unknown Artist';
    if (process.env.NODE_ENV === 'development' && displayName === 'Unknown Artist') {
      console.log('🎨 Getting display name:', { customName, artistName, uuid, displayName });
    }
    return displayName;
  }
})) 