import React from 'react';

export default function BrandMark({ size = 40, className = '', variant = 'gold' }) {
  return (
    <span
      className={`brand-mark brand-mark-${variant} ${className}`}
      style={{ width: size, height: size, minWidth: size }}
    >
      <svg viewBox="0 0 48 48" width={size * 0.72} height={size * 0.72} aria-hidden="true">
        <path
          d="M24 4 40 10v13c0 10-6.6 17.4-16 21-9.4-3.6-16-11-16-21V10Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M18 15h7.2c3.1 0 5 1.7 5 4.3 0 1.7-.9 3-2.4 3.6 2 .5 3.2 2 3.2 4.2 0 3-2.2 4.9-5.7 4.9H18Zm3.2 2.7v4.6h3.5c1.5 0 2.4-.8 2.4-2.3 0-1.4-.9-2.3-2.4-2.3Zm0 7v4.6h3.9c1.7 0 2.7-.9 2.7-2.3 0-1.5-1-2.3-2.7-2.3Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}
