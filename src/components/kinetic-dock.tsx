'use client';

import * as React from 'react';
import gsap from 'gsap';
import { useRouter, usePathname } from 'next/navigation';
import { SETTINGS_PANELS, SettingsPanelById, type SettingsPanelId } from './source-manager';
import { HistoryContent } from './history-panel';
import { requestShowDownloadManager } from './download-manager';
import { useTheme } from './theme';
import { cn } from '@/lib/utils';

/** tkyTV 配色（露露紫），替代参考组件的 indigo/pink */
const PURPLE = '138,90,224';
const BLUE = '111,134,255';
const PINK = '232,120,190';

type ItemDef = {
  key: string;
  label: string;
  shape: number;
  active?: boolean;
  run: () => void;
};

/**
 * 右侧动能导航：右侧竖直居中的「+」按钮，点击展开全屏动能菜单（背景面板滑入、
 * 链接逐行上浮、悬停切换抽象图形）。功能沿用原 dock：直播/关于/主题/历史/下载/设置。
 */
export function KineticDock() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = React.useState(false);
  const [level, setLevel] = React.useState<'root' | 'settings' | 'history'>('root');
  const [settingsPanel, setSettingsPanel] = React.useState<SettingsPanelId | null>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const close = React.useCallback(() => setOpen(false), []);

  const items: ItemDef[] = [
    { key: 'live', label: '直播', shape: 1, active: pathname === '/live', run: () => router.push('/live') },
    { key: 'about', label: '关于', shape: 2, active: pathname === '/about', run: () => router.push('/about') },
    {
      key: 'theme',
      label: theme === 'dark' ? '切换到浅色' : '切换到深色',
      shape: 3,
      run: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    },
    { key: 'history', label: '观看历史', shape: 4, run: () => setLevel('history') },
    { key: 'download', label: '下载管理', shape: 5, run: () => requestShowDownloadManager() },
    { key: 'settings', label: '设置', shape: 1, run: () => setLevel('settings') },
  ];

  // 初始隐藏状态（菜单在右侧屏外，遮罩/链接归零），避免首屏闪烁
  React.useLayoutEffect(() => {
    const root = wrapRef.current;
    if (!root) return;
    const menu = root.querySelector('.menu-content');
    const overlay = root.querySelector('.overlay');
    const links = root.querySelectorAll('.nav-link');
    const subpage = root.querySelector('.settings-subpage');
    const historySub = root.querySelector('.history-subpage');
    const panelLayer = root.querySelector('.settings-panel-layer');
    gsap.set(menu, { xPercent: 100 });
    gsap.set(overlay, { autoAlpha: 0 });
    gsap.set(links, { yPercent: 140 });
    gsap.set(subpage, { xPercent: 100 });
    gsap.set(historySub, { xPercent: 100 });
    gsap.set(panelLayer, { xPercent: 100 });
  }, []);

  // 打开/关闭主动画（持久 timeline，避免 context revert 在切换瞬间把动画还原）
  const tlRef = React.useRef<gsap.core.Timeline | null>(null);
  React.useEffect(() => {
    (globalThis as any).__dbgEffect = { open, hasRoot: !!wrapRef.current };
    const root = wrapRef.current;
    if (!root) return;
    const menu = root.querySelector('.menu-content');
    const overlay = root.querySelector('.overlay');
    const links = root.querySelectorAll('.nav-link');
    const icon = triggerRef.current?.querySelector('.menu-button-icon');
    const hoverBgs = root.querySelectorAll('.nav-link-hover-bg');
    const sheens = root.querySelectorAll('.nav-link-sheen');
    const hoverTexts = root.querySelectorAll('.nav-link-text');
    if (!menu || !overlay || !icon) return;
    tlRef.current?.kill();
    const tl = gsap.timeline();
    tlRef.current = tl;
    (globalThis as any).__dbg = { open, tl, menu };
    // 每次开合都重置悬停背景/高光/文字，避免残留色块
    tl.set(hoverBgs, { xPercent: -100 }, 0)
      .set(sheens, { xPercent: -160 }, 0)
      .set(hoverTexts, { x: 0 }, 0);
    if (open) {
        tl.set(root, { display: 'block' })
          .to(icon, { rotate: 315, duration: 0.5, ease: 'power2.out' }, 0)
          .to(overlay, { autoAlpha: 1, duration: 0.5 }, 0)
          .fromTo(menu, { xPercent: 100 }, { xPercent: 0, duration: 0.55, ease: 'power3.out' }, 0.1)
          .to(links, { yPercent: 0, duration: 0.65, stagger: 0.06, ease: 'power3.out' }, 0.35);
      } else {
        // 先保持覆盖层可见（覆盖 Tailwind 的 hidden 类），滑出结束后再隐藏
        tl.set(root, { display: 'block' }, 0)
          .to(overlay, { autoAlpha: 0, duration: 0.35 }, 0)
          .to(icon, { rotate: 0, duration: 0.4, ease: 'power2.in' }, 0)
          .to(links, { yPercent: 140, duration: 0.3, stagger: 0.03, ease: 'power2.in' }, 0)
          .fromTo(menu, { xPercent: 0 }, { xPercent: 100, duration: 0.45, ease: 'power3.in' }, 0)
          .set(root, { display: 'none' });
      }
  }, [open]);

  // 悬停切换抽象图形
  React.useEffect(() => {
    const root = wrapRef.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      const host = root.querySelector('.ambient-background-shapes');
      root.querySelectorAll('.menu-list-item').forEach((li) => {
        const bg = li.querySelector('.nav-link-hover-bg');
        const sheen = li.querySelector('.nav-link-sheen');
        const text = li.querySelector('.nav-link-text');
        // 初始：背景停在左侧屏外，高光归位
        gsap.set(bg, { xPercent: -100 });
        gsap.set(sheen, { xPercent: -160 });

        const idx = li.getAttribute('data-shape');
        const shape = host?.querySelector(`.bg-shape-${idx}`);
        const els = shape ? shape.querySelectorAll('.shape-element') : [];

        const enter = () => {
          // 背景从左滑入 + 高光扫过 + 文字右移
          gsap.to(bg, { xPercent: 0, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
          gsap.fromTo(sheen, { xPercent: -160 }, { xPercent: 320, duration: 0.7, ease: 'power2.out', overwrite: 'auto' });
          gsap.to(text, { x: 6, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
          if (shape) {
            host?.querySelectorAll('.bg-shape').forEach((s) => s.classList.remove('active'));
            shape.classList.add('active');
            gsap.fromTo(
              els,
              { scale: 0.5, opacity: 0, rotation: -10 },
              { scale: 1, opacity: 1, rotation: 0, duration: 0.55, stagger: 0.07, ease: 'back.out(1.7)', overwrite: 'auto' }
            );
          }
        };
        const leave = () => {
          gsap.to(bg, { xPercent: -100, duration: 0.3, ease: 'power3.in', overwrite: 'auto' });
          gsap.set(sheen, { xPercent: -160, overwrite: 'auto' });
          gsap.to(text, { x: 0, duration: 0.25, ease: 'power2.in', overwrite: 'auto' });
          if (shape) {
            gsap.to(els, { scale: 0.8, opacity: 0, duration: 0.28, ease: 'power2.in', onComplete: () => shape.classList.remove('active'), overwrite: 'auto' });
          }
        };
        li.addEventListener('mouseenter', enter);
        li.addEventListener('mouseleave', leave);
      });
    });
    return () => ctx.revert();
  }, []);

  // Esc 关闭
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && open && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const pick = (it: ItemDef) => {
    it.run();
    // 主题切换、设置/历史二级页、下载覆盖层保持菜单展开，其余动作收起菜单
    if (it.key !== 'theme' && it.key !== 'settings' && it.key !== 'history' && it.key !== 'download') close();
  };

  // 菜单关闭时回到一级并收起面板
  React.useEffect(() => {
    if (!open) {
      setLevel('root');
      setSettingsPanel(null);
    }
  }, [open]);

  // 设置面板层滑入/滑出
  React.useEffect(() => {
    const root = wrapRef.current;
    if (!root) return;
    const layer = root.querySelector('.settings-panel-layer');
    const ctx = gsap.context(() => {
      if (settingsPanel) gsap.to(layer, { xPercent: 0, duration: 0.5, ease: 'power3.out' });
      else gsap.to(layer, { xPercent: 100, duration: 0.4, ease: 'power3.in' });
    });
    return () => ctx.revert();
  }, [settingsPanel]);

  // 设置二级页滑入/滑出
  React.useEffect(() => {
    const root = wrapRef.current;
    if (!root) return;
    const sub = root.querySelector('.settings-subpage');
    const historySub = root.querySelector('.history-subpage');
    const ctx = gsap.context(() => {
      gsap.to(sub, { xPercent: level === 'settings' ? 0 : 100, duration: level === 'settings' ? 0.5 : 0.4, ease: level === 'settings' ? 'power3.out' : 'power3.in' });
      gsap.to(historySub, { xPercent: level === 'history' ? 0 : 100, duration: level === 'history' ? 0.5 : 0.4, ease: level === 'history' ? 'power3.out' : 'power3.in' });
    });
    return () => ctx.revert();
  }, [level]);

  return (
    <>
      {/* 右侧竖直居中的加号触发按钮 */}
      <button
        ref={triggerRef}
        type="button"
        aria-label={open ? '关闭菜单' : '打开菜单'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="fixed right-3 sm:right-4 top-1/2 -translate-y-1/2 z-50 grid place-items-center h-12 w-12 rounded-full border border-line bg-surface/80 backdrop-blur-xl shadow-lg text-accent hover:shadow-xl transition-shadow"
      >
        <svg viewBox="0 0 16 16" fill="none" className="menu-button-icon w-5 h-5">
          <path d="M7.333 16V0h1.334v16H7.333Z" fill="currentColor" />
          <path d="M16 8.667H0V7.333h16v1.334Z" fill="currentColor" />
        </svg>
      </button>

      {/* 全屏动能菜单 */}
      <div className="fullscreen-menu-container">
        <div ref={wrapRef} data-nav="closed" className="nav-overlay-wrapper fixed inset-0 z-40 hidden">
          <div className="overlay absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />
          <nav className="menu-content absolute right-0 top-0 h-full w-full sm:max-w-md bg-page">
            <div className="menu-bg relative h-full">
              <div className="backdrop-layer first absolute inset-0 bg-page" />
              <div className="backdrop-layer second absolute inset-0 bg-surface/95" />
              <div className="backdrop-layer absolute inset-0 bg-chip/80" />

              {/* 抽象图形（露露紫系） */}
              <div className="ambient-background-shapes absolute inset-0 overflow-hidden">
                <svg className="bg-shape bg-shape-1 absolute inset-0 w-full h-full opacity-0" viewBox="0 0 400 400" fill="none">
                  <circle className="shape-element" cx="80" cy="120" r="40" fill={`rgba(${PURPLE},0.18)`} />
                  <circle className="shape-element" cx="300" cy="80" r="60" fill={`rgba(${BLUE},0.15)`} />
                  <circle className="shape-element" cx="200" cy="300" r="80" fill={`rgba(${PINK},0.12)`} />
                </svg>
                <svg className="bg-shape bg-shape-2 absolute inset-0 w-full h-full opacity-0" viewBox="0 0 400 400" fill="none">
                  <path className="shape-element" d="M0 200 Q100 100 200 200 T400 200" stroke={`rgba(${PURPLE},0.25)`} strokeWidth="50" fill="none" />
                  <path className="shape-element" d="M0 280 Q100 180 200 280 T400 280" stroke={`rgba(${BLUE},0.18)`} strokeWidth="36" fill="none" />
                </svg>
                <svg className="bg-shape bg-shape-3 absolute inset-0 w-full h-full opacity-0" viewBox="0 0 400 400" fill="none">
                  {[50, 150, 250, 350].map((cx) => (
                    <circle key={cx} className="shape-element" cx={cx} cy="120" r="9" fill={`rgba(${PURPLE},0.35)`} />
                  ))}
                  {[100, 200, 300].map((cx) => (
                    <circle key={cx} className="shape-element" cx={cx} cy="250" r="13" fill={`rgba(${BLUE},0.28)`} />
                  ))}
                </svg>
                <svg className="bg-shape bg-shape-4 absolute inset-0 w-full h-full opacity-0" viewBox="0 0 400 400" fill="none">
                  <path className="shape-element" d="M100 100 Q150 50 200 100 Q250 150 200 200 Q150 250 100 200 Q50 150 100 100" fill={`rgba(${PURPLE},0.16)`} />
                  <path className="shape-element" d="M250 220 Q310 160 350 220 Q380 280 320 320 Q260 340 250 280 Q245 250 250 220" fill={`rgba(${PINK},0.14)`} />
                </svg>
                <svg className="bg-shape bg-shape-5 absolute inset-0 w-full h-full opacity-0" viewBox="0 0 400 400" fill="none">
                  <line className="shape-element" x1="0" y1="100" x2="300" y2="400" stroke={`rgba(${PURPLE},0.18)`} strokeWidth="28" />
                  <line className="shape-element" x1="100" y1="0" x2="400" y2="300" stroke={`rgba(${BLUE},0.15)`} strokeWidth="22" />
                </svg>
              </div>

              <div className="menu-content-wrapper relative h-full flex items-center px-8 sm:px-12 select-none">
                <ul className="menu-list w-full space-y-2">
                  {items.map((it) => (
                    <li key={it.key} data-shape={it.shape} className="menu-list-item">
                      <button
                        type="button"
                        onClick={() => pick(it)}
                        className={cn(
                          'nav-link relative block w-full text-left overflow-hidden rounded-xl px-3 py-3 group',
                          it.active && 'text-accent'
                        )}
                      >
                        <span
                          className="nav-link-hover-bg absolute inset-0 rounded-xl"
                          style={{ background: 'linear-gradient(90deg, rgba(138,90,224,0.20), rgba(138,90,224,0.05))' }}
                          aria-hidden
                        />
                        <span
                          className="nav-link-sheen absolute inset-y-0 w-1/3"
                          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }}
                          aria-hidden
                        />
                        <span className="nav-link-text relative text-lg font-semibold text-content transition-colors group-hover:text-accent">{it.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 设置二级页：动能大条目列表 + 面板层滑入 */}
            <div className="settings-subpage absolute inset-0 bg-page flex flex-col">
              {/* 列表层 */}
              <div className="settings-list-layer flex-1 flex flex-col min-h-0 select-none">
                <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-line">
                  <button
                    type="button"
                    onClick={() => setLevel('root')}
                    aria-label="返回主菜单"
                    className="grid place-items-center h-8 w-8 rounded-full border border-line bg-surface text-muted hover:text-accent transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <span className="text-base font-semibold text-content">设置</span>
                </div>
                <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4">
                  <ul className="menu-list w-full space-y-2">
                    {SETTINGS_PANELS.map((p) => (
                      <li key={p.id} className="menu-list-item">
                        <button
                          type="button"
                          onClick={() => setSettingsPanel(p.id)}
                          className="nav-link relative block w-full text-left overflow-hidden rounded-xl px-3 py-3 group"
                        >
                          <span
                            className="nav-link-hover-bg absolute inset-0 rounded-xl"
                            style={{ background: 'linear-gradient(90deg, rgba(138,90,224,0.20), rgba(138,90,224,0.05))' }}
                            aria-hidden
                          />
                          <span
                            className="nav-link-sheen absolute inset-y-0 w-1/3"
                            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }}
                            aria-hidden
                          />
                          <span className="nav-link-text relative text-lg font-semibold text-content transition-colors group-hover:text-accent">{p.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 面板层：点条目后滑入，返回回到列表 */}
              <div className="settings-panel-layer absolute inset-0 bg-page flex flex-col">
                <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-line">
                  <button
                    type="button"
                    onClick={() => setSettingsPanel(null)}
                    aria-label="返回设置列表"
                    className="grid place-items-center h-8 w-8 rounded-full border border-line bg-surface text-muted hover:text-accent transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <span className="text-base font-semibold text-content">
                    {SETTINGS_PANELS.find((p) => p.id === settingsPanel)?.label ?? ''}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  {settingsPanel && <SettingsPanelById id={settingsPanel} />}
                </div>
              </div>
            </div>

            {/* 观看历史二级页：动能滑入，返回回到主菜单 */}
            <div className="history-subpage absolute inset-0 bg-page flex flex-col">
              <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-line select-none">
                <button
                  type="button"
                  onClick={() => setLevel('root')}
                  aria-label="返回主菜单"
                  className="grid place-items-center h-8 w-8 rounded-full border border-line bg-surface text-muted hover:text-accent transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="text-base font-semibold text-content">观看历史</span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
                <HistoryContent />
              </div>
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}
