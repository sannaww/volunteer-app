import React from "react";

function Icon({ name, className = "", decorative = true }) {
  return (
    <span
      className={`material-symbols-rounded app-icon ${className}`.trim()}
      aria-hidden={decorative ? "true" : "false"}
    >
      {name}
    </span>
  );
}

export default Icon;
