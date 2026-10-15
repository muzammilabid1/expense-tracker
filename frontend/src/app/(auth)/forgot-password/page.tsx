"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { Button, Input } from "antd";
import { Mail, LockKeyhole } from "lucide-react";
import { gql, queries } from "@/lib/api/client";
import { AuthFrame } from "@/components/auth/auth-frame";

type Step = "request" | "verify" | "done";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  async function requestCode(isResend = false) {
    setError("");
    setMessage("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 255) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      await gql<{ requestPasswordReset: boolean }>(queries.requestPasswordReset, {
        email: email.trim(),
      });
      setStep("verify");
      setResendIn(60);
      if (isResend) {
        setCode("");
        setPassword("");
        setConfirmPassword("");
      }
      setMessage(
        isResend
          ? "If an account exists for this email, a new code will arrive shortly."
          : "If an account exists for this email, a password reset code will arrive shortly. Check your inbox and spam folder.",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "We couldn’t process that request. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the six-digit code from your email.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters for your new password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      await gql<{ resetPassword: boolean }>(queries.resetPassword, {
        input: { email: email.trim(), code, newPassword: password },
      });
      setStep("done");
      setMessage("Your password has been reset. You can now sign in with your new password.");
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "We couldn’t reset your password. Check the code and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame mode="login">
      {step === "request" && (
        <>
          <h2 className="auth-title">Forgot your password?</h2>
          <p className="auth-subtitle">
            Enter the email address for your account. If we find an account, we’ll send a code to reset its password.
          </p>
          <form
            className="auth-fields auth-fields-login"
            onSubmit={(event) => {
              event.preventDefault();
              void requestCode();
            }}
            noValidate
          >
            <label className="auth-label" htmlFor="reset-email">Email address</label>
            <Input
              id="reset-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              prefix={<Mail size={17} />}
              required
            />
            {error && <div role="alert" className="auth-server-error">{error}</div>}
            <Button type="primary" htmlType="submit" block loading={busy} disabled={busy} className="auth-submit">
              Send reset code
            </Button>
          </form>
          <p className="auth-switch"><Link href="/login">Back to sign in</Link></p>
        </>
      )}

      {step === "verify" && (
        <>
          <h2 className="auth-title">Choose a new password</h2>
          <p className="auth-subtitle">
            Enter the code sent to <strong>{email}</strong> and choose a new password.
          </p>
          {message && <p className="auth-subtitle" role="status">{message}</p>}
          <form className="auth-fields auth-fields-login" onSubmit={resetPassword} noValidate>
            <label className="auth-label" htmlFor="reset-code">Six-digit code</label>
            <Input
              id="reset-code"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
            />
            <label className="auth-label" htmlFor="reset-new-password">New password</label>
            <Input.Password
              id="reset-new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              prefix={<LockKeyhole size={17} />}
            />
            <label className="auth-label" htmlFor="reset-confirm-password">Confirm new password</label>
            <Input.Password
              id="reset-confirm-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="Enter it again"
              prefix={<LockKeyhole size={17} />}
            />
            {error && <div role="alert" className="auth-server-error">{error}</div>}
            <Button type="primary" htmlType="submit" block loading={busy} disabled={busy} className="auth-submit">
              Reset password
            </Button>
          </form>
          <p className="auth-switch">
            {resendIn > 0 ? `Request a new code in ${resendIn}s` : (
              <button type="button" className="auth-inline-link" onClick={() => void requestCode(true)} disabled={busy}>
                Send a new code
              </button>
            )}
          </p>
          <p className="auth-switch"><button type="button" className="auth-inline-link" onClick={() => { setStep("request"); setMessage(""); setError(""); }}>Use a different email</button></p>
        </>
      )}

      {step === "done" && (
        <>
          <h2 className="auth-title">Password updated</h2>
          <p className="auth-subtitle" role="status">{message}</p>
          <p className="auth-switch"><Link href="/login">Go to sign in</Link></p>
        </>
      )}
    </AuthFrame>
  );
}
