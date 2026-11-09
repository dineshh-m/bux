import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { getTransaction } from '@/db/transactions';
import { TransactionForm } from '@/features/transactions/transaction-form';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';

export default function EditTransactionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const transactionId = Number(id);
  const isValidId = Number.isInteger(transactionId) && transactionId > 0;

  const { data, loading, error, reload } = useDbQuery(
    (db) => getTransaction(db, isValidId ? transactionId : -1),
    [transactionId, isValidId],
  );

  if (loading && !data) {
    return (
      <SafeAreaView
        edges={['top']}
        style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.accent} />
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView
        edges={['top']}
        style={[styles.centered, { backgroundColor: theme.background }]}>
        <EmptyState
          actionLabel="Try again"
          icon="alert-circle-outline"
          message={error?.message ?? 'This transaction may have been deleted.'}
          onAction={error ? reload : () => router.back()}
          title="Transaction not found"
        />
      </SafeAreaView>
    );
  }

  return <TransactionForm transaction={data} />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
