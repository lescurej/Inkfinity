import { create } from 'zustand'

interface UserState {
  uuid: string
  artistName: string
  customName: string
  setUUID: (uuid: string) => void
  setArtistName: (name: string) => void
  setCustomName: (name: string) => void
  getDisplayName: () => string
}

export const useUserStore = create<UserState>((set, get) => ({
  uuid: '',
  artistName: '',
  customName: '',
  setUUID: (uuid: string) => set({ uuid }),
  setArtistName: (name: string) => set({ artistName: name }),
  setCustomName: (name: string) => set({ customName: name }),
  getDisplayName: () => {
    const { customName, artistName } = get()
    return customName || artistName || 'Unknown Artist'
  }
})) 