'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SourceManagerDrawer } from './source-manager';
import { HistoryPanel } from './history-panel';
import { requestShowDownloadManager } from './download-manager';
import { PixelDockButton, PixelDockLink, PixelThemeToggle } from './pixel-dock';
import { SearchHistoryDropdown, useSearchHistory } from './search-history';
import { cn } from '@/lib/utils';

/** 顶部导航：Logo、搜索框（首页外）；功能入口收进右侧竖直停靠栏 */
export function Header({ showSearch = false }: { showSearch?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [query, setQuery] = useState('');
  // 与首页搜索框共用同一套「最近搜索」下拉逻辑
  const searchHistory = useSearchHistory(query);

  const submitSearch = (text: string) => {
    const q = text.trim().slice(0, 100);
    if (!q) return;
    searchHistory.close();
    router.push(`/?s=${encodeURIComponent(q)}`, { scroll: false });
    // 顶栏搜索一并写入最近搜索（此前只有首页会记录）
    searchHistory.record(q);
  };

  const pickHistory = (text: string) => {
    setQuery(text);
    submitSearch(text);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur border-b border-line">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/" aria-label="tkyTV 首页" className="flex items-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="tkyTV" className="w-7 h-7 rounded-lg" />
          </Link>

          {showSearch && (
            <form
              className="flex-1 max-w-xl hidden sm:block"
              onSubmit={(e) => {
                e.preventDefault();
                submitSearch(query);
              }}
            >
              <div ref={searchHistory.containerRef} className="relative">
                <input
                  className={cn(
                    'input w-full h-9',
                    // 展开时：上圆角与外框沿用聚焦样式，底边改为内部分隔线，与下拉拼成同一面板
                    searchHistory.visible &&
                      'rounded-b-none border-accent border-b-line bg-surface-raised focus-visible:ring-0'
                  )}
                  aria-label="搜索影片"
                  placeholder="搜索影片..."
                  value={query}
                  maxLength={100}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    searchHistory.resetActive();
                  }}
                  onFocus={searchHistory.onFocus}
                  onKeyDown={(e) => searchHistory.onKeyDown(e, pickHistory)}
                  role="combobox"
                  aria-expanded={searchHistory.visible}
                  aria-controls="header-search-history"
                  aria-autocomplete="list"
                  aria-activedescendant={
                    searchHistory.visible && searchHistory.activeIndex >= 0
                      ? `header-search-history-${searchHistory.activeIndex}`
                      : undefined
                  }
                />
                {searchHistory.visible && (
                  <SearchHistoryDropdown
                    id="header-search-history"
                    matches={searchHistory.matches}
                    activeIndex={searchHistory.activeIndex}
                    onPick={pickHistory}
                    onRemove={searchHistory.remove}
                    onClearAll={searchHistory.clearAll}
                  />
                )}
              </div>
            </form>
          )}

          <div className="flex-1" />
        </div>
      </header>

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
