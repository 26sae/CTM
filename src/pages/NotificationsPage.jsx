import React, { useState } from 'react';
import SubHeader from '../components/shared/SubHeader';
import Icon from '../components/Icons';
import { NOTIFICATION_ROWS } from '../constants';

export default function NotificationsPage({ onNavigate }) {
  const [toggles, setToggles] = useState({
    deposits: true,
    withdrawals: true,
    security: true,
    statements: true,
    promotions: false,
  });
  const [saved, setSaved] = useState(false);

  const toggle = (key) => {
    setToggles((current) => ({ ...current, [key]: !current[key] }));
    setSaved(false);
  };

  return (
    <div className="sub-page page-full">
      <SubHeader title="Notifications" subtitle="Alert preferences" onBack={() => onNavigate('profile')} />

      <div className="sub-content">
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Alert preferences</div>
              <div className="panel-sub">Choose which updates you receive.</div>
            </div>
            <Icon name="bell" size={19} style={{ color: 'var(--ink-400)' }} />
          </div>

          {NOTIFICATION_ROWS.map((row) => (
            <div className="toggle-row" key={row.key}>
              <div className="toggle-copy">
                <strong>{row.label}</strong>
                <span>{row.desc}</span>
              </div>
              <button
                type="button"
                className={`toggle ${toggles[row.key] ? 'on' : 'off'}`}
                onClick={() => toggle(row.key)}
                aria-label={`Toggle ${row.label}`}
              >
                <span className="toggle-thumb" />
              </button>
            </div>
          ))}
        </div>

        {saved && <div className="form-success">Notification preferences saved.</div>}

        <button
          className="btn btn-primary btn-block"
          onClick={() => setSaved(true)}
        >
          Save preferences
        </button>
      </div>
    </div>
  );
}
