import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ScreenTitle } from '@/components/ui/screen-title';
import { SectionHeader } from '@/components/ui/section-header';
import { Spacing } from '@/constants/theme';
import { useDataRefresh } from '@/context/data-refresh';
import { createCategory, listCategories } from '@/db/categories';
import { countDemoTransactions, deleteDemoTransactions } from '@/db/transactions';
import { getMonthlyTarget, upsertMonthlyTarget } from '@/db/targets';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import { currentMonthKey, monthLabel } from '@/lib/dates';
import { minorToInput, parseAmountToMinor } from '@/lib/money';

type CategoryKind = 'expense' | 'income';

export default function SettingsScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const { refresh } = useDataRefresh();

  const month = currentMonthKey();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const targetQuery = useDbQuery((database) => getMonthlyTarget(database, month), [month]);
  const categoriesQuery = useDbQuery((database) => listCategories(database), []);
  const demoQuery = useDbQuery((database) => countDemoTransactions(database), []);

  const categories = categoriesQuery.data ?? [];
  const demoCount = demoQuery.data ?? 0;

  const [salaryInput, setSalaryInput] = useState('');
  const [budgetInput, setBudgetInput] = useState('');
  const [planSaved, setPlanSaved] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    const target = targetQuery.data;
    if (!target || hydrated.current) return;
    hydrated.current = true;
    setSalaryInput(
      target.expectedIncomeMinor ? minorToInput(target.expectedIncomeMinor) : '',
    );
    setBudgetInput(target.budgetMinor ? minorToInput(target.budgetMinor) : '');
  }, [targetQuery.data]);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryKind, setNewCategoryKind] = useState<CategoryKind>('expense');

  const savePlan = async () => {
    const expected = salaryInput.trim() ? parseAmountToMinor(salaryInput) : null;
    const budget = budgetInput.trim() ? parseAmountToMinor(budgetInput) : null;

    if (salaryInput.trim() && expected === null) {
      Alert.alert('Check the salary', 'Enter a valid amount, for example 85000.');
      return;
    }
    if (budgetInput.trim() && budget === null) {
      Alert.alert('Check the budget', 'Enter a valid amount, for example 50000.');
      return;
    }

    try {
      await upsertMonthlyTarget(db, {
        month,
        expectedIncomeMinor: expected,
        budgetMinor: budget,
      });
      refresh();
      setPlanSaved(true);
    } catch (error) {
      Alert.alert(
        'Could not save plan',
        error instanceof Error ? error.message : 'Something went wrong.',
      );
    }
  };

  const addCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;

    try {
      await createCategory(db, { name, kind: newCategoryKind });
      setNewCategoryName('');
      refresh();
    } catch (error) {
      Alert.alert(
        'Could not add category',
        error instanceof Error ? error.message : 'Something went wrong.',
      );
    }
  };

  const removeDemoData = () => {
    Alert.alert(
      'Remove demo data?',
      'This deletes only the sample transactions created for development.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDemoTransactions(db);
              const target = await getMonthlyTarget(db, month);
              setSalaryInput(
                target.expectedIncomeMinor ? minorToInput(target.expectedIncomeMinor) : '',
              );
              setBudgetInput(target.budgetMinor ? minorToInput(target.budgetMinor) : '');
              setPlanSaved(false);
              refresh();
            } catch (error) {
              Alert.alert(
                'Could not remove demo data',
                error instanceof Error ? error.message : 'Something went wrong.',
              );
            }
          },
        },
      ],
    );
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.backgroundElement,
      borderColor: theme.border,
      color: theme.text,
    },
  ];

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <ScreenTitle subtitle="Plan the month and manage your data" title="Settings" />

        {targetQuery.error ? (
          <Card>
            <EmptyState
              actionLabel="Try again"
              icon="cloud-offline-outline"
              message={targetQuery.error.message}
              onAction={targetQuery.reload}
              title="Could not load settings"
            />
          </Card>
        ) : null}

        <View style={styles.section}>
          <SectionHeader title={`Monthly plan · ${monthLabel(month)}`} />
          <Card style={styles.card}>
            <ThemedText type="small" themeColor="textSecondary">
              Used on Home to show how much salary has landed and how much budget is left.
            </ThemedText>

            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Expected salary
              </ThemedText>
              <View
                style={[
                  styles.inputWrap,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                ]}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  ₹
                </ThemedText>
                <TextInput
                  keyboardType="number-pad"
                  onChangeText={(value) => {
                    setSalaryInput(value);
                    setPlanSaved(false);
                  }}
                  placeholder="85000"
                  placeholderTextColor={theme.textSecondary}
                  selectionColor={theme.accent}
                  style={[styles.input, { color: theme.text }]}
                  value={salaryInput}
                />
              </View>
            </View>

            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Monthly spending budget
              </ThemedText>
              <View
                style={[
                  styles.inputWrap,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                ]}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  ₹
                </ThemedText>
                <TextInput
                  keyboardType="number-pad"
                  onChangeText={(value) => {
                    setBudgetInput(value);
                    setPlanSaved(false);
                  }}
                  placeholder="50000"
                  placeholderTextColor={theme.textSecondary}
                  selectionColor={theme.accent}
                  style={[styles.input, { color: theme.text }]}
                  value={budgetInput}
                />
              </View>
            </View>

            <Pressable
              onPress={savePlan}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: theme.accent },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.accentContrast }}>
                {planSaved ? 'Plan saved' : 'Save plan'}
              </ThemedText>
            </Pressable>
          </Card>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Categories" />
          <Card style={styles.card}>
            <View style={styles.categoryWrap}>
              {categories.map((category) => (
                <View
                  key={category.id}
                  style={[styles.categoryChip, { backgroundColor: theme.backgroundSelected }]}>
                  <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                  <ThemedText type="small">{category.name}</ThemedText>
                </View>
              ))}
            </View>

            <View style={styles.divider} />

            <ThemedText type="small" themeColor="textSecondary">
              Add a category
            </ThemedText>
            <View style={styles.addRow}>
              <TextInput
                maxLength={32}
                onChangeText={setNewCategoryName}
                onSubmitEditing={addCategory}
                placeholder="Category name"
                placeholderTextColor={theme.textSecondary}
                returnKeyType="done"
                selectionColor={theme.accent}
                style={[...inputStyle, styles.flex]}
                value={newCategoryName}
              />
            </View>

            <View style={styles.kindRow}>
              {(['expense', 'income'] as const).map((kind) => {
                const selected = newCategoryKind === kind;
                return (
                  <Pressable
                    key={kind}
                    onPress={() => setNewCategoryKind(kind)}
                    style={[
                      styles.kindChip,
                      {
                        backgroundColor: selected ? theme.text : theme.backgroundSelected,
                      },
                    ]}>
                    <ThemedText
                      type="small"
                      style={{ color: selected ? theme.background : theme.textSecondary }}>
                      {kind === 'expense' ? 'Expense' : 'Income'}
                    </ThemedText>
                  </Pressable>
                );
              })}
              <Pressable
                disabled={!newCategoryName.trim()}
                onPress={addCategory}
                style={({ pressed }) => [
                  styles.addButton,
                  {
                    backgroundColor: newCategoryName.trim()
                      ? theme.accent
                      : theme.backgroundSelected,
                  },
                  pressed && newCategoryName.trim() ? styles.pressed : null,
                ]}>
                <Ionicons
                  name="add"
                  size={18}
                  color={
                    newCategoryName.trim() ? theme.accentContrast : theme.textSecondary
                  }
                />
                <ThemedText
                  type="smallBold"
                  style={{
                    color: newCategoryName.trim()
                      ? theme.accentContrast
                      : theme.textSecondary,
                  }}>
                  Add
                </ThemedText>
              </Pressable>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Preferences" />
          <Card style={styles.card}>
            <View style={styles.preferenceRow}>
              <View style={styles.preferenceIcon}>
                <Ionicons name="cash-outline" size={18} color={theme.textSecondary} />
              </View>
              <View style={styles.flex}>
                <ThemedText type="smallBold">Currency</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  More currencies will come later
                </ThemedText>
              </View>
              <ThemedText type="smallBold">INR (₹)</ThemedText>
            </View>
          </Card>
        </View>

        {__DEV__ ? (
          <View style={styles.section}>
            <SectionHeader title="Data" />
            <Card style={styles.card}>
              <View style={styles.preferenceRow}>
                <View style={styles.preferenceIcon}>
                  <Ionicons name="flask-outline" size={18} color={theme.textSecondary} />
                </View>
                <View style={styles.flex}>
                  <ThemedText type="smallBold">Demo data</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {demoCount > 0
                      ? `${demoCount} sample transactions from development`
                      : 'No demo transactions on this device'}
                  </ThemedText>
                </View>
              </View>

              {demoCount > 0 ? (
                <Pressable
                  onPress={removeDemoData}
                  style={({ pressed }) => [
                    styles.outlineButton,
                    { borderColor: theme.danger },
                    pressed && styles.pressed,
                  ]}>
                  <Ionicons name="trash-outline" size={16} color={theme.danger} />
                  <ThemedText type="smallBold" style={{ color: theme.danger }}>
                    Remove demo data
                  </ThemedText>
                </Pressable>
              ) : null}
            </Card>
          </View>
        ) : null}

        <Card style={styles.aboutCard}>
          <View style={styles.aboutRow}>
            <ThemedText type="smallBold">Bux</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              v{version}
            </ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            All of your data is stored locally on this device. Nothing leaves your phone.
          </ThemedText>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  section: {
    gap: Spacing.two,
  },
  card: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.three,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(128, 128, 128, 0.25)',
  },
  addRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  kindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  kindChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
    marginLeft: 'auto',
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  preferenceIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(128, 128, 128, 0.12)',
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
  },
  aboutCard: {
    gap: Spacing.one,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
});
