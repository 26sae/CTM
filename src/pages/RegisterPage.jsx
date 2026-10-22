import React, { useState } from 'react';
import { api } from '../api';
import { BANK } from '../constants';
import BrandMark from '../components/shared/BrandMark';
import Icon from '../components/Icons';

export default function RegisterPage({ onNavigate, onLogin }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Enter a valid email address.';
    }
    return '';
  };

  const validatePassword = (password) => {
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return 'Use at least one uppercase letter and one number.';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    return '';
  };

  const validateConfirm = (password, confirm) => {
    if (password !== confirm) return 'Passwords do not match.';
    return '';
  };

  const validateForm = () => {
    const nextErrors = {
      name: form.name.trim() ? '' : 'Enter your full name.',
      email: validateEmail(form.email),
      password: validatePassword(form.password),
      confirm: validateConfirm(form.password, form.confirm),
    };
    setFieldErrors(nextErrors);
    return Object.values(nextErrors).every((value) => !value);
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!validateForm()) return;

    setError('');
    setLoading(true);

    try {
      const data = await api('/api/register', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });

      onLogin(data.user);
    } catch (requestError) {
      setError(requestError.message || 'Unable to create your account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page page-full">
      <div className="auth-hero">
        <div className="auth-hero-inner">
          <button className="round-button light auth-back" onClick={() => onNavigate('login')} aria-label="Back">
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
            <span className="eyebrow">Open an account</span>
            <h1>Join the bank.</h1>
            <p>Create your online banking profile and a free checking account in minutes.</p>
          </div>
        </div>
      </div>

      <div className="auth-body">
        <form className="auth-card" onSubmit={submit}>
          <div className="auth-title">
            <h2>Create your profile</h2>
            <p>All fields are required.</p>
          </div>

          <div className="field">
            <label htmlFor="register-name">Full name</label>
            <div className="input-shell with-icon">
              <Icon name="user" size={17} className="input-icon" />
              <input
                id="register-name"
                type="text"
                autoComplete="name"
                placeholder="Juan Dela Cruz"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>
            {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
          </div>

          <div className="field">
            <label htmlFor="register-email">Email address</label>
            <div className="input-shell with-icon">
              <Icon name="mail" size={17} className="input-icon" />
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </div>
            {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
          </div>

          <div className="field">
            <label htmlFor="register-password">Password</label>
            <div className="input-shell with-icon with-action">
              <Icon name="lock" size={17} className="input-icon" />
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="At least 8 characters"
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
            <span className="field-hint">Include one uppercase letter and one number.</span>
            {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
          </div>

          <div className="field">
            <label htmlFor="register-confirm">Confirm password</label>
            <div className="input-shell with-icon">
              <Icon name="lock" size={17} className="input-icon" />
              <input
                id="register-confirm"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repeat your password"
                value={form.confirm}
                onChange={(event) => setForm({ ...form, confirm: event.target.value })}
              />
            </div>
            {fieldErrors.confirm && <span className="field-error">{fieldErrors.confirm}</span>}
          </div>

          {error && <div className="form-error">{error}</div>}

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
            {!loading && <Icon name="chevronRight" size={17} />}
          </button>

          <p className="auth-switch">
            Already registered?{' '}
            <button type="button" onClick={() => onNavigate('login')}>Sign in</button>
          </p>
        </form>

        <div className="secure-note" style={{ marginTop: 14 }}>
          <Icon name="shield" size={15} style={{ flex: 'none', marginTop: 1 }} />
          <span>New accounts are demo-only and start with a zero-balance checking account.</span>
        </div>
      </div>

      <div className="auth-footer">
        {BANK.name} · Simulation environment
      </div>
    </div>
  );
}
