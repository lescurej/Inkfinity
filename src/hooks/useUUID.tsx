import { createContext, useContext, ReactNode } from "react";
import { useUserStore } from "../store/userStore";

const UUIDContext = createContext<string | undefined>(undefined);

export const UUIDProvider = ({ children }: { children: ReactNode }) => {
  const currentUUID = useUserStore((state) => state.uuid);

  console.log("🆔 UUIDProvider - Current UUID from store:", currentUUID);

  return (
    <UUIDContext.Provider value={currentUUID}>{children}</UUIDContext.Provider>
  );
};

export const useUUID = () => {
  const uuid = useContext(UUIDContext);
  console.log("🆔 useUUID hook called - UUID:", uuid);
  if (!uuid) throw new Error("useUUID must be used within a UUIDProvider");
  return uuid;
};
