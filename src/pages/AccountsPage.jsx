import React, { useEffect, useState } from 'react';
import SubHeader from '../components/shared/SubHeader';
import Icon from '../components/Icons';
import { api, formatDate, formatMoney, statusTone } from '../api';
import { ACCOUNT_META } from '../constants';

export default function AccountsPage({ user, onNavigate }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const rows = await api(`/api/accounts?userId=${user.id}`);
        if (active) setAccounts(rows || []);
      } catch (requestError) {
        if (active) setError(requestError.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [user.id]);

  const total = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);

  return (
    <div className="sub-page page-full">
      <SubHeader
        title="Your accounts"
        subtitle="Balances and account details"
        onBack={() => onNavigate('dashboard')}
      />

      <div className="sub-content">
        <section className="summary-card">
          <span>Combined available balance</span>
          <strong>{formatMoney(total)}</strong>
          <p>{accounts.length} account{accounts.length === 1 ? '' : 's'} held with Binangonan Bank</p>
        </section>

        {loading && (
          <div className="stack">
            <div className="skeleton" style={{ height: 180 }} />
            <div className="skeleton" style={{ height: 180 }} />
          </div>
        )}

        {!loading && error && <div className="form-error">{error}</div>}

        {!loading && !error && accounts.length === 0 && (
          <div className="empty-state">
            <span className="empty-state-icon"><Icon name="wallet" size={22} /></span>
            <strong>No accounts on file</strong>
            <p>Please contact Binangonan Bank support or visit a branch to open an account.</p>
          </div>
        )}

        {!loading && accounts.map((account) => {
          const meta = ACCOUNT_META[account.account_type] || ACCOUNT_META.Checking;
          return (
            <article className="panel" key={account.id}>
              <div className="panel-head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`account-type-icon ${account.account_type === 'Savings' ? 'tone-green' : ''}`}
                    style={account.account_type === 'Credit' ? { background: 'var(--gold-100)', color: 'var(--gold-600)' } : undefined}
                  >
                    <Icon name={meta.icon} size={17} />
                  </span>
                  <div>
                    <div className="panel-title">{account.account_type} account</div>
                    <div className="panel-sub">{meta.desc}</div>
                  </div>
                </div>
                <span className={`badge badge-${statusTone(account.status)}`}>{account.status}</span>
              </div>

              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.6px', color: 'var(--navy-900)' }}>
                  {formatMoney(account.balance, account.currency || 'PHP')}
                </div>
                <div className="account-number" style={{ marginTop: 4 }}>
                  {account.account_number}
                </div>
              </div>

              <div className="info-list">
                <div className="info-row">
                  <span>Account type</span>
                  <strong>{account.account_type}</strong>
                </div>
                <div className="info-row">
                  <span>Currency</span>
                  <strong>{account.currency || 'PHP'}</strong>
                </div>
                <div className="info-row">
                  <span>Opened</span>
                  <strong>{formatDate(account.created_at)}</strong>
                </div>
              </div>
            </article>
          );
        })}

        <div className="secure-note">
          <Icon name="info" size={15} style={{ flex: 'none', marginTop: 1 }} />
          <span>Balances shown are fictitious and intended only for the security simulation.</span>
        </div>
      </div>
    </div>
  );
}
