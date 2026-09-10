'use client';

import { useEffect, useState } from 'react';

/**
 * Delays a rapidly changing value — typically search input — so that a query key
 * built from it does not fire a request on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
