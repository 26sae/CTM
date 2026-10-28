import React, { useEffect, useState } from 'react';
import Icon from '../components/Icons';
import { api, formatMoney, initials } from '../api';
import { PROFILE_MENU } from '../constants';

export default function ProfilePage({ user, onLogout, onNavigate }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    api(`/api/accounts?userId=${user.id}`)
      .then((rows) => {
        if (active) setAccounts(rows || []);
      })
      .catch(() => {
        if (active) setAccounts([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [user.id]);

  const total = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const joined = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })
    : '—';

  return (
    <div className="sub-page page-full" style={{ background: 'var(--bg)' }}>
      <header className="profile-hero">
        <div className="profile-avatar">{initials(user.name)}</div>
        {/* DEFENSE — XSS: rendered as text so React escapes any stored HTML.
            Previously this used dangerouslySetInnerHTML with user.name. */}
        <h1 className="profile-name">{user.name}</h1>
        <p className="profile-email">{user.email}</p>
        <span className="profile-badge">
          <Icon name="shield" size={11} />
          {user.role === 'admin' ? 'Bank administrator' : 'Verified customer'}
        </span>
      </header>

      <div className="profile-stats">
        <div className="profile-stat">
          <strong>{loading ? '—' : accounts.length}</strong>
          <span>Accounts</span>
        </div>
        <div className="profile-stat">
          <strong>{loading ? '—' : formatMoney(total)}</strong>
          <span>Total balance</span>
        </div>
        <div className="profile-stat">
          <strong>{joined}</strong>
          <span>Member since</span>
        </div>
      </div>

      {user.role === 'admin' && (
        <div className="menu-list" style={{ paddingBottom: 0 }}>
          <button className="menu-item" onClick={() => onNavigate('admin')}>
            <span className="menu-icon gold"><Icon name="users" size={18} /></span>
            <span className="menu-text">
              <strong>Admin back office</strong>
              <span>Accounts, customers, and security logs</span>
            </span>
            <Icon name="chevronRight" size={17} className="menu-arrow" />
          </button>
        </div>
      )}

      <div className="menu-list">
        {PROFILE_MENU.map((item) => (
          <button key={item.to} className="menu-item" onClick={() => onNavigate(item.to)}>
            <span className={`menu-icon ${item.tint}`}>
              <Icon name={item.icon} size={18} />
            </span>
            <span className="menu-text">
              <strong>{item.label}</strong>
              <span>{item.sub}</span>
            </span>
            <Icon name="chevronRight" size={17} className="menu-arrow" />
          </button>
        ))}
      </div>

      <div className="sub-content" style={{ paddingTop: 18, paddingBottom: 26 }}>
        <div className="panel">
          <div className="info-list">
            <div className="info-row">
              <span>Phone</span>
              <strong>{user.phone || 'Not provided'}</strong>
            </div>
            <div className="info-row">
              <span>Address</span>
              <strong>{user.address || 'Not provided'}</strong>
            </div>
            <div className="info-row">
              <span>Account status</span>
              <strong style={{ textTransform: 'capitalize' }}>{user.status || 'active'}</strong>
            </div>
          </div>
        </div>

        <button className="logout-button" onClick={onLogout}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Icon name="logout" size={17} />
            Sign out
          </span>
        </button>
      </div>
    </div>
  );
}
