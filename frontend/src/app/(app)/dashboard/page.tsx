'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Skeleton } from 'antd';
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Plus, RefreshCw } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis, CartesianGrid, Area, AreaChart } from 'recharts';
import { AppShell, PageHeading, Panel } from '@/components/app-shell';
import { ScrollReveal } from '@/components/scroll-reveal';
import { gql, queries } from '@/lib/api/client';
import { useAuth } from '@/lib/auth-context';
import { currentMonth, money, monthLabel, shortDate } from '@/lib/utils';
import type { Category, MonthlySummary, Transaction } from '@/types/api';

type TrendPoint = { label: string; income: number; expenses: number };

export default function DashboardPage() {
  const { token, user } = useAuth();
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [period] = useState(currentMonth);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const months = Array.from({ length: 6 }, (_, index) => {
        const date = new Date(period.year, period.month - 1 - (5 - index), 1);
        return { year: date.getFullYear(), month: date.getMonth() + 1 };
      });
      const previousMonths = months.filter((month) => month.year !== period.year || month.month !== period.month);
      const [monthly, txResult, categoryResult, previousResults] = await Promise.all([
        gql<{ monthlySummary: MonthlySummary }>(queries.monthlySummary, period, token),
        gql<{ transactions: Transaction[] }>(queries.transactions, undefined, token),
        gql<{ categories: Category[] }>(queries.categories, undefined, token),
        Promise.all(previousMonths.map((month) => gql<{ monthlySummary: MonthlySummary }>(queries.monthlySummary, month, token))),
      ]);
      setError(''); setSummary(monthly.monthlySummary); setTransactions(txResult.transactions); setCategories(categoryResult.categories);
      const summaries = new Map(previousResults.map(({ monthlySummary: item }) => [`${item.year}-${item.month}`, item]));
      summaries.set(`${monthly.monthlySummary.year}-${monthly.monthlySummary.month}`, monthly.monthlySummary);
      setTrend(months.flatMap((month) => { const item = summaries.get(`${month.year}-${month.month}`); return item ? [{ label: monthLabel(item.year, item.month), income: item.incomeTotal, expenses: item.expenseTotal }] : []; }));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not load your dashboard.'); }
    finally { setLoading(false); }
  }, [token, period]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const recent = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const expenseBreakdown = summary?.categoryBreakdown.filter((item) => item.type === 'EXPENSE').sort((a, b) => b.total - a.total) ?? [];
  const greeting = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date());

  return <AppShell title="Overview" eyebrow={greeting}>
    <PageHeading title={`Good to see you, ${user?.name?.split(' ')[0] ?? 'there'}`} detail="Here’s how your money is moving this month." action={<Link href="/transactions/new" className="group inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-mint px-4 text-sm font-semibold text-ink shadow-[0_8px_26px_#75f0c01a] transition duration-200 hover:-translate-y-0.5 hover:bg-[#5bc79f] hover:shadow-[0_9px_24px_#42a98233] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"><Plus size={16} className="transition-transform duration-300 group-hover:rotate-45" />Add transaction</Link>} />
    {error && <Alert className="mb-6" type="error" showIcon message="Couldn’t load the dashboard" description={error} action={<Button size="small" icon={<RefreshCw size={14} />} onClick={() => { setLoading(true); setError(''); void load(); }}>Retry</Button>} />}
    <ScrollReveal className="scroll-reveal-stagger"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard title="Net cash flow" value={summary?.netTotal} loading={loading} icon={<ArrowRight size={17} />} tone="mint" note="Income minus expenses this month" />
      <SummaryCard title="Income" value={summary?.incomeTotal} loading={loading} icon={<ArrowDownLeft size={17} />} tone="cyan" note="Money in this month" />
      <SummaryCard title="Expenses" value={summary?.expenseTotal} loading={loading} icon={<ArrowUpRight size={17} />} tone="lime" note="Money out this month" />
      <div className="card-glow rounded-2xl border border-line bg-panel p-5"><div className="flex items-center justify-between text-xs text-muted"><span>Transactions</span><span className="grid h-8 w-8 place-items-center rounded-lg bg-raised text-cyan"><ArrowLeftRightIcon /></span></div>{loading ? <Skeleton active paragraph={false} className="mt-4" /> : <div className="mt-3 text-3xl font-semibold tracking-tight text-white">{transactions.length}</div>}<div className="mt-2 text-xs text-muted">All recorded activity</div></div>
    </div></ScrollReveal>
    <ScrollReveal delay={70}><div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
      <Panel className="p-5 sm:p-6"><div className="mb-5 flex items-start justify-between"><div><h3 className="m-0 text-sm font-semibold text-white">Cash flow</h3><p className="mb-0 mt-1 text-xs text-muted">Income and expenses · last 6 months</p></div><div className="flex gap-4 text-[11px]"><span className="flex items-center gap-1.5 text-muted"><i className="h-2 w-2 rounded-full bg-mint" />Income</span><span className="flex items-center gap-1.5 text-muted"><i className="h-2 w-2 rounded-full bg-cyan" />Expenses</span></div></div>
        {loading ? <Skeleton active paragraph={{ rows: 5 }} /> : <div className="h-[260px] w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{ top: 8, right: 5, bottom: 0, left: -18 }}><defs><linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#75F0C0" stopOpacity={0.2} /><stop offset="95%" stopColor="#75F0C0" stopOpacity={0} /></linearGradient><linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#63D8E8" stopOpacity={0.15} /><stop offset="95%" stopColor="#63D8E8" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#293844" strokeDasharray="3 5" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#9BAAB7', fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#738391', fontSize: 10 }} tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`} /><ChartTooltip contentStyle={{ background: '#1C2935', border: '1px solid #293844', borderRadius: 12, color: '#F3F7FA' }} formatter={(value) => money(Number(value))} /><Area type="monotone" dataKey="income" name="Income" stroke="#75F0C0" strokeWidth={2} fill="url(#incomeFill)" /><Area type="monotone" dataKey="expenses" name="Expenses" stroke="#63D8E8" strokeWidth={2} fill="url(#expenseFill)" /></AreaChart></ResponsiveContainer></div>}
      </Panel>
      <Panel className="p-5 sm:p-6"><div className="mb-2"><h3 className="m-0 text-sm font-semibold text-white">Where it went</h3><p className="mb-0 mt-1 text-xs text-muted">Spending by category this month</p></div>
        {loading ? <Skeleton active paragraph={{ rows: 5 }} /> : expenseBreakdown.length ? <><div className="h-[165px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={expenseBreakdown} dataKey="total" nameKey="categoryName" innerRadius={48} outerRadius={70} paddingAngle={3} stroke="none">{expenseBreakdown.map((item) => <Cell key={`${item.categoryId}-${item.type}`} fill={item.color} />)}</Pie><ChartTooltip contentStyle={{ background: '#1C2935', border: '1px solid #293844', borderRadius: 12 }} formatter={(value) => money(Number(value))} /></PieChart></ResponsiveContainer></div><div className="space-y-3">{expenseBreakdown.slice(0, 4).map((item) => <div className="flex items-center justify-between gap-3 text-xs" key={`${item.categoryId}-${item.type}`}><span className="flex min-w-0 items-center gap-2 text-muted"><i className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} /><span className="truncate">{item.categoryName}</span></span><span className="shrink-0 font-medium text-white">{money(item.total)}</span></div>)}</div></> : <EmptyState text="No expense categories to show yet." action="Add a transaction" href="/transactions/new" />}
      </Panel>
    </div></ScrollReveal>
    <ScrollReveal delay={100}><Panel className="mt-5 overflow-hidden"><div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6"><div><h3 className="m-0 text-sm font-semibold text-white">Recent transactions</h3><p className="mb-0 mt-1 text-xs text-muted">Your latest recorded activity</p></div><Link className="flex items-center gap-1 text-xs font-medium text-mint hover:text-white" href="/transactions">View all <ArrowRight size={14} /></Link></div>
      {loading ? <div className="space-y-4 p-6"><Skeleton active paragraph={false} /><Skeleton active paragraph={false} /><Skeleton active paragraph={false} /></div> : recent.length ? <div className="divide-y divide-line">{recent.map((tx) => { const category = categoryMap.get(String(tx.categoryId)); return <div key={tx.id} className="flex items-center gap-3 px-5 py-4 sm:px-6"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `${category?.color ?? '#75F0C0'}20`, color: category?.color ?? '#75F0C0' }}>{tx.type === 'INCOME' ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-white">{tx.title}</div><div className="mt-1 text-xs text-muted">{category?.name ?? 'Category'} · {shortDate(tx.date)}</div></div><div className={`text-sm font-semibold ${tx.type === 'INCOME' ? 'text-mint' : 'text-white'}`}>{tx.type === 'INCOME' ? '+' : '−'}{money(tx.amount)}</div></div>; })}</div> : <EmptyState text="Your transactions will appear here." action="Add your first transaction" href="/transactions/new" />}
    </Panel></ScrollReveal>
    <div className="mt-5 flex flex-wrap gap-3"><Link href="/categories" className="ant-btn inline-flex items-center gap-2"><Plus size={15} />Manage categories</Link><span className="self-center text-xs text-muted">{categories.length} categories ready to use</span></div>
  </AppShell>;
}

function SummaryCard({ title, value, loading, icon, tone, note }: { title: string; value?: number; loading: boolean; icon: React.ReactNode; tone: 'mint' | 'cyan' | 'lime'; note: string }) {
  const colors = { mint: 'text-mint bg-[#75f0c01a]', cyan: 'text-cyan bg-[#63d8e81a]', lime: 'text-lime bg-[#d7f1711a]' };
  return <div className="card-glow rounded-2xl border border-line bg-panel p-5"><div className="flex items-center justify-between text-xs text-muted">{title}<span className={`grid h-8 w-8 place-items-center rounded-lg ${colors[tone]}`}>{icon}</span></div>{loading ? <Skeleton active paragraph={false} className="mt-4" /> : <div className="mt-3 truncate text-3xl font-semibold tracking-tight text-white">{money(value ?? 0)}</div>}<div className="mt-2 text-xs text-muted">{note}</div></div>;
}

function EmptyState({ text, action, href }: { text: string; action: string; href: string }) {
  return <div className="px-6 py-8 text-center"><p className="mb-3 text-sm text-muted">{text}</p><Link href={href} className="text-xs font-medium text-mint hover:text-white">{action} →</Link></div>;
}

function ArrowLeftRightIcon() { return <ArrowRight size={16} className="rotate-180" />; }
