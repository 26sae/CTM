import React, { useState } from 'react';
import SubHeader from '../components/shared/SubHeader';
import Icon from '../components/Icons';
import { FAQS } from '../constants';

export default function HelpPage({ onNavigate }) {
  const [open, setOpen] = useState(null);

  return (
    <div className="sub-page page-full">
      <SubHeader title="Help & support" subtitle="We are here to help" onBack={() => onNavigate('profile')} />

      <div className="sub-content">
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-title">Contact Binangonan Bank</div>
              <div className="panel-sub">Support hours: Monday–Friday, 8AM–5PM</div>
            </div>
            <Icon name="help" size={19} style={{ color: 'var(--ink-400)' }} />
          </div>

          <div className="contact-row">
            <span className="contact-icon"><Icon name="mail" size={16} /></span>
            <div>
              <strong>support@binangonanbank.test</strong>
              <span>Email support</span>
            </div>
          </div>
          <div className="contact-row">
            <span className="contact-icon"><Icon name="phone" size={16} /></span>
            <div>
              <strong>1-800-BBCARE</strong>
              <span>Customer care hotline</span>
            </div>
          </div>
          <div className="contact-row">
            <span className="contact-icon"><Icon name="bank" size={16} /></span>
            <div>
              <strong>Binangonan Bank HQ</strong>
              <span>Rizal Avenue, Binangonan, Rizal</span>
            </div>
          </div>
        </div>

        <div className="panel-head" style={{ padding: '0 2px' }}>
          <div>
            <div className="panel-title">Frequently asked questions</div>
            <div className="panel-sub">Quick answers about your account.</div>
          </div>
        </div>

        <div className="faq">
          {FAQS.map((item, index) => (
            <div className="faq-item" key={item.q}>
              <button className="faq-question" onClick={() => setOpen(open === index ? null : index)}>
                <span>{item.q}</span>
                <Icon name={open === index ? 'minus' : 'plus'} size={16} style={{ color: 'var(--blue-600)' }} />
              </button>
              {open === index && <p className="faq-answer">{item.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
