import React from 'react';
import Icon from './Icons';
import { formatDate, formatMoney, statusTone } from '../api';
import { TRANSACTION_META } from '../constants';

export default function TransactionRow({ transaction, index = 0, showStatus = true }) {
  const meta = TRANSACTION_META[transaction.type] || TRANSACTION_META.transfer;
  const amount = Number(transaction.amount) || 0;

  return (
    <div className="tx-item" style={{ animationDelay: `${Math.min(index * 0.04, 0.3)}s` }}>
      <div className={`tx-icon ${meta.tone}`}>
        <Icon name={meta.icon} size={19} />
      </div>
      <div className="tx-body">
        <span className="tx-title">{transaction.description || meta.label}</span>
        <span className="tx-sub">
          {transaction.category || meta.label}
          <span className="tx-dot" />
          {formatDate(transaction.created_at)}
          {transaction.account_number && (
            <>
              <span className="tx-dot" />
              •••• {String(transaction.account_number).slice(-4)}
            </>
          )}
        </span>
      </div>
      <div className="tx-amount">
        <strong className={meta.sign === '+' ? 'positive' : 'negative'}>
          {meta.sign}{formatMoney(amount)}
        </strong>
        {showStatus && <small className={statusTone(transaction.status)}>{transaction.status}</small>}
      </div>
    </div>
  );
}
