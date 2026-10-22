import React from 'react';
import Icon from '../Icons';
import { NAV_ITEMS } from '../../constants';

export default function BottomNav({ currentScreen, onNavigate }) {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {NAV_ITEMS.map((item) => {
        const active = currentScreen === item.id;
        return (
          <button
            key={item.id}
            className={`nav-item ${active ? 'on' : ''}`}
            onClick={() => onNavigate(item.id)}
            aria-current={active ? 'page' : undefined}
          >
            <span className="nav-icon">
              <Icon name={item.icon} size={21} />
            </span>
            <span className="nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
