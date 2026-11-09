import { useLocalSearchParams } from 'expo-router';

import { TransactionForm } from '@/features/transactions/transaction-form';

export default function NewTransactionScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const initialType = params.type === 'income' ? 'income' : 'expense';

  return <TransactionForm initialType={initialType} />;
}
