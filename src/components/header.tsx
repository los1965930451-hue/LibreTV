'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { SourceManagerDrawer } from './source-manager';
import { HistoryPanel } from './history-panel';
import { requestShowDownloadManager } from './download-manager';
import { PixelDockButton, PixelDockLink, PixelThemeToggle, PixelIcon } from './pixel-dock';

/** 顶部页眉已取消；主页入口固定在右上角，其余功能收进右侧竖直停靠栏 */
export function Header() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

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

      {/* 右侧竖直停靠栏（像素风）：直播 / 关于 / 主题 / 历史 / 下载 / 设置 */}
      <nav
        aria-label="快捷功能"
        className="fixed right-2 sm:right-3 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1 rounded-2xl border border-line bg-surface/80 backdrop-blur-xl p-1.5 shadow-lg"
      >
        <PixelDockLink href="/live" label="直播" icon="live" active={pathname === '/live'} />
        <PixelDockLink href="/about" label="关于" icon="about" active={pathname === '/about'} />

        <div className="w-5 h-px bg-line my-1" aria-hidden="true" />

        <PixelThemeToggle />
        <PixelDockButton label="观看历史" icon="clock" onClick={() => setHistoryOpen(true)} />
        <PixelDockButton label="下载管理" icon="download" onClick={requestShowDownloadManager} />
        <PixelDockButton label="设置" icon="gear" onClick={() => setSettingsOpen(true)} />
      </nav>

      <SourceManagerDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HistoryPanel open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  );
}
