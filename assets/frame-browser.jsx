// frame-browser.jsx — Minimal browser device frame
// Usage: import FrameBrowser from './frame-browser.jsx'
//   <FrameBrowser width={1280} height={800}>
//     <YourContent />
//   </FrameBrowser>

import React from 'react';

/**
 * Browser frame — wraps a UI with browser chrome.
 * Props:
 *   width      — viewport width (default 1280)
 *   height     — viewport height (default 800)
 *   url        — text to show in address bar (default 'http://localhost')
 *   title      — page title shown in tab (default 'Page')
 *   children   — content to render inside the content area
 */
export default function FrameBrowser({
  width = 1280,
  height = 800,
  url = 'http://localhost',
  title = 'Page',
  children
}) {
  const chromeColor = '#e8eaed';
  const chromeBorder = '#c4c4c4';
  const tabBg = '#d8d8d8';
  const activeTabBg = '#ffffff';
  const barBg = '#f1f1f1';

  return (
    <div style={{
      display: 'inline-block',
      background: chromeColor,
      borderRadius: 10,
      boxShadow: '0 16px 48px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.12)',
      padding: 0,
      width: width + 16,  // 8px padding each side
      overflow: 'hidden',
    }}>
      {/* ── Title bar ─────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 10px 6px',
        gap: 8,
        background: chromeColor,
        borderBottom: `1px solid ${chromeBorder}`,
      }}>
        {/* Traffic lights */}
        {['#ff5f57', '#febc2e', '#28c840'].map((color, i) => (
          <div key={i} style={{
            width: 12, height: 12,
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
            boxShadow: 'inset 0 -1px 1px rgba(0,0,0,0.15)',
          }} />
        ))}

        {/* URL bar */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          background: '#ffffff',
          borderRadius: 6,
          padding: '4px 10px',
          gap: 6,
          border: '1px solid #d0d0d0',
        }}>
          {/* Lock icon */}
          <svg width="11" height="13" viewBox="0 0 11 13" fill="none" style={{flexShrink: 0}}>
            <rect x="1" y="5.5" width="9" height="7" rx="1.5" fill="#5a67d8"/>
            <path d="M3 5.5V4a2.5 2.5 0 0 1 5 0v1.5" stroke="#5a67d8" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="5.5" cy="9" r="1" fill="#fff"/>
          </svg>
          <span style={{fontSize: 12, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
            {url}
          </span>
        </div>
      </div>

      {/* ── Tab bar (optional) ─────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        padding: '4px 8px 0',
        gap: 2,
        background: chromeColor,
      }}>
        {/* Active tab */}
        <div style={{
          background: activeTabBg,
          borderTopLeftRadius: 6,
          borderTopRightRadius: 6,
          borderTop: '2px solid #5a67d8',
          padding: '5px 14px 2px',
          fontSize: 12,
          color: '#333',
          fontWeight: 500,
          boxShadow: '0 -1px 3px rgba(0,0,0,0.08)',
          maxWidth: 180,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {title}
        </div>
        {/* Plus button */}
        <div style={{
          width: 20, height: 20,
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          color: '#777',
          cursor: 'default',
          marginLeft: 2,
        }}>+</div>
      </div>

      {/* ── Content area ──────────────────────────── */}
      <div style={{
        width,
        height,
        overflow: 'hidden',
        borderTop: `1px solid ${chromeBorder}`,
        background: '#fff',
      }}>
        {children}
      </div>
    </div>
  );
}