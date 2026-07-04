import { useEffect, useState } from 'react';

/**
 * Hook to safely render client-only content after hydration
 * Prevents hydration mismatches between server and client renders
 * 
 * Usage:
 * const mounted = useMounted();
 * if (!mounted) return <Skeleton />;
 * return <ActualContent />;
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}

/**
 * Hook that combines mounted check with delayed rendering for better perceived performance
 * Useful for pages with heavy initial data fetches
 */
export function useDelayedMounted(delayMs = 100) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [delayMs]);

  return mounted;
}
