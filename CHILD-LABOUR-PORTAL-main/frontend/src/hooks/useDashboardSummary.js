import { useEffect, useState } from 'react';
import api from '../services/api';

export default function useDashboardSummary() {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  useEffect(() => {
    const controller = new AbortController();
    api.get('/dashboard/summary', { signal: controller.signal })
      .then(response => setState({ data: response.data.data, loading: false, error: null }))
      .catch(error => {
        if (!controller.signal.aborted) setState({ data: null, loading: false, error });
      });
    return () => controller.abort();
  }, []);

  return state;
}
