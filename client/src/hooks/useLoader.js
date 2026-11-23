import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../utils/format.js';

// Runs an async loader on mount (and on reload()), tracking loading/error.
// Ignores results from stale calls so fast re-renders can't overwrite newer data.
export function useLoader(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const callId = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps);

  const reload = useCallback(async () => {
    const id = ++callId.current;
    setLoading(true);
    setError('');
    try {
      const result = await run();
      if (id === callId.current) setData(result);
    } catch (err) {
      if (id === callId.current) setError(errorMessage(err, 'Failed to load data'));
    } finally {
      if (id === callId.current) setLoading(false);
    }
  }, [run]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, setData, loading, error, reload };
}
