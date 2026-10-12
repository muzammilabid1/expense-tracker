"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input } from "antd";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { gql, queries } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";
import { AuthFrame } from "@/components/auth/auth-frame";
import type { AuthPayload } from "@/types/api";

const schema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Please enter your name.")
      .max(100, "Name must be 100 characters or fewer."),
    email: z.email("Enter a valid email address."),
    password: z.string().min(8, "Use at least 8 characters."),
    confirm: z.string().min(1, "Please confirm your password."),
  })
  .refine((value) => value.password === value.confirm, {
    path: ["confirm"],
    message: "These passwords do not match.",
  });

type FormValues = z.infer<typeof schema>;

export default function SignupPage() {
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
    defaultValues: { name: "", email: "", password: "", confirm: "" },
  });

  async function submit({ name, email, password }: FormValues) {
    setServerError("");
    try {
      const { signup } = await gql<{ signup: AuthPayload }>(queries.signup, {
        input: { name: name.trim(), email: email.trim(), password },
      });
      acceptSession(signup);
      router.replace("/dashboard");
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "We could not create your account. Please try again.",
      );
    }
  }

  return (
    <AuthFrame mode="signup">
      <h2 className="auth-title">Create your account</h2>
      <p className="auth-subtitle">
        A few details and you’re ready to get started.
      </p>
      <form className="auth-fields" onSubmit={handleSubmit(submit)} noValidate>
        <label className="auth-label" htmlFor="signup-name">
          Full name
        </label>
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <Input
              id="signup-name"
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              autoComplete="name"
              placeholder="e.g. Alex Morgan"
              prefix={<UserRound size={17} />}
              status={errors.name ? "error" : undefined}
              aria-invalid={!!errors.name}
            />
          )}
        />
        {errors.name && (
          <p className="auth-field-error">{errors.name.message}</p>
        )}

        <label className="auth-label" htmlFor="signup-email">
          Email address
        </label>
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <Input
              id="signup-email"
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

        <label className="auth-label" htmlFor="signup-password">
          Password
        </label>
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <Input
              id="signup-password"
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
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

        <label className="auth-label" htmlFor="signup-confirm">
          Confirm password
        </label>
        <Controller
          name="confirm"
          control={control}
          render={({ field }) => (
            <Input
              id="signup-confirm"
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Enter your password again"
              prefix={<LockKeyhole size={17} />}
              status={errors.confirm ? "error" : undefined}
              aria-invalid={!!errors.confirm}
            />
          )}
        />
        {errors.confirm && (
          <p className="auth-field-error">{errors.confirm.message}</p>
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
          Create account <span aria-hidden="true">→</span>
        </Button>
      </form>
      <p className="auth-switch">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </AuthFrame>
  );
}
