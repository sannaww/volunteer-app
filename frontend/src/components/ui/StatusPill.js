import React from "react";

function StatusPill({ label, tone = "neutral", className = "" }) {
  return <span className={`status-pill status-pill-${tone} ${className}`.trim()}>{label}</span>;
}

export default StatusPill;
