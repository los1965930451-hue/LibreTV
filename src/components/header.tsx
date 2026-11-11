'use client';

import Link from 'next/link';
import { PixelIcon } from './pixel-dock';
import { KineticDock } from './kinetic-dock';

/** 顶部页眉已取消；主页入口固定在右上角，功能入口收进右侧动能导航（加号） */
export function Header() {
  return (
    <>
      {/* 右上角主页按钮 */}
      <Link
        href="/"
        title="主页"
        aria-label="主页"
        className="fixed top-3 right-3 z-40 grid place-items-center rounded-xl border border-line bg-surface/80 backdrop-blur-xl p-2 text-muted shadow-lg transition-colors hover:text-content"
      >
        <PixelIcon name="home" className="px-icon" />
      </Link>

      <KineticDock />
    </>
  );
}
