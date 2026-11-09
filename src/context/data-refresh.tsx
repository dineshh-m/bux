import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface DataRefreshValue {
  /** Bumped after every write so queries in every open screen re-run. */
  revision: number;
  refresh: () => void;
}

const DataRefreshContext = createContext<DataRefreshValue | null>(null);

export function DataRefreshProvider({ children }: { children: ReactNode }) {
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const value = useMemo(() => ({ revision, refresh }), [revision, refresh]);

  return <DataRefreshContext.Provider value={value}>{children}</DataRefreshContext.Provider>;
}

export function useDataRefresh(): DataRefreshValue {
  const value = useContext(DataRefreshContext);
  if (!value) {
    throw new Error('useDataRefresh must be used inside DataRefreshProvider');
  }
  return value;
}
