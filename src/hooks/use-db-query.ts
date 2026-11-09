import { useFocusEffect } from 'expo-router';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';

import { useDataRefresh } from '@/context/data-refresh';

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Runs a query whenever the screen gains focus, the refresh revision bumps,
 * or any value in `deps` changes. Results from stale in-flight queries are dropped.
 */
export function useDbQuery<T>(
  loader: (db: SQLiteDatabase) => Promise<T>,
  deps: readonly unknown[] = [],
) {
  const db = useSQLiteContext();
  const { revision } = useDataRefresh();
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const requestId = useRef(0);
  const activeKey = useRef('');
  const depsKey = JSON.stringify(deps);
  // Bumping the revision or changing deps produces a new key, which restarts the query.
  const queryKey = `${revision}:${depsKey}`;

  const run = useCallback(async () => {
    const id = requestId.current + 1;
    requestId.current = id;
    activeKey.current = queryKey;

    setState((previous) => ({ ...previous, loading: true }));

    const isCurrent = () => requestId.current === id && activeKey.current === queryKey;

    try {
      const data = await loaderRef.current(db);
      if (isCurrent()) {
        setState({ data, loading: false, error: null });
      }
    } catch (error) {
      if (isCurrent()) {
        setState((previous) => ({
          ...previous,
          loading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        }));
      }
    }
  }, [db, queryKey]);

  useFocusEffect(
    useCallback(() => {
      run();
    }, [run]),
  );

  return { ...state, reload: run };
}
