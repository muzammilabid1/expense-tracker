'use client';

import { useState } from 'react';
import { Alert, Avatar, Button, Input, message } from 'antd';
import { CalendarDays, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppShell, PageHeading, Panel } from '@/components/app-shell';
import { gql, queries } from '@/lib/api/client';
import { useAuth } from '@/lib/auth-context';
import type { User } from '@/types/api';

const schema = z.object({ name: z.string().trim().min(1, 'Name cannot be empty.').max(100, 'Name must be 100 characters or fewer.'), email: z.email('Enter a valid email address.') });
type Values = z.infer<typeof schema>;

export default function ProfilePage() {
  const { user, token, reloadUser } = useAuth(); const [serverError, setServerError] = useState(''); const [messageApi, contextHolder] = message.useMessage();
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    values: { name: user?.name ?? '', email: user?.email ?? '' },
  });
  async function submit(values: Values) {
    setServerError('');
    try { await gql<{ updateProfile: User }>(queries.updateProfile, { input: values }, token!); await reloadUser(); messageApi.success('Profile saved.'); }
    catch (error) { setServerError(error instanceof Error ? error.message : 'Could not update your profile.'); }
  }
  return <AppShell title="Profile" eyebrow="Your account">{contextHolder}<PageHeading title="Your profile" detail="Manage the personal details attached to your account." />
    <div className="grid gap-5 lg:grid-cols-[.85fr_1.4fr]">
      <Panel className="h-fit p-6"><div className="flex flex-col items-center text-center"><Avatar size={76} style={{ background: '#253f3a', color: '#75F0C0', fontSize: 26 }}>{user?.name.slice(0, 1).toUpperCase()}</Avatar><h2 className="mb-0 mt-4 text-lg font-semibold text-white">{user?.name}</h2><p className="mb-0 mt-1 text-sm text-muted">{user?.email}</p></div><div className="my-6 border-t border-line" /><div className="flex items-start gap-3"><span className="mt-0.5 text-cyan"><CalendarDays size={16} /></span><div><div className="text-xs font-medium text-white">Member since</div><div className="mt-1 text-xs text-muted">{user?.createdAt ? new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date(user.createdAt)) : '—'}</div></div></div><div className="mt-4 flex items-start gap-3"><span className="mt-0.5 text-mint"><ShieldCheck size={16} /></span><div><div className="text-xs font-medium text-white">Your privacy</div><div className="mt-1 text-xs leading-5 text-muted">Your personal details are only available to you after you sign in.</div></div></div></Panel>
      <Panel className="p-5 sm:p-7"><div className="mb-6"><h3 className="m-0 text-sm font-semibold text-white">Personal information</h3><p className="mb-0 mt-1 text-xs text-muted">Changes are saved to your existing account.</p></div><form onSubmit={handleSubmit(submit)} noValidate className="max-w-xl space-y-5"><label className="block text-xs font-medium text-[#c7d1d8]">Full name<Controller name="name" control={control} render={({ field }) => <Input id="profile-name" name={field.name} value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} autoComplete="name" prefix={<UserRound size={15} className="text-muted" />} status={errors.name ? 'error' : undefined} className="mt-2" />} />{errors.name && <span className="mt-1 block text-xs text-danger">{errors.name.message}</span>}</label><label className="block text-xs font-medium text-[#c7d1d8]">Email address<Controller name="email" control={control} render={({ field }) => <Input id="profile-email" name={field.name} value={field.value ?? ''} onChange={field.onChange} onBlur={field.onBlur} type="email" autoComplete="email" prefix={<Mail size={15} className="text-muted" />} status={errors.email ? 'error' : undefined} className="mt-2" />} />{errors.email && <span className="mt-1 block text-xs text-danger">{errors.email.message}</span>}</label>{serverError && <Alert type="error" showIcon message={serverError} /> }<Button type="primary" htmlType="submit" loading={isSubmitting}>Save profile</Button></form><div className="mt-8 rounded-xl border border-line bg-raised/60 p-4"><div className="flex gap-3"><LockKeyhole size={16} className="mt-0.5 shrink-0 text-warning" /><div><div className="text-xs font-semibold text-white">Password and sign-out controls</div><p className="mb-0 mt-1 text-xs leading-5 text-muted">The current backend does not expose password-change or logout operations, so this page only offers profile updates.</p></div></div></div></Panel>
    </div>
  </AppShell>;
}
