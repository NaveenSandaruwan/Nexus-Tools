import { useState, useCallback, useRef } from "react";

/**
 * Tracks a pending import with its backup and metadata
 */
export interface PendingImport {
  id: number;
  backupJson: string; // The workspace state BEFORE this import
  newJson: string;    // The new workspace state AFTER this import
  timestamp: Date;
  accepted: boolean;
}

/**
 * Hook to manage import backups and accept/reject logic
 */
export function useImportManager() {
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const backupJsonRef = useRef<string | null>(null);

  /**
   * Store the current workspace backup before importing new JSON
   */
  const backupCurrentWorkspace = useCallback((currentJson: string) => {
    backupJsonRef.current = currentJson;
  }, []);

  /**
   * Create a pending import with backup
   */
  const createPendingImport = useCallback(
    (newJson: string): PendingImport => {
      const backup = backupJsonRef.current || "{}";
      const pending: PendingImport = {
        id: Date.now(),
        backupJson: backup,
        newJson: newJson,
        timestamp: new Date(),
        accepted: false,
      };
      setPendingImport(pending);
      return pending;
    },
    []
  );

  /**
   * Accept the current pending import (it becomes the new baseline)
   */
  const acceptImport = useCallback(() => {
    if (pendingImport) {
      // Update backup to the new JSON
      backupJsonRef.current = pendingImport.newJson;
      setPendingImport(null);
      return true;
    }
    return false;
  }, [pendingImport]);

  /**
   * Reject the current pending import and restore the backup
   */
  const rejectImport = useCallback(() => {
    if (pendingImport) {
      const backup = pendingImport.backupJson;
      setPendingImport(null);
      backupJsonRef.current = backup;
      return backup;
    }
    return null;
  }, [pendingImport]);

  /**
   * Auto-accept the pending import when user sends a new message
   */
  const autoAcceptPending = useCallback(() => {
    if (pendingImport && !pendingImport.accepted) {
      backupJsonRef.current = pendingImport.newJson;
      const accepted = { ...pendingImport, accepted: true };
      setPendingImport(accepted);
      return true;
    }
    return false;
  }, [pendingImport]);

  return {
    pendingImport,
    backupCurrentWorkspace,
    createPendingImport,
    acceptImport,
    rejectImport,
    autoAcceptPending,
  };
}
