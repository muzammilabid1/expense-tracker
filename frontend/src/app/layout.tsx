import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import './globals.css';
import 'antd/dist/reset.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Northstar — Personal finance',
  description: 'A clear view of your personal finances.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AntdRegistry><Providers>{children}</Providers></AntdRegistry></body></html>;
}
