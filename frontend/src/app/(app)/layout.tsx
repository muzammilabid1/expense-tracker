'use client';

import { Protected } from '@/lib/auth-context';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return <Protected>{children}</Protected>;
}
