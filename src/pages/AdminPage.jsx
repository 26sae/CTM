import React, { useEffect, useRef, useState } from 'react';
import BrandMark from '../components/shared/BrandMark';
import Icon from '../components/Icons';
import Modal from '../components/Modal';
import {
  api,
  formatDateTime,
  formatMoney,
  initials,
  statusTone,
} from '../api';
import {
  ACCOUNT_STATUSES,
  ACCOUNT_TYPES,
  ADMIN_EVENT_META,
  BANK,
  LOG_EVENT_OPTIONS,
  USER_ROLES,
  USER_STATUSES,
} from '../constants';

const TABS = [
  { id: 'accounts', label: 'Accounts', icon: 'wallet' },
  { id: 'customers', label: 'Customers', icon: 'users' },
  { id: 'logs', label: 'Security logs', icon: 'document' },
];

const LOG_PAGE_SIZE = 20;

function emptyAccountForm(customers) {
  return {
    userId: customers[0]?.id || '',
    accountType: 'Checking',
    balance: '0',
    status: 'active',
  };
}

function emptyCustomerForm() {
  return {
    name: '',
    email: '',
    password: 'Welcome123',
    phone: '',
    address: '',
    role: 'customer',
    status: 'active',
    createAccount: true,
    accountType: 'Checking',
    initialBalance: '0',
  };
}

export default function AdminPage({ user, onNavigate, onLogout }) {
  const [tab, setTab] = useState('accounts');
  const [stats, setStats] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(0);
  const [logEvent, setLogEvent] = useState('all');
  const [logEmail, setLogEmail] = useState('');
  const [appliedLogEvent, setAppliedLogEvent] = useState('all');
  const [appliedLogEmail, setAppliedLogEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [editor, setEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = (message, tone = 'success') => {
    setToast({ message, tone });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  async function loadStats() {
    try {
      setStats(await api('/api/admin/stats'));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function loadAccounts() {
    try {
      setAccounts(await api('/api/admin/accounts'));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function loadCustomers() {
    try {
      setCustomers(await api('/api/admin/users'));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function loadLogs() {
    try {
      const query = new URLSearchParams({
        event: appliedLogEvent,
        email: appliedLogEmail,
        limit: String(LOG_PAGE_SIZE),
        offset: String(logPage * LOG_PAGE_SIZE),
      });
      const data = await api(`/api/admin/logs?${query.toString()}`);
      setLogs(data.logs || []);
      setLogTotal(data.total || 0);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function refreshAll() {
    await Promise.all([loadStats(), loadAccounts(), loadCustomers()]);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([loadStats(), loadCustomers()]).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  // These loaders intentionally read the current tab and applied log filters.
  useEffect(() => {
    if (tab === 'accounts') loadAccounts();
    if (tab === 'customers') loadCustomers();
    if (tab === 'logs') loadLogs();
  }, [tab, appliedLogEvent, appliedLogEmail, logPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredAccounts = accounts.filter((account) => {
    const term = accountSearch.trim().toLowerCase();
    if (!term) return true;
    return (
      String(account.customer_name || '').toLowerCase().includes(term) ||
      String(account.customer_email || '').toLowerCase().includes(term) ||
      String(account.account_number || '').toLowerCase().includes(term)
    );
  });

  const filteredCustomers = customers.filter((customer) => {
    const term = customerSearch.trim().toLowerCase();
    if (!term) return true;
    return (
      String(customer.name || '').toLowerCase().includes(term) ||
      String(customer.email || '').toLowerCase().includes(term)
    );
  });

  const openCreateAccount = () => {
    if (customers.length === 0) {
      showToast('Create a customer profile first.', 'error');
      return;
    }

    setEditor({
      kind: 'account',
      mode: 'create',
      form: emptyAccountForm(customers),
      error: '',
    });
  };

  const openEditAccount = (account) => {
    setEditor({
      kind: 'account',
      mode: 'edit',
      record: account,
      form: {
        userId: account.user_id,
        accountType: account.account_type,
        balance: String(account.balance),
        status: account.status,
      },
      error: '',
    });
  };

  const openCreateCustomer = () => {
    setEditor({
      kind: 'customer',
      mode: 'create',
      form: emptyCustomerForm(),
      error: '',
    });
  };

  const openEditCustomer = (customer) => {
    setEditor({
      kind: 'customer',
      mode: 'edit',
      record: customer,
      form: {
        name: customer.name || '',
        email: customer.email || '',
        password: '',
        phone: customer.phone || '',
        address: customer.address || '',
        role: customer.role || 'customer',
        status: customer.status || 'active',
        createAccount: false,
        accountType: 'Checking',
        initialBalance: '0',
      },
      error: '',
    });
  };

  const updateField = (key, value) => {
    setEditor((current) => ({
      ...current,
      error: '',
      form: { ...current.form, [key]: value },
    }));
  };

  const saveEditor = async () => {
    if (!editor) return;

    const { kind, mode, form, record } = editor;

    if (kind === 'account') {
      if (!form.userId) {
        setEditor((current) => ({ ...current, error: 'Select a customer for this account.' }));
        return;
      }
    }

    if (kind === 'customer' && (!form.name.trim() || !form.email.trim())) {
      setEditor((current) => ({ ...current, error: 'Name and email are required.' }));
      return;
    }

    if (kind === 'customer' && mode === 'create' && !form.password.trim()) {
      setEditor((current) => ({ ...current, error: 'Set an initial password for the customer.' }));
      return;
    }

    setSaving(true);

    try {
      if (kind === 'account' && mode === 'create') {
        await api('/api/admin/accounts', {
          method: 'POST',
          body: JSON.stringify({
            userId: Number(form.userId),
            accountType: form.accountType,
            balance: Number(form.balance) || 0,
            status: form.status,
          }),
        });
        showToast('Account created successfully.');
      } else if (kind === 'account') {
        await api(`/api/admin/accounts/${record.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            account_type: form.accountType,
            balance: Number(form.balance) || 0,
            status: form.status,
          }),
        });
        showToast('Account updated.');
      } else if (kind === 'customer' && mode === 'create') {
        await api('/api/admin/users', {
          method: 'POST',
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            password: form.password,
            phone: form.phone,
            address: form.address,
            role: form.role,
            status: form.status,
            createAccount: form.createAccount,
            accountType: form.accountType,
            initialBalance: Number(form.initialBalance) || 0,
          }),
        });
        showToast('Customer created.');
      } else if (kind === 'customer') {
        const payload = {
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          role: form.role,
          status: form.status,
        };
        if (form.password.trim()) payload.password = form.password;
        await api(`/api/admin/users/${record.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showToast('Customer updated.');
      }

      setEditor(null);
      await refreshAll();
      if (tab === 'logs') await loadLogs();
    } catch (requestError) {
      setEditor((current) => ({ ...current, error: requestError.message }));
    } finally {
      setSaving(false);
    }
  };

  const removeRecord = async () => {
    if (!confirmDelete) return;

    const { kind, record } = confirmDelete;

    if (kind === 'customer' && record.id === user.id) {
      showToast('You cannot delete the account you are signed in with.', 'error');
      setConfirmDelete(null);
      return;
    }

    try {
      if (kind === 'account') {
        await api(`/api/admin/accounts/${record.id}`, { method: 'DELETE' });
        showToast('Account deleted.');
      } else {
        await api(`/api/admin/users/${record.id}`, { method: 'DELETE' });
        showToast('Customer deleted.');
      }

      setConfirmDelete(null);
      await refreshAll();
    } catch (requestError) {
      showToast(requestError.message, 'error');
    }
  };

  const applyLogFilters = (event) => {
    event?.preventDefault();
    setLogPage(0);
    setAppliedLogEvent(logEvent);
    setAppliedLogEmail(logEmail.trim());
  };

  const changeLogEvent = (value) => {
    setLogEvent(value);
    setLogPage(0);
    setAppliedLogEvent(value);
  };

  const logPages = Math.max(Math.ceil(logTotal / LOG_PAGE_SIZE), 1);

  return (
    <div className="admin-page page-full">
      {toast && <div className={`toast ${toast.tone}`}>{toast.message}</div>}

      <header className="admin-header">
        <div className="admin-header-top">
          <div className="brand-lockup">
            <BrandMark size={42} />
            <div className="brand-lockup-text" style={{ color: 'white' }}>
              <strong>{BANK.shortName}</strong>
              <span style={{ color: 'rgba(255,255,255,.48)' }}>Admin back office</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 7 }}>
            <button
              className="round-button light"
              onClick={() => onNavigate('dashboard')}
              aria-label="View customer app"
            >
              <Icon name="bank" size={18} />
            </button>
            <button className="round-button light" onClick={onLogout} aria-label="Sign out">
              <Icon name="logout" size={18} />
            </button>
          </div>
        </div>

        <div className="admin-welcome">
          <p>Operations console</p>
          <h1>Good day, {user.name?.split(' ')[0] || 'Administrator'}.</h1>
          <span>Manage customers, open accounts, and monitor security events.</span>
        </div>
      </header>

      <div className="admin-stats">
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Customers</span>
            <span className="stat-icon"><Icon name="users" size={15} /></span>
          </div>
          <span className="stat-value">{stats ? stats.customers : '—'}</span>
        </div>
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Accounts</span>
            <span className="stat-icon"><Icon name="wallet" size={15} /></span>
          </div>
          <span className="stat-value">{stats ? stats.accounts : '—'}</span>
        </div>
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Bank balance</span>
            <span className="stat-icon"><Icon name="bank" size={15} /></span>
          </div>
          <span className="stat-value" style={{ fontSize: '0.92rem' }}>
            {stats ? formatMoney(stats.totalBalance) : '—'}
          </span>
        </div>
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Suspicious</span>
            <span className="stat-icon"><Icon name="shield" size={15} /></span>
          </div>
          <span className="stat-value">{stats ? stats.suspiciousLogins : '—'}</span>
        </div>
      </div>

      <div className="admin-tabs">
        {TABS.map((item) => (
          <button
            key={item.id}
            className={`admin-tab ${tab === item.id ? 'on' : ''}`}
            onClick={() => setTab(item.id)}
          >
            <Icon name={item.icon} size={14} />
            {item.label}
          </button>
        ))}
      </div>

      <div className="admin-body">
        {loading && (tab === 'accounts' || tab === 'customers') && (
          <div className="stack">
            <div className="skeleton" style={{ height: 78 }} />
            <div className="skeleton" style={{ height: 78 }} />
            <div className="skeleton" style={{ height: 78 }} />
          </div>
        )}

        {error && <div className="form-error">{error}</div>}

        {tab === 'accounts' && (
          <>
            <div className="admin-toolbar">
              <div className="input-shell with-icon">
                <Icon name="search" size={16} className="input-icon" />
                <input
                  type="search"
                  placeholder="Search customer or account"
                  value={accountSearch}
                  onChange={(event) => setAccountSearch(event.target.value)}
                />
              </div>
              <button className="btn btn-primary btn-sm" onClick={openCreateAccount}>
                <Icon name="plus" size={15} />
                New
              </button>
            </div>

            {!loading && filteredAccounts.length === 0 && (
              <div className="empty-state">
                <span className="empty-state-icon"><Icon name="wallet" size={21} /></span>
                <strong>No accounts found</strong>
                <p>Create an account for a customer to get started.</p>
              </div>
            )}

            <div className="admin-list">
              {filteredAccounts.map((account) => (
                <article className="admin-card" key={account.id}>
                  <div className="admin-card-icon">
                    <Icon name={account.account_type === 'Savings' ? 'shield' : 'wallet'} size={18} />
                  </div>
                  <div className="admin-card-main">
                    <span className="admin-card-title">{account.customer_name}</span>
                    <span className="admin-card-sub">
                      {account.customer_email}
                      <br />
                      {account.account_type} · {account.account_number}
                    </span>
                    <div className="admin-card-meta">
                      <span className={`badge badge-${statusTone(account.status)}`}>{account.status}</span>
                      <span className="badge badge-info">{account.account_type}</span>
                    </div>
                  </div>
                  <div className="admin-card-side">
                    <span className="admin-card-balance">{formatMoney(account.balance)}</span>
                    <div className="admin-actions">
                      <button
                        className="mini-button"
                        onClick={() => openEditAccount(account)}
                        aria-label="Edit account"
                      >
                        <Icon name="edit" size={14} />
                      </button>
                      <button
                        className="mini-button danger"
                        onClick={() => setConfirmDelete({ kind: 'account', record: account })}
                        aria-label="Delete account"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {tab === 'customers' && (
          <>
            <div className="admin-toolbar">
              <div className="input-shell with-icon">
                <Icon name="search" size={16} className="input-icon" />
                <input
                  type="search"
                  placeholder="Search name or email"
                  value={customerSearch}
                  onChange={(event) => setCustomerSearch(event.target.value)}
                />
              </div>
              <button className="btn btn-primary btn-sm" onClick={openCreateCustomer}>
                <Icon name="plus" size={15} />
                New
              </button>
            </div>

            {!loading && filteredCustomers.length === 0 && (
              <div className="empty-state">
                <span className="empty-state-icon"><Icon name="users" size={21} /></span>
                <strong>No customers found</strong>
                <p>Create a customer profile to open their first account.</p>
              </div>
            )}

            <div className="admin-list">
              {filteredCustomers.map((customer) => (
                <article className="admin-card" key={customer.id}>
                  <div
                    className="admin-card-icon"
                    style={{ background: 'var(--navy-900)', color: 'var(--gold-400)', fontWeight: 800, fontSize: '0.68rem' }}
                  >
                    {initials(customer.name)}
                  </div>
                  <div className="admin-card-main">
                    <span className="admin-card-title">{customer.name}</span>
                    <span className="admin-card-sub">{customer.email}</span>
                    <div className="admin-card-meta">
                      <span className={`badge badge-${statusTone(customer.status)}`}>{customer.status}</span>
                      <span className="badge badge-neutral">{customer.role}</span>
                      <span className="badge badge-info">{customer.account_count} acct</span>
                    </div>
                  </div>
                  <div className="admin-card-side">
                    <span className="admin-card-balance">{formatMoney(customer.total_balance)}</span>
                    <div className="admin-actions">
                      <button
                        className="mini-button"
                        onClick={() => openEditCustomer(customer)}
                        aria-label="Edit customer"
                      >
                        <Icon name="edit" size={14} />
                      </button>
                      <button
                        className="mini-button danger"
                        onClick={() => setConfirmDelete({ kind: 'customer', record: customer })}
                        aria-label="Delete customer"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {tab === 'logs' && (
          <>
            <div className="admin-toolbar">
              <div className="input-shell">
                <select value={logEvent} onChange={(event) => changeLogEvent(event.target.value)}>
                  {LOG_EVENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => { setLogPage(0); loadLogs(); }}
                aria-label="Refresh logs"
              >
                <Icon name="refresh" size={15} />
              </button>
            </div>

            <form className="admin-toolbar" onSubmit={applyLogFilters}>
              <div className="input-shell with-icon">
                <Icon name="search" size={16} className="input-icon" />
                <input
                  type="search"
                  placeholder="Filter by email"
                  value={logEmail}
                  onChange={(event) => setLogEmail(event.target.value)}
                />
              </div>
              <button className="btn btn-primary btn-sm" type="submit">Filter</button>
            </form>

            {logs.length === 0 && (
              <div className="empty-state">
                <span className="empty-state-icon"><Icon name="document" size={21} /></span>
                <strong>No log events</strong>
                <p>Security and login events will appear here as the app is used.</p>
              </div>
            )}

            <div className="admin-list">
              {logs.map((log) => {
                const meta = ADMIN_EVENT_META[log.event_type] || {
                  label: log.event_type,
                  tone: 'neutral',
                  icon: 'info',
                };
                return (
                  <article className="log-item" key={log.id}>
                    <div className={`log-icon ${meta.tone}`}>
                      <Icon name={meta.icon} size={16} />
                    </div>
                    <div className="log-body">
                      <div className="log-top">
                        <span className={`badge badge-${meta.tone}`}>{meta.label}</span>
                        <span className="log-email">{log.email || 'anonymous'}</span>
                      </div>
                      <span className="log-meta">
                        {formatDateTime(log.created_at)} · {log.ip_address || 'unknown IP'}
                      </span>
                      {log.details && <span className="log-details">{log.details}</span>}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="pagination">
              <span>Page {logPage + 1} of {logPages} · {logTotal} events</span>
              <div className="page-buttons">
                <button
                  className="page-button"
                  disabled={logPage === 0}
                  onClick={() => setLogPage((page) => Math.max(page - 1, 0))}
                >
                  ←
                </button>
                <button
                  className="page-button"
                  disabled={logPage >= logPages - 1}
                  onClick={() => setLogPage((page) => Math.min(page + 1, logPages - 1))}
                >
                  →
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {editor && (
        <Modal
          title={
            editor.kind === 'account'
              ? editor.mode === 'create' ? 'Open a new account' : 'Edit account'
              : editor.mode === 'create' ? 'Create a customer' : 'Edit customer'
          }
          subtitle={
            editor.kind === 'account'
              ? 'Accounts are opened for an existing customer.'
              : 'Customer profiles can be created and managed here.'
          }
          onClose={() => (saving ? null : setEditor(null))}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setEditor(null)} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={saveEditor} disabled={saving}>
                {saving ? 'Saving…' : editor.mode === 'create' ? 'Create' : 'Save changes'}
              </button>
            </>
          }
        >
          {editor.error && <div className="form-error">{editor.error}</div>}

          {editor.kind === 'account' ? (
            <div className="form-grid">
              {editor.mode === 'create' ? (
                <div className="field">
                  <label htmlFor="account-customer">Customer</label>
                  <div className="input-shell">
                    <select
                      id="account-customer"
                      value={editor.form.userId}
                      onChange={(event) => updateField('userId', event.target.value)}
                    >
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} · {customer.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="field">
                  <label>Customer</label>
                  <div className="info-row" style={{ padding: 0 }}>
                    <span>{editor.record.customer_email}</span>
                    <strong>{editor.record.customer_name}</strong>
                  </div>
                </div>
              )}

              <div className="field-row">
                <div className="field">
                  <label htmlFor="account-type">Account type</label>
                  <div className="input-shell">
                    <select
                      id="account-type"
                      value={editor.form.accountType}
                      onChange={(event) => updateField('accountType', event.target.value)}
                    >
                      {ACCOUNT_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="account-status">Status</label>
                  <div className="input-shell">
                    <select
                      id="account-status"
                      value={editor.form.status}
                      onChange={(event) => updateField('status', event.target.value)}
                    >
                      {ACCOUNT_STATUSES.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="field">
                <label htmlFor="account-balance">
                  {editor.mode === 'create' ? 'Opening balance (PHP)' : 'Account balance (PHP)'}
                </label>
                <div className="input-shell">
                  <input
                    id="account-balance"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editor.form.balance}
                    onChange={(event) => updateField('balance', event.target.value)}
                  />
                </div>
                <span className="field-hint">This value is stored directly in the dummy database.</span>
              </div>
            </div>
          ) : (
            <div className="form-grid">
              <div className="field">
                <label htmlFor="customer-name">Full name</label>
                <div className="input-shell">
                  <input
                    id="customer-name"
                    type="text"
                    value={editor.form.name}
                    onChange={(event) => updateField('name', event.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="customer-email">Email address</label>
                <div className="input-shell">
                  <input
                    id="customer-email"
                    type="email"
                    value={editor.form.email}
                    onChange={(event) => updateField('email', event.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="customer-password">
                  {editor.mode === 'create' ? 'Initial password' : 'Reset password'}
                </label>
                <div className="input-shell">
                  <input
                    id="customer-password"
                    type="text"
                    placeholder={editor.mode === 'create' ? 'Welcome123' : 'Leave blank to keep current password'}
                    value={editor.form.password}
                    onChange={(event) => updateField('password', event.target.value)}
                  />
                </div>
                <span className="field-hint">Passwords are intentionally stored in plain text in this simulation.</span>
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="customer-phone">Phone</label>
                  <div className="input-shell">
                    <input
                      id="customer-phone"
                      type="tel"
                      value={editor.form.phone}
                      onChange={(event) => updateField('phone', event.target.value)}
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="customer-role">Role</label>
                  <div className="input-shell">
                    <select
                      id="customer-role"
                      value={editor.form.role}
                      onChange={(event) => updateField('role', event.target.value)}
                    >
                      {USER_ROLES.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="field">
                <label htmlFor="customer-address">Address</label>
                <textarea
                  id="customer-address"
                  className="textarea"
                  value={editor.form.address}
                  onChange={(event) => updateField('address', event.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="customer-status">Status</label>
                <div className="input-shell">
                  <select
                    id="customer-status"
                    value={editor.form.status}
                    onChange={(event) => updateField('status', event.target.value)}
                  >
                    {USER_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              {editor.mode === 'create' && (
                <div className="panel" style={{ padding: 14, gap: 12, background: 'var(--bg)', boxShadow: 'none' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: '0.75rem', fontWeight: 800, color: 'var(--ink-700)' }}>
                    <input
                      type="checkbox"
                      checked={editor.form.createAccount}
                      onChange={(event) => updateField('createAccount', event.target.checked)}
                    />
                    Open a first account for this customer
                  </label>

                  {editor.form.createAccount && (
                    <div className="field-row">
                      <div className="field">
                        <label htmlFor="new-account-type">Account type</label>
                        <div className="input-shell">
                          <select
                            id="new-account-type"
                            value={editor.form.accountType}
                            onChange={(event) => updateField('accountType', event.target.value)}
                          >
                            {ACCOUNT_TYPES.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="field">
                        <label htmlFor="new-account-balance">Opening balance</label>
                        <div className="input-shell">
                          <input
                            id="new-account-balance"
                            type="number"
                            min="0"
                            step="0.01"
                            value={editor.form.initialBalance}
                            onChange={(event) => updateField('initialBalance', event.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      {confirmDelete && (
        <Modal
          title={confirmDelete.kind === 'account' ? 'Delete account?' : 'Delete customer?'}
          subtitle="This action cannot be undone."
          onClose={() => setConfirmDelete(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={removeRecord}>Delete</button>
            </>
          }
        >
          <div className="panel" style={{ padding: 14, background: 'var(--bg)', boxShadow: 'none' }}>
            <div className="admin-card-title">
              {confirmDelete.kind === 'account'
                ? `${confirmDelete.record.customer_name} · ${confirmDelete.record.account_type}`
                : confirmDelete.record.name}
            </div>
            <div className="admin-card-sub">
              {confirmDelete.kind === 'account'
                ? confirmDelete.record.account_number
                : confirmDelete.record.email}
            </div>
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--ink-500)', lineHeight: 1.55 }}>
            {confirmDelete.kind === 'account'
              ? 'Deleting an account also removes its transaction history.'
              : 'Deleting a customer removes their profile, accounts, and transaction history.'}
          </p>
        </Modal>
      )}
    </div>
  );
}
