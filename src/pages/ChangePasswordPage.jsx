import React, { useState } from 'react';
import SubHeader from '../components/shared/SubHeader';
import Icon from '../components/Icons';
import { api } from '../api';

export default function ChangePasswordPage({ user, onNavigate }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.current || !form.next || !form.confirm) {
      setError('Complete all password fields.');
      return;
    }

    if (form.next !== form.confirm) {
      setError('New passwords do not match.');
      return;
    }

    if (form.next.length < 8) {
      setError('Your new password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      await api(`/api/users/${user.id}/password`, {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: form.current,
          newPassword: form.next,
        }),
      });
      setForm({ current: '', next: '', confirm: '' });
      setSuccess('Password changed successfully.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sub-page page-full">
      <SubHeader title="Change password" subtitle="Account security" onBack={() => onNavigate('profile')} />

      <form className="sub-content" onSubmit={submit}>
        <div className="panel">
          <div className="form-grid">
            <div className="field">
              <label htmlFor="current-password">Current password</label>
              <div className="input-shell with-icon">
                <Icon name="lock" size={17} className="input-icon" />
                <input
                  id="current-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter current password"
                  value={form.current}
                  onChange={(event) => setForm({ ...form, current: event.target.value })}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="new-password">New password</label>
              <div className="input-shell with-icon with-action">
                <Icon name="lock" size={17} className="input-icon" />
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={form.next}
                  onChange={(event) => setForm({ ...form, next: event.target.value })}
                />
                <button
                  type="button"
                  className="eye-button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
                >
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
                </button>
              </div>
            </div>

            <div className="field">
              <label htmlFor="confirm-password">Confirm new password</label>
              <div className="input-shell with-icon">
                <Icon name="lock" size={17} className="input-icon" />
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Repeat new password"
                  value={form.confirm}
                  onChange={(event) => setForm({ ...form, confirm: event.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
          {loading ? 'Updating…' : 'Update password'}
        </button>

        <div className="secure-note">
          <Icon name="shield" size={15} style={{ flex: 'none', marginTop: 1 }} />
          <span>This demo stores passwords in plain text intentionally, as part of the simulation.</span>
        </div>
      </form>
    </div>
  );
}
