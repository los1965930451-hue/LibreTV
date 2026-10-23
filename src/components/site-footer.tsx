'use client';

import { useAuth } from '@/components/auth';

/** 全站统一页脚：纯文本署名，不含任何跳转链接 */
export function SiteFooter() {
  const { version } = useAuth();
  return (
    <footer className="border-t border-line py-4">
      <p className="text-center text-xs text-faint">
        tkyTV{version ? ` v${version}` : ''}
        {' · '}
        基于 LibreTV（AGPL-3.0）
      </p>
    </footer>
  );
}
