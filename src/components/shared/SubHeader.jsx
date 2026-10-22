import React from 'react';
import Icon from '../Icons';

export default function SubHeader({ title, subtitle, onBack, action }) {
  return (
    <header className="sub-header">
      <div className="sub-header-row">
        <button className="round-button light" onClick={onBack} aria-label="Go back">
          <Icon name="chevronLeft" size={20} />
        </button>
        <div className="sub-header-text">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action || <span className="sub-header-spacer" />}
      </div>
    </header>
  );
}
