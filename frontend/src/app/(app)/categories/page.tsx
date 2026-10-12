'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Input, Modal, Select, Skeleton } from 'antd';
import { ArrowDownLeft, ArrowUpRight, Pencil, Plus, RefreshCw, Shapes, Trash2 } from 'lucide-react';
import { AppShell, PageHeading, Panel } from '@/components/app-shell';
import { gql, queries } from '@/lib/api/client';
import { useAuth } from '@/lib/auth-context';
import type { Category, TransactionType } from '@/types/api';

const colors = ['#75F0C0', '#63D8E8', '#D7F171', '#FF9F78', '#A99BFF', '#F28FB5', '#8EC5FF', '#F3C969'];
type Draft = { name: string; type: TransactionType; color: string };

export default function CategoriesPage() {
  const { token } = useAuth(); const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false); const [editing, setEditing] = useState<Category | null>(null);
  const [draft, setDraft] = useState<Draft>({ name: '', type: 'EXPENSE', color: colors[0] }); const [saving, setSaving] = useState(false); const [formError, setFormError] = useState('');
  const { message: messageApi, modal } = App.useApp();
  const load = useCallback(async () => {
    if (!token) return;
    try { const result = await gql<{ categories: Category[] }>(queries.categories, undefined, token); setError(''); setCategories(result.categories); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load categories.'); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  function openCreate() { setEditing(null); setDraft({ name: '', type: 'EXPENSE', color: colors[0] }); setFormError(''); setModalOpen(true); }
  function openEdit(category: Category) { setEditing(category); setDraft({ name: category.name, type: category.type, color: category.color }); setFormError(''); setModalOpen(true); }
  async function save() {
    const name = draft.name.trim();
    if (!name) { setFormError('Category name is required.'); return; }
    if (name.length > 100) { setFormError('Category name must be 100 characters or fewer.'); return; }
    setSaving(true); setFormError('');
    try {
      if (editing) await gql(queries.updateCategory, { input: { id: Number(editing.id), ...draft, name } }, token!);
      else await gql(queries.createCategory, { input: { ...draft, name } }, token!);
      setModalOpen(false); messageApi.success(editing ? 'Category updated.' : 'Category created.'); await load();
    } catch (caught) { setFormError(caught instanceof Error ? caught.message : 'Could not save category.'); }
    finally { setSaving(false); }
  }
  function remove(category: Category) {
    modal.confirm({ title: `Delete “${category.name}”?`, content: 'Categories with transactions cannot be deleted. Other categories will be permanently removed.', okText: 'Delete category', okButtonProps: { danger: true }, cancelText: 'Keep it', onOk: async () => {
      try { await gql<{ deleteCategory: boolean }>(queries.deleteCategory, { id: Number(category.id) }, token!); messageApi.success('Category deleted.'); await load(); }
      catch (caught) { messageApi.error(caught instanceof Error ? caught.message : 'Could not delete category.'); }
    } });
  }

  return <AppShell title="Categories" eyebrow="Organize">
    <PageHeading title="Categories" detail="Keep your income and spending organized." action={<Button type="primary" icon={<Plus size={16} />} onClick={openCreate}>New category</Button>} />
    {error && <Alert className="mb-5" type="error" showIcon message="Couldn’t load categories" description={error} action={<Button size="small" icon={<RefreshCw size={14} />} onClick={() => { setLoading(true); setError(''); void load(); }}>Retry</Button>} />}
    {loading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <Panel className="p-5" key={item}><Skeleton active /></Panel>)}</div> : categories.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{categories.map((category) => <Panel key={category.id} className="group p-5 transition hover:-translate-y-0.5 hover:border-[#75f0c044]"><div className="flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl" style={{ backgroundColor: `${category.color}20`, color: category.color }}>{category.type === 'INCOME' ? <ArrowDownLeft size={19} /> : <ArrowUpRight size={19} />}</span><div className="flex gap-1"><Button aria-label={`Edit ${category.name}`} type="text" icon={<Pencil size={15} />} onClick={() => openEdit(category)} /><Button aria-label={`Delete ${category.name}`} type="text" danger icon={<Trash2 size={15} />} onClick={() => remove(category)} /></div></div><div className="mt-5 flex items-center gap-2"><h3 className="m-0 truncate text-base font-semibold text-white">{category.name}</h3><i className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: category.color }} /></div><div className="mt-1 text-xs uppercase tracking-[.14em] text-muted">{category.type.toLowerCase()}</div></Panel>)}</div> : <Panel className="px-6 py-16 text-center"><Shapes size={28} className="mx-auto text-mint" /><h3 className="mb-0 mt-4 text-base font-semibold text-white">Make your money easier to sort</h3><p className="mb-5 mt-2 text-sm text-muted">Create income and expense categories to use on transactions.</p><Button type="primary" icon={<Plus size={15} />} onClick={openCreate}>Create a category</Button></Panel>}
    <Modal title={editing ? 'Edit category' : 'Create a category'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => void save()} okText={editing ? 'Save changes' : 'Create category'} confirmLoading={saving} destroyOnHidden>
      <div className="space-y-5 py-3"><label className="block text-xs font-medium text-[#c7d1d8]">Category name<Input value={draft.name} maxLength={100} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Household" className="mt-2" /></label><label className="block text-xs font-medium text-[#c7d1d8]">Type<Select value={draft.type} onChange={(type: TransactionType) => setDraft({ ...draft, type })} options={[{ value: 'EXPENSE', label: 'Expense' }, { value: 'INCOME', label: 'Income' }]} className="mt-2 w-full" /></label><fieldset><legend className="mb-2 text-xs font-medium text-[#c7d1d8]">Color</legend><div className="flex flex-wrap gap-2">{colors.map((color) => <button key={color} type="button" aria-label={`Choose ${color}`} aria-pressed={draft.color === color} onClick={() => setDraft({ ...draft, color })} className={`h-8 w-8 rounded-full border-2 ${draft.color === color ? 'border-white ring-2 ring-mint/40' : 'border-transparent'}`} style={{ background: color }} />)}<label className="grid h-8 w-8 cursor-pointer place-items-center overflow-hidden rounded-full border border-line bg-raised text-xs text-white" title="Choose custom color">+<input type="color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value.toUpperCase() })} className="sr-only" /></label></div></fieldset>{formError && <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-[#ffadb4]">{formError}</div>}</div>
    </Modal>
  </AppShell>;
}
