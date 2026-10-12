'use client';

import { useEffect, useState } from 'react';
import { Alert, Avatar, Button, Input, message } from 'antd';
import { CalendarDays, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppShell, PageHeading, Panel } from '@/components/app-shell';
import { gql, queries } from '@/lib/api/client';
import { useAuth } from '@/lib/auth-context';
import type { User } from '@/types/api';

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name cannot be empty.')
    .max(100, 'Name must be 100 characters or fewer.'),
});

type ProfileValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, token, reloadUser } = useAuth();
  const [serverError, setServerError] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [emailError, setEmailError] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [requestingCode, setRequestingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [messageApi, contextHolder] = message.useMessage();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: { name: user?.name ?? '' },
  });

  async function saveProfile(values: ProfileValues) {
    setServerError('');
    try {
      await gql<{ updateProfile: User }>(
        queries.updateProfile,
        { input: values },
        token!,
      );
      await reloadUser();
      messageApi.success('Profile saved.');
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : 'Could not update your profile.',
      );
    }
  }

  useEffect(() => {
    if (resendIn === 0) return;
    const timer = window.setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  async function requestEmailCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailError('');

    const normalizedEmail = newEmail.trim();
    const validation = z
      .email('Enter a valid email address.')
      .safeParse(normalizedEmail);
    if (!validation.success) {
      setEmailError(validation.error.issues[0]?.message ?? 'Enter a valid email address.');
      return;
    }

    setRequestingCode(true);
    try {
      await gql<{ requestEmailChange: boolean }>(
        queries.requestEmailChange,
        { email: normalizedEmail },
        token!,
      );
      setNewEmail(normalizedEmail);
      setCodeSent(true);
      setVerificationCode('');
      setResendIn(60);
      messageApi.success('Verification code sent.');
    } catch (error) {
      setEmailError(
        error instanceof Error ? error.message : 'Could not send a verification code.',
      );
    } finally {
      setRequestingCode(false);
    }
  }

  async function verifyEmailCode() {
    setEmailError('');
    if (!/^\d{6}$/.test(verificationCode)) {
      setEmailError('Enter the six-digit code from your email.');
      return;
    }

    setVerifyingCode(true);
    try {
      await gql<{ verifyEmailChange: User }>(
        queries.verifyEmailChange,
        { code: verificationCode },
        token!,
      );
      await reloadUser();
      setCodeSent(false);
      setNewEmail('');
      setVerificationCode('');
      setResendIn(0);
      messageApi.success('Email address verified and updated.');
    } catch (error) {
      setEmailError(
        error instanceof Error ? error.message : 'Could not verify this code.',
      );
    } finally {
      setVerifyingCode(false);
    }
  }

  function useDifferentEmail() {
    setCodeSent(false);
    setVerificationCode('');
    setEmailError('');
  }

  return (
    <AppShell title="Profile" eyebrow="Your account">
      {contextHolder}
      <PageHeading
        title="Your profile"
        detail="Manage the personal details attached to your account."
      />
      <div className="grid gap-5 lg:grid-cols-[.85fr_1.4fr]">
        <Panel className="h-fit p-6">
          <div className="flex flex-col items-center text-center">
            <Avatar
              size={76}
              style={{ background: '#253f3a', color: '#75F0C0', fontSize: 26 }}
            >
              {user?.name.slice(0, 1).toUpperCase()}
            </Avatar>
            <h2 className="mb-0 mt-4 text-lg font-semibold text-white">{user?.name}</h2>
            <p className="mb-0 mt-1 break-all text-sm text-muted">{user?.email}</p>
          </div>
          <div className="my-6 border-t border-line" />
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-cyan"><CalendarDays size={16} /></span>
            <div>
              <div className="text-xs font-medium text-white">Member since</div>
              <div className="mt-1 text-xs text-muted">
                {user?.createdAt
                  ? new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(
                      new Date(user.createdAt),
                    )
                  : '—'}
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-3">
            <span className="mt-0.5 text-mint"><ShieldCheck size={16} /></span>
            <div>
              <div className="text-xs font-medium text-white">Your privacy</div>
              <div className="mt-1 text-xs leading-5 text-muted">
                Your personal details are only available to you after you sign in.
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="p-5 sm:p-7">
          <div className="mb-6">
            <h3 className="m-0 text-sm font-semibold text-white">Personal information</h3>
            <p className="mb-0 mt-1 text-xs text-muted">
              Update your name. Your email is changed separately after verification.
            </p>
          </div>
          <form onSubmit={handleSubmit(saveProfile)} noValidate className="max-w-xl space-y-5">
            <label className="block text-xs font-medium text-[#c7d1d8]" htmlFor="profile-name">
              Full name
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="profile-name"
                    autoComplete="name"
                    prefix={<UserRound size={15} className="text-muted" />}
                    status={errors.name ? 'error' : undefined}
                    className="mt-2"
                  />
                )}
              />
              {errors.name && (
                <span className="mt-1 block text-xs text-danger">{errors.name.message}</span>
              )}
            </label>
            {serverError && <Alert type="error" showIcon message={serverError} />}
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
              Save name
            </Button>
          </form>

          <div className="mt-8 border-t border-line pt-6">
            <div className="mb-4">
              <h3 className="m-0 text-sm font-semibold text-white">Change email address</h3>
              <p className="mb-0 mt-1 text-xs leading-5 text-muted">
                We’ll send a six-digit code to the new address. Your email changes only after you verify it.
              </p>
              <p className="mb-0 mt-2 text-xs text-muted">
                Current email: <span className="text-white">{user?.email}</span>
              </p>
            </div>
            <form onSubmit={requestEmailCode} className="max-w-xl space-y-4">
              <label className="block text-xs font-medium text-[#c7d1d8]" htmlFor="new-email">
                New email address
                <Input
                  id="new-email"
                  type="email"
                  autoComplete="email"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  disabled={codeSent}
                  placeholder="you@example.com"
                  prefix={<Mail size={15} className="text-muted" />}
                  className="mt-2"
                />
              </label>
              {codeSent && (
                <>
                  <p className="m-0 text-xs text-muted">
                    Enter the code sent to <span className="text-white">{newEmail}</span>.
                  </p>
                  <label className="block text-xs font-medium text-[#c7d1d8]" htmlFor="email-verification-code">
                    Verification code
                    <Input
                      id="email-verification-code"
                      value={verificationCode}
                      onChange={(event) =>
                        setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))
                      }
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="6-digit code"
                      className="mt-2"
                    />
                  </label>
                </>
              )}
              {emailError && <Alert type="error" showIcon message={emailError} />}
              <div className="flex flex-wrap gap-2">
                {!codeSent ? (
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={requestingCode}
                    disabled={resendIn > 0}
                  >
                    {resendIn > 0 ? `Try again in ${resendIn}s` : 'Send verification code'}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="primary"
                      htmlType="button"
                      loading={verifyingCode}
                      onClick={() => void verifyEmailCode()}
                    >
                      Verify and update email
                    </Button>
                    <Button
                      htmlType="submit"
                      disabled={resendIn > 0}
                      loading={requestingCode}
                    >
                      {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                    </Button>
                    <Button type="text" htmlType="button" onClick={useDifferentEmail}>
                      Use a different address
                    </Button>
                  </>
                )}
              </div>
            </form>
          </div>

          <div className="mt-8 rounded-xl border border-line bg-raised/60 p-4">
            <div className="flex gap-3">
              <LockKeyhole size={16} className="mt-0.5 shrink-0 text-warning" />
              <div>
                <div className="text-xs font-semibold text-white">Password changes</div>
                <p className="mb-0 mt-1 text-xs leading-5 text-muted">
                  Password changes are not available yet. You can sign out from the top bar.
                </p>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
