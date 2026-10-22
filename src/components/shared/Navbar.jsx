import React from 'react';
import BrandMark from './BrandMark';
import Icon from '../Icons';
import { BANK } from '../../constants';
import { initials } from '../../api';

export default function Navbar({ user, onNavigate }) {
  return (
    <header className="app-topbar">
      <button className="topbar-brand" onClick={() => onNavigate('dashboard')}>
        <BrandMark size={38} />
        <span className="topbar-brand-text">
          <strong>{BANK.shortName}</strong>
          <span>Member online</span>
        </span>
      </button>

      <div className="topbar-actions">
        <button
          className="icon-button"
          aria-label="Notifications"
          onClick={() => onNavigate('notifications')}
        >
          <Icon name="bell" size={20} />
          <span className="notif-dot" />
        </button>

        <button
          className="avatar-button"
          aria-label="Open profile"
          onClick={() => onNavigate('profile')}
        >
          {initials(user?.name)}
        </button>
      </div>
    </header>
  );
}
