"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input } from "antd";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { gql, queries } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";
import { AuthFrame } from "@/components/auth/auth-frame";
import type { AuthPayload } from "@/types/api";

const schema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { acceptSession } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { email: "", password: "" },
  });

  async function submit(values: FormValues) {
    setServerError("");
    try {
      const { login } = await gql<{ login: AuthPayload }>(queries.login, {
        input: values,
      });
      acceptSession(login);
      router.replace("/dashboard");
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "We could not sign you in. Please try again.",
      );
    }
  }

  return (
    <AuthFrame mode="login">
      <h2 className="auth-title">Welcome back</h2>
      <p className="auth-subtitle">Sign in to pick up where you left off.</p>
      <form
        className="auth-fields auth-fields-login"
        onSubmit={handleSubmit(submit)}
        noValidate
      >
        <label className="auth-label" htmlFor="login-email">
          Email address
        </label>
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <Input
              id="login-email"
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              prefix={<Mail size={17} />}
              status={errors.email ? "error" : undefined}
              aria-invalid={!!errors.email}
            />
          )}
        />
        {errors.email && (
          <p className="auth-field-error">{errors.email.message}</p>
        )}

        <label className="auth-label" htmlFor="login-password">
          Password
        </label>
        <p className="auth-forgot-link">
          <Link href="/forgot-password">Forgot password?</Link>
        </p>
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <Input
              id="login-password"
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Your password"
              prefix={<LockKeyhole size={17} />}
              suffix={
                <button
                  type="button"
                  className="auth-eye"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              }
              status={errors.password ? "error" : undefined}
              aria-invalid={!!errors.password}
            />
          )}
        />
        {errors.password && (
          <p className="auth-field-error">{errors.password.message}</p>
        )}

        {serverError && (
          <div role="alert" className="auth-server-error">
            {serverError}
          </div>
        )}
        <Button
          type="primary"
          htmlType="submit"
          block
          loading={isSubmitting}
          disabled={isSubmitting}
          className="auth-submit"
        >
          Sign in <span aria-hidden="true">→</span>
        </Button>
      </form>
      <p className="auth-switch">
        New to Northstar? <Link href="/signup">Create an account</Link>
      </p>
    </AuthFrame>
  );
}
