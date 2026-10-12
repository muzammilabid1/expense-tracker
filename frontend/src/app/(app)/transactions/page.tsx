'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, App, Button, Input, Select, Table, Tag } from 'antd';
import type { TableProps } from 'antd';
import { ArrowDownLeft, ArrowUpRight, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { AppShell, PageHeading } from '@/components/app-shell';
import { ScrollReveal } from '@/components/scroll-reveal';
import { gql, queries } from '@/lib/api/client';
import { useAuth } from '@/lib/auth-context';
import { money, shortDate } from '@/lib/utils';
import type { Category, Transaction, TransactionType } from '@/types/api';

type FilterType = 'ALL' | TransactionType;

export default function TransactionsPage() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryError, setCategoryError] = useState('');
  const [type, setType] = useState<FilterType>('ALL');
  const [categoryId, setCategoryId] = useState<string>('ALL');
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const { message: messageApi, modal } = App.useApp();

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const filter: Record<string, unknown> = {};
      if (type !== 'ALL') filter.type = type;
      if (categoryId !== 'ALL') filter.categoryId = Number(categoryId);
      if (from) filter.from = from;
      if (to) filter.to = to;
      const txResult = await gql<{ transactions: Transaction[] }>(queries.transactions, { filter }, token);
      setError(''); setTransactions(txResult.transactions);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load transactions.'); }
    finally { setLoading(false); }
  }, [token, type, categoryId, from, to]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  useEffect(() => {
    if (!token) return;
    gql<{ categories: Category[] }>(queries.categories, undefined, token).then(({ categories: result }) => { setCategories(result); setCategoryError(''); }).catch((caught: unknown) => setCategoryError(caught instanceof Error ? caught.message : 'Could not load categories.'));
  }, [token]);

  const visible = useMemo(() => transactions.filter((item) => `${item.title} ${item.note ?? ''} ${categories.find((category) => category.id === String(item.categoryId))?.name ?? ''}`.toLowerCase().includes(search.toLowerCase())), [transactions, categories, search]);
  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  async function remove(record: Transaction) {
    modal.confirm({ title: 'Delete this transaction?', content: `“${record.title}” will be permanently removed.`, okText: 'Delete transaction', okButtonProps: { danger: true }, cancelText: 'Keep it', onOk: async () => {
      try { await gql<{ deleteTransaction: boolean }>(queries.deleteTransaction, { id: Number(record.id) }, token!); messageApi.success('Transaction deleted.'); await load(); }
      catch (caught) { messageApi.error(caught instanceof Error ? caught.message : 'Could not delete transaction.'); }
    } });
  }

  const columns: TableProps<Transaction>['columns'] = [
    { title: 'Description', dataIndex: 'title', key: 'title', sorter: (a, b) => a.title.localeCompare(b.title), render: (_, row) => <div className="flex items-center gap-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${row.type === 'INCOME' ? 'bg-[#75f0c01a] text-mint' : 'bg-[#63d8e81a] text-cyan'}`}>{row.type === 'INCOME' ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span><span className="min-w-0"><span className="block max-w-[200px] truncate font-medium text-white">{row.title}</span><span className="block max-w-[200px] truncate text-xs text-muted">{row.note || '—'}</span></span></div> },
    { title: 'Category', dataIndex: 'categoryId', key: 'category', sorter: (a, b) => (categoryMap.get(String(a.categoryId))?.name ?? '').localeCompare(categoryMap.get(String(b.categoryId))?.name ?? ''), render: (id: number) => { const cat = categoryMap.get(String(id)); return cat ? <span className="flex items-center gap-2 text-sm text-muted"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />{cat.name}</span> : <span className="text-muted">—</span>; } },
    { title: 'Date', dataIndex: 'date', key: 'date', sorter: (a, b) => a.date.localeCompare(b.date), render: (date: string) => <span className="text-sm text-muted">{shortDate(date)}</span> },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', sorter: (a, b) => a.amount - b.amount, align: 'right', render: (_, row) => <span className={`font-semibold ${row.type === 'INCOME' ? 'text-mint' : 'text-white'}`}>{row.type === 'INCOME' ? '+' : '−'}{money(row.amount)}</span> },
    { title: '', key: 'actions', width: 104, align: 'right', render: (_, row) => <div className="transaction-row-actions"><Link aria-label={`Edit ${row.title}`} title="Edit transaction" className="transaction-row-action" href={`/transactions/${row.id}/edit`}><Pencil size={16} strokeWidth={1.8} /></Link><Button aria-label={`Delete ${row.title}`} title="Delete transaction" className="transaction-row-action transaction-delete-action" type="text" danger icon={<Trash2 size={16} strokeWidth={1.8} />} onClick={() => remove(row)} /></div> },
  ];

  return <AppShell title="Transactions" eyebrow="Your activity">
    <PageHeading title="Transactions" detail="Review and organize your income and spending." action={<Link href="/transactions/new" className="group inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-mint px-4 text-sm font-semibold text-ink shadow-[0_8px_26px_#75f0c01a] transition duration-200 hover:-translate-y-0.5 hover:bg-[#5bc79f] hover:shadow-[0_9px_24px_#42a98233] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"><Plus size={16} className="transition-transform duration-300 group-hover:rotate-45" />Add transaction</Link>} />
    {error && <Alert className="mb-5" type="error" showIcon message="Couldn’t load transactions" description={error} action={<Button size="small" icon={<RefreshCw size={14} />} onClick={() => { setLoading(true); setError(''); void load(); }}>Retry</Button>} />}
    {categoryError && <Alert className="mb-5" type="warning" showIcon message="Category names are unavailable" description={categoryError} />}
    <div className="mb-5 grid min-w-0 grid-cols-1 gap-3 rounded-2xl border border-line bg-panel p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-[minmax(200px,1.4fr)_repeat(4,minmax(125px,1fr))]">
      <label className="block min-w-0 text-xs font-medium text-muted">Search<Input allowClear value={search} onChange={(event) => setSearch(event.target.value)} prefix={<Search size={15} className="text-muted" />} placeholder="Description or note" aria-label="Search transactions" className="mt-1" /></label>
      <label className="block min-w-0 text-xs font-medium text-muted">Type<Select aria-label="Filter by type" value={type} onChange={(value) => { setLoading(true); setType(value); }} options={[{ value: 'ALL', label: 'All activity' }, { value: 'EXPENSE', label: 'Expenses' }, { value: 'INCOME', label: 'Income' }]} className="mt-1 w-full" /></label>
      <label className="block min-w-0 text-xs font-medium text-muted">Category<Select aria-label="Filter by category" value={categoryId} onChange={(value) => { setLoading(true); setCategoryId(value); }} options={[{ value: 'ALL', label: 'All categories' }, ...categories.map((cat) => ({ value: cat.id, label: cat.name }))]} className="mt-1 w-full" /></label>
      <label className="block min-w-0 text-xs font-medium text-muted">From<Input aria-label="From date" type="date" value={from} onChange={(e) => { setLoading(true); setFrom(e.target.value); }} className="mt-1" /></label>
      <label className="block min-w-0 text-xs font-medium text-muted">To<Input aria-label="To date" type="date" value={to} onChange={(e) => { setLoading(true); setTo(e.target.value); }} className="mt-1" /></label>
    </div>
    {from && to && from > to && <Alert className="mb-4" type="warning" showIcon message="The start date must be before the end date." />}
    <ScrollReveal><div className="mb-3 px-1 text-xs text-muted"><span>{visible.length} {visible.length === 1 ? 'transaction' : 'transactions'}</span></div>
    <div className="overflow-hidden rounded-2xl border border-line bg-panel"><Table rowKey="id" columns={columns} dataSource={visible} loading={loading} scroll={{ x: 760 }} pagination={{ pageSize: 8, showSizeChanger: false, showTotal: (total) => `${total} records` }} locale={{ emptyText: <div className="py-8"><div className="mb-2 text-sm text-white">{search || type !== 'ALL' || categoryId !== 'ALL' || from || to ? 'No transactions match these filters.' : 'No transactions yet.'}</div>{!search && <Link href="/transactions/new" className="text-xs text-mint">Add a transaction →</Link>}</div>}} /></div></ScrollReveal>
    <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-muted"><Tag color="green">Income</Tag><Tag color="cyan">Expense</Tag></div>
  </AppShell>;
}
