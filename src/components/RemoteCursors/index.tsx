import React from "react";
import ArtistNameEditor from "../ArtistNameEditor";
import RemoteCursor from "./RemoteCursor";
import { useRemoteCursors } from "./hooks/useRemoteCursors";

const RemoteCursors: React.FC = () => {
  const { visibleCursors, getDisplayName } = useRemoteCursors();

  return (
    <>
      <ArtistNameEditor />
      {visibleCursors.map((cursor) => (
        <RemoteCursor
          key={cursor.uuid}
          cursor={cursor}
          displayName={getDisplayName(cursor.uuid)}
        />
      ))}
    </>
  );
};

export default RemoteCursors;
