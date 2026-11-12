import { useCallback, useEffect, useState } from 'react';
import { describeError } from '../utils.js';

export default function useLoad(loader, deps) {
  const [state, setState] = useState({ data: null, error: '', loading: true });

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    return loader()
      .then((data) => setState({ data, error: '', loading: false }))
      .catch((err) => setState({ data: null, error: describeError(err), loading: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload };
}
