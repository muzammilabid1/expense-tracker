'use client';

import { useRouter } from 'next/navigation';
import { message } from 'antd';
import { AppShell, PageHeading, Panel } from '@/components/app-shell';
import { TransactionForm } from '@/components/transaction-form';
import type { TransactionFormValues } from '@/components/transaction-form';
import { gql, queries } from '@/lib/api/client';
import { useAuth } from '@/lib/auth-context';

export default function NewTransactionPage() {
  const { token } = useAuth(); const router = useRouter(); const [messageApi, contextHolder] = message.useMessage();
  async function submit(values: TransactionFormValues) {
    try {
      await gql(queries.createTransaction, { input: values }, token!);
      messageApi.success('Transaction added.'); router.push('/transactions'); router.refresh();
    } catch (error) { throw error instanceof Error ? error : new Error('Could not create transaction.'); }
  }
  return <AppShell title="Add transaction" eyebrow="Transactions">{contextHolder}<PageHeading title="Add a transaction" detail="Record money coming in or going out." /><Panel className="p-5 sm:p-8"><TransactionForm onSubmit={submit} submitText="Save transaction" /></Panel></AppShell>;
}
