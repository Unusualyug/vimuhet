import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/** Keeps listing state (filters, sort, page) in the URL so views are shareable. */
export function useQueryParams(defaults = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = useMemo(() => {
    const obj = { ...defaults };
    searchParams.forEach((v, k) => {
      obj[k] = v;
    });
    return obj;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const update = useCallback(
    (next, { replace = true } = {}) => {
      const params = new URLSearchParams();
      Object.entries(next).forEach(([k, v]) => {
        if (v !== '' && v !== undefined && v !== null && !(typeof v === 'object')) params.set(k, String(v));
      });
      setSearchParams(params, { replace });
    },
    [setSearchParams]
  );

  return { value, update, searchParams };
}

export default useQueryParams;
