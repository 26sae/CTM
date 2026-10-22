import React, { useState } from 'react';
import SubHeader from '../components/shared/SubHeader';
import Icon from '../components/Icons';
import { api } from '../api';

export default function EditProfilePage({ user, onNavigate, onUpdateUser }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const save = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim()) {
      setError('Your name cannot be empty.');
      return;
    }

    setLoading(true);

    try {
      const data = await api(`/api/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      onUpdateUser(data.user);
      setSuccess('Profile updated successfully.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sub-page page-full">
      <SubHeader title="Edit profile" subtitle="Personal information" onBack={() => onNavigate('profile')} />

      <form className="sub-content" onSubmit={save}>
        <div className="panel" style={{ alignItems: 'center', gap: 10 }}>
          <div className="profile-avatar" style={{ width: 68, height: 68, fontSize: '1.2rem' }}>
            {form.name
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase())
              .join('') || 'BB'}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="panel-title">{form.name || 'Your name'}</div>
            <div className="panel-sub">Customer profile</div>
          </div>
        </div>

        <div className="panel">
          <div className="form-grid">
            <div className="field">
              <label htmlFor="edit-name">Full name</label>
              <div className="input-shell with-icon">
                <Icon name="user" size={17} className="input-icon" />
                <input
                  id="edit-name"
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="edit-email">Email address</label>
              <div className="input-shell with-icon">
                <Icon name="mail" size={17} className="input-icon" />
                <input id="edit-email" type="email" value={user?.email || ''} disabled />
              </div>
              <span className="field-hint">Email changes require a branch visit.</span>
            </div>

            <div className="field">
              <label htmlFor="edit-phone">Mobile number</label>
              <div className="input-shell with-icon">
                <Icon name="phone" size={17} className="input-icon" />
                <input
                  id="edit-phone"
                  type="tel"
                  placeholder="+63 912 345 6789"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="edit-address">Home address</label>
              <textarea
                id="edit-address"
                className="textarea"
                placeholder="Street, barangay, city"
                value={form.address}
                onChange={(event) => setForm({ ...form, address: event.target.value })}
              />
            </div>
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
