import { useEffect, useState } from 'react';

/**
 * Generic data-fetching hook with cancellation support.
 * Pass `null` as url to skip fetching.
 */
export function useFetch<T>(url: string | null): { data: T[]; loading: boolean } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!url) {
      setData([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function fetchData() {
      try {
        const res = await fetch(url!);
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (!cancelled) setData(json.data ?? []);
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [url]);

  return { data, loading };
}
