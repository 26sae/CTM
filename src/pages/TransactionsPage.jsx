import React, { useEffect, useMemo, useState } from 'react';
import SubHeader from '../components/shared/SubHeader';
import TransactionRow from '../components/TransactionRow';
import Icon from '../components/Icons';
import { api, formatMoney } from '../api';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'deposit', label: 'Deposits' },
  { id: 'withdrawal', label: 'Withdrawals' },
  { id: 'transfer', label: 'Transfers' },
  { id: 'payment', label: 'Payments' },
];

export default function TransactionsPage({ user, onNavigate }) {
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const rows = await api(`/api/transactions?userId=${user.id}&limit=300`);
        if (active) setTransactions(rows || []);
      } catch (requestError) {
        if (active) setError(requestError.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [user.id]);

  const filtered = useMemo(() => {
    if (filter === 'all') return transactions;
    return transactions.filter((transaction) => transaction.type === filter);
  }, [transactions, filter]);

  const totals = useMemo(() => {
    return transactions.reduce(
      (accumulator, transaction) => {
        const amount = Number(transaction.amount) || 0;
        if (transaction.type === 'deposit') accumulator.deposits += amount;
        else accumulator.spending += amount;
        return accumulator;
      },
      { deposits: 0, spending: 0 }
    );
  }, [transactions]);

  return (
    <div className="sub-page page-full">
      <SubHeader
        title="Account activity"
        subtitle="Your posted transactions"
        onBack={() => onNavigate('dashboard')}
      />

      <div className="sub-content">
        <section className="summary-card">
          <span>Activity summary</span>
          <strong>{formatMoney(totals.deposits)}</strong>
          <p>Total credits · {formatMoney(totals.spending)} in debits</p>
        </section>

        <div className="filter-bar">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              className={`chip ${filter === item.id ? 'on' : ''}`}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="stack">
            {[0, 1, 2, 3, 4].map((item) => (
              <div className="skeleton" key={item} style={{ height: 68 }} />
            ))}
          </div>
        )}

        {!loading && error && <div className="form-error">{error}</div>}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">
            <span className="empty-state-icon"><Icon name="activity" size={22} /></span>
            <strong>No transactions found</strong>
            <p>There are no {filter === 'all' ? '' : filter} transactions on this account yet.</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <>
            <div className="tx-list">
              {filtered.map((transaction, index) => (
                <TransactionRow key={transaction.id} transaction={transaction} index={index} />
              ))}
            </div>
            <div className="secure-note" style={{ justifyContent: 'center' }}>
              <span>Showing {filtered.length} of your most recent transactions.</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
