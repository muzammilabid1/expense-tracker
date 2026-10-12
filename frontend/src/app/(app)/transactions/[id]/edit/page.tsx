"use client";

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Alert, Button, Skeleton, message } from 'antd';
import { RefreshCw } from 'lucide-react';
import { AppShell, PageHeading, Panel } from '@/components/app-shell';
import { TransactionForm } from '@/components/transaction-form';
import type { TransactionFormValues } from '@/components/transaction-form';
import { gql, queries } from '@/lib/api/client';
import { useAuth } from '@/lib/auth-context';
import type { Transaction } from '@/types/api';

export default function EditTransactionPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { token } = useAuth();
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();
  const validId =
    /^\d+$/.test(id) && Number(id) >= 1 && Number.isSafeInteger(Number(id));
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(validId);
  const [error, setError] = useState(
    validId ? "" : "This transaction ID is not valid.",
  );
  const load = useCallback(async () => {
    if (!token) return;
    if (!validId) return;
    try {
      const { transactions } = await gql<{ transactions: Transaction[] }>(
        queries.transactions,
        undefined,
        token,
      );
      const match = transactions.find((item) => item.id === id);
      if (!match)
        throw new Error(
          "Transaction not found, or you do not have access to it.",
        );
      setError("");
      setTransaction(match);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not load this transaction.",
      );
    } finally {
      setLoading(false);
    }
  }, [token, id, validId]);
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);
  async function submit(values: TransactionFormValues) {
    try {
      await gql(
        queries.updateTransaction,
        { input: { id: Number(id), ...values } },
        token!,
      );
      messageApi.success("Transaction updated.");
      router.push("/transactions");
      router.refresh();
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error("Could not update transaction.");
    }
  }
  return (
    <AppShell title="Edit transaction" eyebrow="Transactions">
      {contextHolder}
      <PageHeading
        title="Edit transaction"
        detail="Update the details of this record."
      />
      {error ? (
        <Alert
          type="error"
          showIcon
          message="Couldn’t open this transaction"
          description={error}
          action={
            validId ? (
              <Button
                size="small"
                icon={<RefreshCw size={14} />}
                onClick={() => {
                  setLoading(true);
                  setError("");
                  void load();
                }}
              >
                Retry
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Panel className="p-5 sm:p-8">
          {loading || !transaction ? (
            <Skeleton active paragraph={{ rows: 8 }} />
          ) : (
            <TransactionForm
              key={transaction.id}
              initial={transaction}
              onSubmit={submit}
              submitText="Save changes"
            />
          )}
        </Panel>
      )}
    </AppShell>
  );
}
