import { useCallback, useEffect, useRef, useState } from 'react';

/** Generic data-fetch hook with loading/error/refetch — used across pages. */
export function useApi(fetcher, deps = [], { immediate = true, initial = null } = {}) {
  const [data, setData] = useState(initial);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const mounted = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetcherRef.current();
      if (!mounted.current) return;
      setData(res.data);
      setMeta(res.meta || null);
      return res;
    } catch (err) {
      if (mounted.current) setError(err?.response?.data?.message || err.message || 'Something went wrong');
      return null;
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    if (immediate) run();
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, meta, loading, error, refetch: run, setData };
}

export default useApi;
