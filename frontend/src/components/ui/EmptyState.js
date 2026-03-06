import React from "react";
import Icon from "./Icon";

function EmptyState({ icon = "inbox", title, description, action = null, className = "" }) {
  return (
    <div className={`empty-state-panel ${className}`.trim()}>
      <div className="empty-state-icon-wrap">
        <Icon name={icon} className="empty-state-icon" />
      </div>
      {title ? <h3>{title}</h3> : null}
      {description ? <p>{description}</p> : null}
      {action}
    </div>
  );
}

export default EmptyState;
