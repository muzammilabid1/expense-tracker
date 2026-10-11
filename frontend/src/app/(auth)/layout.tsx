import { PublicOnly } from '@/lib/auth-context';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <PublicOnly><main className="relative min-h-screen overflow-hidden bg-ink"><div className="auth-orbit pointer-events-none hidden lg:block" /><div className="absolute -left-40 top-[60%] h-80 w-80 rounded-full bg-[#63d8e8]/[.035] blur-3xl" />{children}</main></PublicOnly>;
}
