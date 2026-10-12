'use client';

import '@ant-design/v5-patch-for-react-19';
import { App as AntdApp, ConfigProvider, theme } from 'antd';
import { AuthProvider } from '@/lib/auth-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider theme={{
      algorithm: theme.darkAlgorithm,
      token: {
        colorPrimary: '#75F0C0', colorInfo: '#63D8E8', colorSuccess: '#75F0C0',
        colorWarning: '#F3C969', colorError: '#FF7C86', colorBgBase: '#0B0F14',
        colorBgContainer: '#151F29', colorBgElevated: '#1C2935', colorBorder: '#293844',
        colorText: '#F3F7FA', colorTextSecondary: '#9BAAB7', borderRadius: 12,
        fontFamily: 'Arial, Helvetica, sans-serif', controlHeight: 44,
      },
    }}>
      <AntdApp>
        <AuthProvider>{children}</AuthProvider>
      </AntdApp>
    </ConfigProvider>
  );
}
