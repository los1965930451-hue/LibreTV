'use client';

import { useTheme } from '@/components/theme';
import { GridPulse } from './grid-pulse';

/**
 * 整页动态网格背景：仅白天模式挂载，底色即 tkyTV 浅色页 #f6f7f9；
 * 黑夜模式返回 null，完全不改变深色背景。
 */
export function GridBackground() {
  const { resolved } = useTheme();
  if (resolved !== 'light') return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <GridPulse ambient={6} />
    </div>
  );
}
