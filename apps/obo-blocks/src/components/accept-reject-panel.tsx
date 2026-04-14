"use client";

import { useState, useEffect } from "react";
import type { PendingImport } from "@/hooks/use-import-manager";
import "./accept-reject-panel.css";

interface AcceptRejectPanelProps {
  pendingImport: PendingImport | null;
  onAccept: () => void;
  onReject: () => void;
}

export function AcceptRejectPanel({
  pendingImport,
  onAccept,
  onReject,
}: AcceptRejectPanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (pendingImport && !pendingImport.accepted) {
      setIsVisible(true);
      // Trigger animation
      setTimeout(() => setIsAnimating(true), 10);
    }
  }, [pendingImport]);

  const handleAccept = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onAccept();
      setIsVisible(false);
    }, 300);
  };

  const handleReject = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onReject();
      setIsVisible(false);
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div
      className={`accept-reject-panel ${isAnimating ? "visible" : ""}`}
      role="alert"
      aria-live="polite"
    >
      <div className="panel-content">
        <p className="panel-message">
          ✨ <strong>Code imported!</strong> Do you want to keep these changes?
        </p>
        <div className="button-group">
          <button
            className="btn btn-accept"
            onClick={handleAccept}
            title="Accept and keep the imported code"
          >
            ✓ Accept
          </button>
          <button
            className="btn btn-reject"
            onClick={handleReject}
            title="Reject and revert to previous code"
          >
            ✕ Reject
          </button>
        </div>
        <p className="hint-text">
          💡 If you ask another question without responding, I'll consider it accepted.
        </p>
      </div>
    </div>
  );
}
