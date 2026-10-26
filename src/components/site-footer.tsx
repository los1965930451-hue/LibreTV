'use client';

import { useAuth } from '@/components/auth';

/** 全站统一页脚：最小化署名（AGPL-3.0 要求保留），无跳转链接 */
export function SiteFooter() {
  const { version } = useAuth();
  return (
    <footer className="py-2 pr-2">
      <p className="text-right text-[10px] leading-tight text-faint opacity-40 select-none">
        tkyTV{version ? ` v${version}` : ''} · Powered by LibreTV · AGPL-3.0
      </p>
    </footer>
  );
}
