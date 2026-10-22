import React from 'react';
import SubHeader from '../components/shared/SubHeader';
import BrandMark from '../components/shared/BrandMark';
import Icon from '../components/Icons';
import { BANK } from '../constants';

export default function AboutPage({ onNavigate }) {
  return (
    <div className="sub-page page-full">
      <SubHeader title="About the bank" subtitle="Who we are" onBack={() => onNavigate('profile')} />

      <div className="sub-content">
        <div className="about-brand">
          <BrandMark size={58} variant="gold" />
          <h2>{BANK.name}</h2>
          <p>{BANK.tagline}</p>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Application details</div>
              <div className="panel-sub">Fictional banking environment</div>
            </div>
            <Icon name="info" size={19} style={{ color: 'var(--ink-400)' }} />
          </div>

          <div className="info-list">
            <div className="info-row"><span>Version</span><strong>{BANK.version}</strong></div>
            <div className="info-row"><span>Platform</span><strong>Web / Mobile</strong></div>
            <div className="info-row"><span>Head office</span><strong>{BANK.location}</strong></div>
            <div className="info-row"><span>Currency</span><strong>PHP</strong></div>
            <div className="info-row"><span>Environment</span><strong>Security simulation</strong></div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">A fictional bank</div>
              <div className="panel-sub">Built for cybersecurity training</div>
            </div>
            <Icon name="shield" size={19} style={{ color: 'var(--ink-400)' }} />
          </div>
          <p style={{ fontSize: '0.74rem', lineHeight: 1.65, color: 'var(--ink-500)' }}>
            Binangonan Banking Corporation is a dummy retail banking application created to demonstrate
            authentication weaknesses, SQL injection, credential stuffing, and denial-of-service exposure.
            It is not affiliated with any real financial institution.
          </p>
          <div className="form-error">
            Do not enter real personal, financial, or login information into this application.
          </div>
        </div>

        <div className="secure-note" style={{ justifyContent: 'center' }}>
          <span>© {new Date().getFullYear()} Binangonan Banking Corporation · Simulation build</span>
        </div>
      </div>
    </div>
  );
}
