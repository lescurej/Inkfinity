import React, { createContext, useContext, useRef, ReactNode } from 'react'
import { uuidv4 } from '../utils/uuid'

const UUIDContext = createContext<string | undefined>(undefined)

export const UUIDProvider = ({ children }: { children: ReactNode }) => {
  const uuidRef = useRef<string>(uuidv4())
  return (
    <UUIDContext.Provider value={uuidRef.current}>
      {children}
    </UUIDContext.Provider>
  )
}

export const useUUID = () => {
  const uuid = useContext(UUIDContext)
  if (!uuid) throw new Error('useUUID must be used within a UUIDProvider')
  return uuid
} 