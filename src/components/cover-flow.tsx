'use client';

import type * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { SmartImage } from './smart-image';
import type { AggregatedGroup } from './video-card';

/**
 * 苹果 Cover Flow（iPod 风格）海报墙：
 * - 中间海报正面放大，两侧海报 3D 翻转倾斜
 * - 支持点击两侧、左右箭头、键盘方向键、滚轮、触摸/鼠标拖动
 * - 中间海报带倒影；点击中间海报打开详情
 */
interface CoverFlowProps {
  groups: AggregatedGroup[];
  onOpen: (group: AggregatedGroup) => void;
}

const MAX_DEPTH = 4; // 每侧最多展示的海报数

export function CoverFlow({ groups, onOpen }: CoverFlowProps) {
  const [active, setActive] = useState(0);
  const imageProxyMode = useAppStore((s) => s.imageProxyMode);
  const customImageProxy = useAppStore((s) => s.customImageProxy);
  const wheelLock = useRef(0);
  const drag = useRef<{ x: number; active: number } | null>(null);

  // 新一次搜索 / 列表变化时回到第一张
  const firstKey = groups[0]?.key;
  const length = groups.length;
  useEffect(() => {
    setActive(0);
  }, [firstKey]);

  const clamp = useCallback((i: number) => Math.max(0, Math.min(length - 1, i)), [length]);
  const go = useCallback((i: number) => setActive((v) => clamp(i)), [clamp]);

  // 键盘左右切换
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); setActive((v) => clamp(v - 1)); }
      if (e.key === 'ArrowRight') { e.preventDefault(); setActive((v) => clamp(v + 1)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clamp]);

  const onWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now < wheelLock.current) return;
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(d) < 8) return;
    wheelLock.current = now + 280;
    setActive((v) => clamp(v + (d > 0 ? 1 : -1)));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    // 按钮（箭头、海报）上的按下不启动拖拽，避免吞掉 click
    if ((e.target as HTMLElement).closest('button')) return;
    drag.current = { x: e.clientX, active };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    if (Math.abs(dx) > 50) setActive(clamp(drag.current.active + (dx < 0 ? 1 : -1)));
    drag.current = null;
  };

  const center = groups[clamp(active)];

  const cards = useMemo(() => {
    return groups.map((g, i) => {
      const offset = i - active;
      const abs = Math.abs(offset);
      if (abs > MAX_DEPTH) return { g, i, offset, hidden: true as const };
      let transform: string;
      let opacity = 1;
      if (abs === 0) {
        transform = 'translateX(-50%) translateX(0px) scale(1) rotateY(0deg)';
      } else {
        const sign = offset > 0 ? 1 : -1;
        const baseW = 200; // px，与中间海报宽度（sm）一致
        const x = sign * (baseW * 0.62 + (abs - 1) * baseW * 0.42);
        transform = `translateX(-50%) translateX(${x}px) scale(0.78) rotateY(${sign * -55}deg)`;
        opacity = abs >= MAX_DEPTH ? 0.25 : 0.75 - (abs - 1) * 0.15;
      }
      return { g, i, offset, hidden: false as const, transform, opacity, z: 100 - abs };
    });
  }, [groups, active]);

  return (
    <div className="w-full select-none">
      <div
        className="relative mx-auto h-[340px] sm:h-[400px] w-full max-w-5xl"
        style={{ perspective: '1400px', touchAction: 'pan-y', cursor: drag.current ? 'grabbing' : 'grab' }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {/* 左切换 */}
        <button
          type="button"
          aria-label="上一部"
          disabled={active === 0}
          onClick={() => go(active - 1)}
          className="absolute left-1 sm:left-3 top-1/2 -translate-y-1/2 z-[200] w-9 h-9 rounded-full bg-black/45 dark:bg-white/15 text-white backdrop-blur-md flex items-center justify-center disabled:opacity-25 hover:bg-black/65 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button
          type="button"
          aria-label="下一部"
          disabled={active >= length - 1}
          onClick={() => go(active + 1)}
          className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 z-[200] w-9 h-9 rounded-full bg-black/45 dark:bg-white/15 text-white backdrop-blur-md flex items-center justify-center disabled:opacity-25 hover:bg-black/65 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>

        {cards.map((c) => {
          if (c.hidden) return null;
          const g = c.g;
          const isCenter = c.i === active;
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => (isCenter ? onOpen(g) : go(c.i))}
              aria-label={g.name}
              className="absolute left-1/2 top-4 sm:top-6 outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded-xl"
              style={{
                width: 'clamp(150px, 34vw, 210px)',
                aspectRatio: '2 / 3',
                transform: c.transform,
                transformStyle: 'preserve-3d',
                transition: 'transform 0.55s cubic-bezier(0.22,0.75,0.22,1), opacity 0.4s ease',
                zIndex: c.z,
                opacity: c.opacity,
                cursor: 'pointer',
                ...(isCenter
                  ? { WebkitBoxReflect: 'below 6px linear-gradient(transparent 62%, rgba(0,0,0,0.35))' }
                  : {}),
              } as React.CSSProperties}
            >
              <span
                className="block w-full h-full overflow-hidden rounded-xl bg-chip shadow-2xl ring-1 ring-black/10 dark:ring-white/15"
                style={{ boxShadow: isCenter ? '0 24px 60px rgba(0,0,0,0.45)' : '0 10px 30px rgba(0,0,0,0.35)' }}
              >
                {g.pic ? (
                  <SmartImage
                    url={g.pic}
                    mode={imageProxyMode}
                    customProxy={customImageProxy}
                    alt={g.name}
                    className="h-full w-full object-cover pointer-events-none"
                  />
                ) : (
                  <span className="h-full w-full flex items-center justify-center text-faint">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16m10-16v16M4 6h2v12H4zm4 0h2v12H8zm8 0h2v12h-2zm4 0h2v12h-2z" /></svg>
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* 中间海报信息 */}
      {center && (
        <div className="text-center -mt-2 sm:mt-1 px-6">
          <h2 className="text-base sm:text-lg font-semibold text-content line-clamp-1">{center.name}</h2>
          <p className="text-xs text-muted mt-1 line-clamp-1">
            {[center.year, center.typeName, center.items.length > 1 ? `${center.items.length} 个来源` : center.items[0]?.sourceName]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <button
            type="button"
            onClick={() => onOpen(center)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-black text-white dark:bg-white dark:text-black px-5 py-2 text-sm font-medium hover:opacity-90 transition"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            观看
          </button>
          <p className="mt-3 text-[11px] text-faint">
            {active + 1} / {length} · 拖动、滚轮或点击两侧海报切换
          </p>
        </div>
      )}
    </div>
  );
}
