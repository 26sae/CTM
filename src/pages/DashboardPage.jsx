import React, { useEffect, useRef, useState } from 'react';
import Navbar from '../components/shared/Navbar';
import TransactionRow from '../components/TransactionRow';
import Icon from '../components/Icons';
import { api, formatDate, formatMoney, maskAccount, statusTone } from '../api';
import { ACCOUNT_META, TRANSACTION_META } from '../constants';

export default function DashboardPage({ user, onNavigate }) {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [accountRows, transactionRows] = await Promise.all([
          api(`/api/accounts?userId=${user.id}`),
          api(`/api/transactions?userId=${user.id}&limit=8`),
        ]);
        if (!active) return;
        setAccounts(accountRows || []);
        setTransactions(transactionRows || []);
      } catch (requestError) {
        if (active) setError(requestError.message || 'Unable to load your accounts.');
      } finally {
        if (active) setLoading(false);
      }
    }

    if (user?.id) load();
    return () => { active = false; };
  }, [user?.id]);

  const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const primaryAccount = accounts[0];

  const runSearch = async (event) => {
    event.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearched(true);
    setSearchError('');

    try {
      const results = await api(`/api/transactions/search?query=${encodeURIComponent(searchQuery.trim())}`);
      setSearchResults(Array.isArray(results) ? results : []);
    } catch (requestError) {
      setSearchError(requestError.message);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const focusSearch = () => {
    searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => searchRef.current?.querySelector('input')?.focus(), 250);
  };

  return (
    <div className="dashboard">
      <Navbar user={user} onNavigate={onNavigate} />

      <div className="greeting">
        <div>
          <h1>Good day, {(user?.name || 'Customer').split(' ')[0]}.</h1>
          <p>Here is a summary of your accounts.</p>
        </div>
        <span className="greeting-date">
          {new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
        </span>
      </div>

      <section className="balance-card">
        <div className="balance-top">
          <span className="balance-label">
            <Icon name="wallet" size={14} />
            Total available balance
          </span>
          <span className="balance-chip">
            <Icon name="shield" size={12} />
            Insured
          </span>
        </div>

        <div className="balance-amount">{formatMoney(totalBalance)}</div>

        <div className="balance-footer">
          <div className="balance-account">
            <span>Primary account</span>
            <strong>
              {primaryAccount ? `${primaryAccount.account_type} · ${maskAccount(primaryAccount.account_number)}` : 'No account yet'}
            </strong>
          </div>
          <div className="balance-mark">
            <Icon name="bank" size={26} strokeWidth={1.4} />
          </div>
        </div>
      </section>

      <div className="quick-actions">
        <button className="quick-action" onClick={() => onNavigate('accounts')}>
          <span className="quick-icon"><Icon name="wallet" size={19} /></span>
          Accounts
        </button>
        <button className="quick-action" onClick={() => onNavigate('activity')}>
          <span className="quick-icon"><Icon name="document" size={19} /></span>
          Statement
        </button>
        <button className="quick-action" onClick={focusSearch}>
          <span className="quick-icon"><Icon name="search" size={19} /></span>
          Search
        </button>
        <button className="quick-action" onClick={() => onNavigate('help')}>
          <span className="quick-icon"><Icon name="help" size={19} /></span>
          Support
        </button>
      </div>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Your accounts</h2>
            <p>{accounts.length} account{accounts.length === 1 ? '' : 's'} on file</p>
          </div>
          <button className="link-button" onClick={() => onNavigate('accounts')}>View all</button>
        </div>

        {loading && (
          <div className="account-scroll">
            <div className="skeleton" style={{ minWidth: 220, height: 132 }} />
            <div className="skeleton" style={{ minWidth: 220, height: 132 }} />
          </div>
        )}

        {!loading && error && <div className="form-error">{error}</div>}

        {!loading && !error && accounts.length === 0 && (
          <div className="empty-state">
            <span className="empty-state-icon"><Icon name="wallet" size={21} /></span>
            <strong>No accounts yet</strong>
            <p>Ask a bank administrator to open an account for your profile.</p>
          </div>
        )}

        {!loading && accounts.length > 0 && (
          <div className="account-scroll">
            {accounts.map((account) => {
              const meta = ACCOUNT_META[account.account_type] || ACCOUNT_META.Checking;
              return (
                <article key={account.id} className={`account-card tone-${meta.tone}`}>
                  <div className="account-card-top">
                    <span className="account-type">
                      <span className="account-type-icon"><Icon name={meta.icon} size={16} /></span>
                      {account.account_type}
                    </span>
                    <span className={`badge badge-${statusTone(account.status)}`}>{account.status}</span>
                  </div>
                  <div>
                    <div className="account-balance">{formatMoney(account.balance, account.currency || 'PHP')}</div>
                    <div className="account-number">{maskAccount(account.account_number)}</div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="section" ref={searchRef}>
        <div className="section-head">
          <div>
            <h2>Search transactions</h2>
            <p>Find a reference number, description, or category</p>
          </div>
        </div>

        <div className="search-panel">
          <form className="search-form" onSubmit={runSearch}>
            <div className="input-shell with-icon">
              <Icon name="search" size={16} className="input-icon" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="e.g. TXN-00000042 or Salary"
                aria-label="Search transactions"
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={searching || !searchQuery.trim()}>
              {searching ? '…' : 'Search'}
            </button>
          </form>

          {searchError && <div className="form-error">{searchError}</div>}

          {!searchError && searched && !searching && searchResults.length === 0 && (
            <div className="empty-state" style={{ padding: '18px 12px' }}>
              <span className="empty-state-icon"><Icon name="search" size={19} /></span>
              <strong>No matching transactions</strong>
              <p>Try a shorter reference number or a category such as Salary.</p>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.slice(0, 8).map((result) => {
                const meta = TRANSACTION_META[result.type] || TRANSACTION_META.transfer;
                return (
                  <div className="search-result" key={result.id}>
                    <div className="search-result-main">
                      <strong>{result.ref_number} · {result.category || meta.label}</strong>
                      <span>{result.description} · {result.customer_name || 'Customer'}</span>
                      <span>{formatDate(result.created_at)}</span>
                    </div>
                    <span className={`search-result-amount ${meta.sign === '+' ? 'positive' : ''}`}>
                      {meta.sign}{formatMoney(result.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="section" style={{ paddingBottom: 26 }}>
        <div className="section-head">
          <div>
            <h2>Recent activity</h2>
            <p>Your latest posted transactions</p>
          </div>
          <button className="link-button" onClick={() => onNavigate('activity')}>See all</button>
        </div>

        {loading && (
          <div className="stack">
            <div className="skeleton" style={{ height: 68 }} />
            <div className="skeleton" style={{ height: 68 }} />
            <div className="skeleton" style={{ height: 68 }} />
          </div>
        )}

        {!loading && transactions.length === 0 && (
          <div className="empty-state">
            <span className="empty-state-icon"><Icon name="activity" size={21} /></span>
            <strong>No transactions yet</strong>
            <p>New account activity will appear here.</p>
          </div>
        )}

        {!loading && transactions.length > 0 && (
          <div className="tx-list">
            {transactions.slice(0, 5).map((transaction, index) => (
              <TransactionRow key={transaction.id} transaction={transaction} index={index} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
