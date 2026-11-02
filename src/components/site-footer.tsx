'use client';

import { useAuth } from '@/components/auth';

/** 全站统一页脚：最小化署名（AGPL-3.0 要求保留），无跳转链接 */
export function SiteFooter() {
  const { version } = useAuth();
  return (
    <footer className="py-1 pr-1.5">
      <p className="text-right text-[9px] leading-tight text-faint opacity-30 select-none">
        tkyTV{version ? ` v${version}` : ''} · Powered by LibreTV · AGPL-3.0
      </p>
    </footer>
  );
}
