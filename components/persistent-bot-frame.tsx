'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * Keeps the bot iframe mounted in the DOM at all times so its internal
 * state (configuration, active session, etc.) survives navigation between
 * other sections of the app.
 *
 * When the user is NOT on /bot the iframe is hidden with CSS only —
 * the DOM node is never destroyed so the bot never resets.
 */
export function PersistentBotFrame() {
  const pathname = usePathname();
  const [hasActivated, setHasActivated] = useState(false);
  const isActive = pathname === '/bot';

  // Only start loading the iframe once the user first visits /bot
  useEffect(() => {
    if (isActive && !hasActivated) {
      setHasActivated(true);
    }
  }, [isActive, hasActivated]);

  // Nothing to render until the user has visited /bot at least once
  if (!hasActivated) return null;

  return (
    <div
      aria-hidden={!isActive}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10,
        display: isActive ? 'flex' : 'none',
        flexDirection: 'column',
        background: 'var(--background)',
      }}
    >
      <iframe
        src="https://lumenspread-bot-ok.base44.app"
        title="Trading Console"
        style={{
          width: '100%',
          flex: 1,
          border: 'none',
          display: 'block',
        }}
        allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; magnetometer; microphone; payment; usb"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
      />
    </div>
  );
}
