import React, { useState } from 'react';
import { SLIDES, BANK } from '../constants';
import BrandMark from '../components/shared/BrandMark';
import Icon from '../components/Icons';

export default function StartupPage({ onNavigate }) {
  const [slide, setSlide] = useState(0);
  const isLast = slide === SLIDES.length - 1;

  const next = () => {
    if (isLast) {
      onNavigate('login');
    } else {
      setSlide((value) => value + 1);
    }
  };

  return (
    <div className="onboard page-full">
      <div className="onboard-track" style={{ transform: `translateX(-${slide * 100}%)` }}>
        {SLIDES.map((item, index) => (
          <section key={item.title} className={`onboard-slide theme-${index}`}>
            <div className="onboard-top">
              <div className="onboard-brand">
                <BrandMark size={40} />
                <div>
                  <strong>{BANK.shortName}</strong>
                  <span>{BANK.location}</span>
                </div>
              </div>
              {!isLast && (
                <button className="onboard-skip" onClick={() => onNavigate('login')}>
                  Skip
                </button>
              )}
            </div>

            <div className="onboard-visual">
              <div className="onboard-orbit">
                <div className="onboard-orbit-icon">
                  <Icon name={item.icon} size={46} strokeWidth={1.6} />
                </div>
              </div>
            </div>

            <div className="onboard-copy">
              <span className="eyebrow">{item.eyebrow}</span>
              <h1 className="onboard-title">{item.title}</h1>
              <p className="onboard-desc">{item.desc}</p>
            </div>

            <div className="onboard-footer">
              <div className="onboard-dots" aria-hidden="true">
                {SLIDES.map((_, dotIndex) => (
                  <span key={dotIndex} className={`dot ${dotIndex === slide ? 'on' : ''}`} />
                ))}
              </div>

              <div className="onboard-actions">
                <button className="btn btn-gold btn-block" onClick={next}>
                  {isLast ? 'Continue to sign in' : 'Next'}
                  <Icon name="chevronRight" size={17} />
                </button>
                {isLast && (
                  <p className="onboard-signin">
                    New to Binangonan Bank?
                    <button onClick={() => onNavigate('register')}>Create an account</button>
                  </p>
                )}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
