'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Drawer, Dropdown, Avatar, message } from 'antd';
import type { MenuProps } from 'antd';
import { Activity, ArrowLeftRight, ChartNoAxesCombined, CircleUserRound, LayoutDashboard, LogOut, Menu, Shapes, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const items = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/categories', label: 'Categories', icon: Shapes },
  { href: '/profile', label: 'Profile', icon: CircleUserRound },
];

function NavLinks({ close }: { close?: () => void }) {
  const pathname = usePathname();
  return <nav className="space-y-1">{items.map(({ href, label, icon: Icon }) => {
    const active = pathname === href || (href === '/transactions' && pathname.startsWith('/transactions/'));
    return <Link key={href} href={href} onClick={close} className={`group flex h-12 items-center gap-3 rounded-xl px-4 text-sm transition ${active ? 'bg-[#75f0c01a] text-mint ring-1 ring-[#75f0c033]' : 'text-muted hover:bg-raised hover:text-white'}`}>
      <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_12px_#75f0c0]" />}
    </Link>;
  })}</nav>;
}

function Sidebar({ close }: { close?: () => void }) {
  return <div className="flex h-full flex-col bg-sidebar px-5 py-6">
    <Link href="/dashboard" onClick={close} className="mb-14 flex items-center gap-3 px-2">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-mint to-cyan text-ink"><Activity size={21} /></span>
      <span><span className="block text-sm font-bold tracking-[.18em] text-white">NORTHSTAR</span><span className="text-[10px] uppercase tracking-[.2em] text-muted">Personal finance</span></span>
    </Link>
    <div className="mb-4 px-4 text-[10px] font-semibold uppercase tracking-[.2em] text-[#667784]">Workspace</div>
    <NavLinks close={close} />
    <div className="mt-auto rounded-2xl border border-line bg-panel p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-mint"><ChartNoAxesCombined size={15} /> Stay on track</div>
      <p className="m-0 text-xs leading-5 text-muted">Small, consistent check-ins make your money easier to understand.</p>
    </div>
  </div>;
}

export function AppShell({ children, title, eyebrow, action }: { children: React.ReactNode; title: string; eyebrow: string; action?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();
  const [messageApi, contextHolder] = message.useMessage();
  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : 'Could not sign out. Please try again.');
      setSigningOut(false);
    }
  };
  const menu: MenuProps = {
    items: [{ key: 'profile', label: <Link href="/profile">Your profile</Link> }],
  };
  return <div className="min-h-screen bg-ink">
    {contextHolder}
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-line md:block"><Sidebar /></aside>
    <div className="md:pl-[264px]">
      <header className="sticky top-0 z-20 flex h-[82px] items-center justify-between border-b border-line bg-ink/90 px-5 backdrop-blur-xl sm:px-9 lg:px-12">
        <div className="flex items-center gap-3"><Button aria-label="Open navigation" className="md:hidden" icon={<Menu size={18} />} onClick={() => setOpen(true)} /><div><div className="text-[10px] font-semibold uppercase tracking-[.2em] text-muted">{eyebrow}</div><h1 className="mb-0 mt-0.5 text-base font-semibold text-white">{title}</h1></div></div>
        <div className="flex items-center gap-2 sm:gap-3">{action}<Dropdown menu={menu} placement="bottomRight"><button className="flex items-center gap-2 rounded-xl border border-line bg-panel p-1.5 pr-3 text-left hover:border-[#75f0c066]" aria-label="Open profile menu"><Avatar size={30} style={{ background: '#253f3a', color: '#75F0C0' }}>{user?.name?.slice(0, 1).toUpperCase()}</Avatar><span className="hidden max-w-[120px] truncate text-xs text-white sm:block">{user?.name}</span></button></Dropdown><Button aria-label="Sign out" title="Sign out" icon={<LogOut size={16} />} loading={signingOut} onClick={() => void handleLogout()} className="!border-[#ff7c8644] !text-[#ff9aa1] hover:!border-[#ff7c86] hover:!text-[#ffb0b5]"><span className="hidden sm:inline">Sign out</span></Button></div>
      </header>
      <main className="mx-auto max-w-[1500px] px-5 py-9 sm:px-9 sm:py-11 lg:px-12 lg:py-12">{children}</main>
    </div>
    <Drawer placement="left" width={286} open={open} onClose={() => setOpen(false)} closeIcon={<X size={18} />} styles={{ body: { padding: 0 }, header: { display: 'none' } }}><Sidebar close={() => setOpen(false)} /></Drawer>
  </div>;
}

export function PageHeading({ title, detail, action }: { title: string; detail: string; action?: React.ReactNode }) {
  return <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><h2 className="m-0 text-2xl font-semibold tracking-tight text-white sm:text-[28px]">{title}</h2><p className="mb-0 mt-2 text-sm leading-6 text-muted">{detail}</p></div>{action}</div>;
}

export function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`card-glow rounded-2xl border border-line bg-panel ${className}`}>{children}</section>;
}
