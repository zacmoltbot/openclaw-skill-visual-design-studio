// frame-phone.jsx — Minimal phone device frame
// Usage: import FramePhone from './frame-phone.jsx'
//   <FramePhone width={390} height={844}>
//     <YourContent />
//   </FramePhone>

import React from 'react';

/**
 * Phone frame — gives your UI a device context.
 * Props:
 *   width      — viewport width (default 390)
 *   height     — viewport height (default 844)
 *   model      — 'iphone14' | 'iphone-se' (changes bezel shape, default 'iphone14')
 *   dark       — use dark bezel (default false)
 *   children   — content to render inside the screen
 */
export default function FramePhone({
  width = 390,
  height = 844,
  model = 'iphone14',
  dark = false,
  children
}) {
  const bezel = dark ? '#1a1a1a' : '#2d2d2d';
  const screenBg = '#000';

  // iPhone 14 Pro has Dynamic Island; SE has top bar
  const hasDynamicIsland = model === 'iphone14';
  const notchWidth = 126;
  const notchHeight = 37;

  return (
    <div style={{
      display: 'inline-block',
      background: bezel,
      borderRadius: model === 'iphone-se' ? 30 : 44,
      padding: `${Math.round(height * 0.04)}px`,
      boxShadow: '0 20px 60px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2)',
      position: 'relative',
      width: width + Math.round(width * 0.08),
      height: height + Math.round(height * 0.09),
    }}>
      {/* Screen */}
      <div style={{
        width,
        height,
        background: screenBg,
        borderRadius: model === 'iphone-se' ? 24 : 38,
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Dynamic Island or notch */}
        {hasDynamicIsland ? (
          <div style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            width: notchWidth,
            height: notchHeight,
            background: '#000',
            borderRadius: 20,
            zIndex: 10,
          }} />
        ) : (
          /* Top bar for SE */
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 36,
            background: '#000',
            zIndex: 10,
          }} />
        )}

        {/* Content */}
        <div style={{ width, height, overflow: 'hidden' }}>
          {children}
        </div>

        {/* Home indicator */}
        <div style={{
          position: 'absolute',
          bottom: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 134,
          height: 5,
          background: 'rgba(255,255,255,0.35)',
          borderRadius: 3,
          zIndex: 10,
        }} />
      </div>
    </div>
  );
}