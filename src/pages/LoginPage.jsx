import React, { useState } from 'react';
import { api } from '../api';
import { BANK } from '../constants';
import BrandMark from '../components/shared/BrandMark';
import Icon from '../components/Icons';

const DEMO_ACCOUNTS = [
  {
    label: 'Admin',
    email: 'admin@binangonanbank.test',
    password: 'Admin@123',
  },
  {
    label: 'Customer',
    email: 'customer001@binangonanbank.test',
    password: 'password123',
  },
];

export default function LoginPage({ onNavigate, onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event?.preventDefault();

    if (!form.email || !form.password) {
      setError('Enter your email address and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await api('/api/login', {
        method: 'POST',
        body: JSON.stringify(form),
      });

      onLogin(data.user);
    } catch (requestError) {
      setError(requestError.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (account) => {
    setForm({ email: account.email, password: account.password });
    setError('');
  };

  return (
    <div className="auth-page page-full">
      <div className="auth-hero">
        <div className="auth-hero-inner">
          <button className="round-button light auth-back" onClick={() => onNavigate('startup')} aria-label="Back">
            <Icon name="chevronLeft" size={19} />
          </button>

          <div className="brand-lockup">
            <BrandMark size={48} />
            <div className="brand-lockup-text" style={{ color: 'white' }}>
              <strong>{BANK.shortName}</strong>
              <span style={{ color: 'rgba(255,255,255,.48)' }}>{BANK.location}</span>
            </div>
          </div>

          <div className="auth-hero-copy">
            <span className="eyebrow">Online banking</span>
            <h1>Welcome back.</h1>
            <p>Sign in to view your balances, statements, and recent account activity.</p>
          </div>
        </div>
      </div>

      <div className="auth-body">
        <form className="auth-card" onSubmit={submit}>
          <div className="auth-title">
            <h2>Sign in</h2>
            <p>Use your Binangonan Bank online credentials.</p>
          </div>

          <div className="field">
            <label htmlFor="login-email">Email address</label>
            <div className="input-shell with-icon">
              <Icon name="mail" size={17} className="input-icon" />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="login-password">Password</label>
            <div className="input-shell with-icon with-action">
              <Icon name="lock" size={17} className="input-icon" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
              <button
                type="button"
                className="eye-button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
              </button>
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
            {!loading && <Icon name="chevronRight" size={17} />}
          </button>

          <div className="demo-card">
            <div className="demo-card-head">
              <Icon name="shield" size={14} />
              Simulation credentials
            </div>
            {DEMO_ACCOUNTS.map((account) => (
              <div className="demo-row" key={account.email}>
                <div>
                  <div style={{ fontWeight: 800 }}>{account.label}</div>
                  <code>{account.email} / {account.password}</code>
                </div>
                <button type="button" className="demo-chip" onClick={() => fillDemo(account)}>
                  Use
                </button>
              </div>
            ))}
          </div>

          <p className="auth-switch">
            No online account yet?{' '}
            <button type="button" onClick={() => onNavigate('register')}>Register</button>
          </p>
        </form>

        <div className="secure-note" style={{ marginTop: 14 }}>
          <Icon name="shield" size={15} style={{ flex: 'none', marginTop: 1 }} />
          <span>This is a fictional bank built for a security simulation. Never enter real credentials.</span>
        </div>
      </div>

      <div className="auth-footer">
        {BANK.name} · Member of the fictitious Philippine banking network
      </div>
    </div>
  );
}
