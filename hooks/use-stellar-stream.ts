'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

const HORIZON_URL = 'https://horizon.stellar.org';

export type StreamStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'closed';

interface UseStellarStreamOptions {
  /** Public key of the account to watch */
  publicKey: string | null;
  /** Called when a new payment is received on the stream */
  onPayment: (payment: any) => void;
  /** Whether streaming is enabled (defaults to true) */
  enabled?: boolean;
}

/**
 * useStellarStream
 *
 * Opens a Horizon SSE (Server-Sent Events) stream for account payments
 * in real-time. When a new payment is detected the `onPayment` callback
 * is fired so the caller can refresh balances / update UI without polling.
 *
 * The hook handles:
 * - Connection lifecycle (open / close / cleanup)
 * - Exponential back-off reconnection on errors
 * - Automatic teardown when the component unmounts or the publicKey changes
 */
export function useStellarStream({
  publicKey,
  onPayment,
  enabled = true,
}: UseStellarStreamOptions): { status: StreamStatus } {
  const [status, setStatus] = useState<StreamStatus>('idle');

  // Keep a stable ref to the latest callback so the effect closure is always
  // up-to-date without needing to restart the stream on every render.
  const onPaymentRef = useRef(onPayment);
  useEffect(() => {
    onPaymentRef.current = onPayment;
  });

  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const open = useCallback(
    (pk: string) => {
      // Clean up any previous connection.
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }

      // `cursor=now` means we only receive events that happen after the stream
      // is opened — no replay of historical payments.
      const url = `${HORIZON_URL}/accounts/${pk}/payments?cursor=now`;
      setStatus('connecting');

      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        retryCountRef.current = 0;
        setStatus('connected');
      };

      es.onmessage = (event) => {
        try {
          const payment = JSON.parse(event.data);
          onPaymentRef.current(payment);
        } catch {
          // Malformed JSON — ignore silently
        }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        setStatus('error');

        // Exponential back-off: 2s, 4s, 8s … capped at 30s
        const delay = Math.min(2000 * 2 ** retryCountRef.current, 30_000);
        retryCountRef.current += 1;

        retryTimerRef.current = setTimeout(() => {
          if (pk) open(pk);
        }, delay);
      };
    },
    [] // no deps — we rely on refs for stability
  );

  useEffect(() => {
    if (!enabled || !publicKey) {
      // Close any existing stream and mark as idle.
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      setStatus('idle');
      return;
    }

    retryCountRef.current = 0;
    open(publicKey);

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      setStatus('closed');
    };
  }, [publicKey, enabled, open]);

  return { status };
}
