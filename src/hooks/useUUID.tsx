import { createContext, useContext, useRef, ReactNode, useEffect } from "react";
import { uuidv4 } from "../utils/uuid";
import { useUserStore } from "../store/userStore";

const UUIDContext = createContext<string | undefined>(undefined);

export const UUIDProvider = ({ children }: { children: ReactNode }) => {
  const uuidRef = useRef<string>(uuidv4());
  const setUUID = useUserStore((state) => (state as any).setUUID);

  useEffect(() => {
    if (setUUID) {
      setUUID(uuidRef.current);
    }
  }, [setUUID]);

  return (
    <UUIDContext.Provider value={uuidRef.current}>
      {children}
    </UUIDContext.Provider>
  );
};

export const useUUID = () => {
  const uuid = useContext(UUIDContext);
  if (!uuid) throw new Error("useUUID must be used within a UUIDProvider");
  return uuid;
};
