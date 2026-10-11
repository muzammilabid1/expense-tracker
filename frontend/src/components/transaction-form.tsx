'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Input, Select, Skeleton } from 'antd';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { gql, queries } from '@/lib/api/client';
import { useAuth } from '@/lib/auth-context';
import type { Category, Transaction, TransactionType } from '@/types/api';

const schema = z.object({ title: z.string().trim().min(1, 'Add a description.').max(150, 'Description must be 150 characters or fewer.'), amount: z.number().finite().positive('Enter an amount greater than zero.'), type: z.enum(['EXPENSE', 'INCOME']), categoryId: z.string().min(1, 'Choose a category.'), date: z.string().min(1, 'Choose a date.'), note: z.string().optional() });
type FormValues = z.infer<typeof schema>;

export function TransactionForm({ initial, onSubmit, submitText }: { initial?: Transaction; onSubmit: (values: Omit<FormValues, 'categoryId'> & { categoryId: number }) => Promise<void>; submitText: string }) {
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryError, setCategoryError] = useState('');
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [submitError, setSubmitError] = useState('');
  const { control, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    // Category.id is GraphQL ID (string), while Transaction.categoryId is GraphQL Int (number).
    defaultValues: initial ? { title: initial.title, amount: initial.amount, type: initial.type, categoryId: String(initial.categoryId), date: initial.date.slice(0, 10), note: initial.note ?? '' } : { title: '', type: 'EXPENSE', categoryId: '', date: new Date().toISOString().slice(0, 10), note: '' },
  });
  const type = useWatch({ control, name: 'type' });
  const selectedCategoryId = useWatch({ control, name: 'categoryId' });
  useEffect(() => {
    if (!token) return;
    gql<{ categories: Category[] }>(queries.categories, undefined, token).then(({ categories: result }) => { setCategories(result); setCategoryError(''); }).catch((error: unknown) => setCategoryError(error instanceof Error ? error.message : 'Could not load categories.')).finally(() => setCategoryLoading(false));
  }, [token]);
  const options = categories.filter((category) => category.type === type).map((category) => ({ value: category.id, label: <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />{category.name}</span> }));
  useEffect(() => {
    const selected = categories.find((category) => category.id === selectedCategoryId);
    if (selected && selected.type !== type) setValue('categoryId', '');
  }, [type, categories, selectedCategoryId, setValue]);
  async function submit(values: FormValues) {
    setSubmitError('');
    try { await onSubmit({ ...values, categoryId: Number(values.categoryId) }); }
    catch (error) { setSubmitError(error instanceof Error ? error.message : 'Could not save this transaction.'); }
  }

  return <form onSubmit={handleSubmit(submit)} noValidate className="max-w-3xl">
    <div className="mb-6 grid grid-cols-2 gap-3"><button type="button" onClick={() => setValue('type', 'EXPENSE')} aria-pressed={type === 'EXPENSE'} className={`flex h-14 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition ${type === 'EXPENSE' ? 'border-[#63d8e877] bg-[#63d8e812] text-cyan' : 'border-line bg-panel text-muted hover:text-white'}`}><ArrowUpRight size={17} /> Expense</button><button type="button" onClick={() => setValue('type', 'INCOME')} aria-pressed={type === 'INCOME'} className={`flex h-14 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition ${type === 'INCOME' ? 'border-[#75f0c077] bg-[#75f0c012] text-mint' : 'border-line bg-panel text-muted hover:text-white'}`}><ArrowDownLeft size={17} /> Income</button></div>
    {submitError && <Alert className="mb-5" type="error" showIcon message={submitError} />}
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Description" error={errors.title?.message} className="sm:col-span-2"><Controller name="title" control={control} render={({ field }) => <Input id="transaction-title" name={field.name} value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} placeholder="e.g. Weekly groceries" maxLength={150} status={errors.title ? 'error' : undefined} />} /></Field>
      <Field label="Amount" error={errors.amount?.message}><Controller name="amount" control={control} render={({ field }) => <Input id="transaction-amount" name={field.name} value={field.value ?? ''} onChange={(event) => field.onChange(event.target.value === '' ? undefined : event.target.valueAsNumber)} onBlur={field.onBlur} type="number" min="0.01" step="0.01" placeholder="0.00" status={errors.amount ? 'error' : undefined} />} /></Field>
      <Field label="Date" error={errors.date?.message}><Controller name="date" control={control} render={({ field }) => <Input id="transaction-date" name={field.name} value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} type="date" status={errors.date ? 'error' : undefined} />} /></Field>
      <Field label="Category" error={errors.categoryId?.message} className="sm:col-span-2">{categoryLoading ? <Skeleton.Input active block /> : <Controller name="categoryId" control={control} render={({ field }) => <Select id="transaction-category" value={field.value || undefined} onBlur={field.onBlur} onChange={field.onChange} options={options} placeholder={`Choose a ${type.toLowerCase()} category`} className="w-full" status={errors.categoryId ? 'error' : undefined} />} />}</Field>
      {categoryError && <p role="alert" className="-mt-3 text-xs text-danger sm:col-span-2">{categoryError} <Link href="/categories" className="underline">Manage categories</Link></p>}
      {!categoryLoading && !categoryError && options.length === 0 && <p className="-mt-3 text-xs text-warning sm:col-span-2">You don’t have any {type.toLowerCase()} categories yet. <Link href="/categories" className="underline">Create one first</Link>.</p>}
      <Field label="Note (optional)" error={errors.note?.message} className="sm:col-span-2"><Controller name="note" control={control} render={({ field }) => <Input.TextArea id="transaction-note" name={field.name} value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} placeholder="Add a note to remember the details" rows={3} />} /></Field>
    </div>
    <div className="mt-7 flex gap-3"><Button type="primary" htmlType="submit" loading={isSubmitting} disabled={categoryLoading || options.length === 0}>{submitText}</Button><Link href="/transactions" className="ant-btn inline-flex items-center">Cancel</Link></div>
  </form>;
}

function Field({ label, error, className = '', children }: { label: string; error?: string; className?: string; children: React.ReactNode }) {
  return <label className={`block text-xs font-medium text-[#c7d1d8] ${className}`}>{label}<div className="mt-2">{children}</div>{error && <span role="alert" className="mt-1 block text-xs text-danger">{error}</span>}</label>;
}

export type TransactionFormValues = { title: string; amount: number; type: TransactionType; categoryId: number; date: string; note?: string };
