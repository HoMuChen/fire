import { useState, useCallback } from 'react';

/**
 * Manages a Set state with a toggle function.
 * Returns [set, toggleFn] similar to useState.
 */
export function useToggleSet<T>(initial: T[] = []): [Set<T>, (key: T) => void] {
  const [set, setSet] = useState<Set<T>>(() => new Set(initial));

  const toggle = useCallback((key: T) => {
    setSet((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  return [set, toggle];
}
