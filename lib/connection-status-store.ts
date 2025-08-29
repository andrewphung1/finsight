import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ConnectionStatus = 'connected' | 'refreshing' | 'disconnected'

interface ConnectionStatusStore {
  status: ConnectionStatus
  lastFetchTime: number
  setStatus: (status: ConnectionStatus) => void
  setLastFetchTime: (time: number) => void
  shouldFetchData: () => boolean
  isConnected: () => boolean
}

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

export const useConnectionStatusStore = create<ConnectionStatusStore>()(
  persist(
    (set, get) => ({
      status: 'disconnected',
      lastFetchTime: 0,
      setStatus: (status) => set({ status }),
      setLastFetchTime: (time) => set({ lastFetchTime: time }),
      shouldFetchData: () => {
        const { lastFetchTime } = get()
        const now = Date.now()
        return (now - lastFetchTime) >= TWENTY_FOUR_HOURS
      },
      isConnected: () => {
        const { lastFetchTime } = get()
        const now = Date.now()
        return (now - lastFetchTime) < TWENTY_FOUR_HOURS
      }
    }),
    {
      name: 'connection-status-store',
      partialize: (state) => ({ 
        status: state.status, 
        lastFetchTime: state.lastFetchTime 
      })
    }
  )
)
