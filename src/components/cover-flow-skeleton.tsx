'use client';

import type { CSSProperties } from 'react';

/**
 * Cover Flow 加载占位：形状与真实 Cover Flow 一致
 * （中间大海报 + 两侧 3D 倾斜海报 + 下方标题/副标题/按钮占位），
 * 全部使用 skeleton-glass 玻璃流光，结果出来时无布局跳变。
 */
export function CoverFlowSkeleton() {
  const sideCls = (sign: 1 | -1, depth: 1 | 2): CSSProperties => ({
    position: 'absolute',
    transform: `translateX(-50%) translateX(${sign * (124 + (depth - 1) * 84)}px) scale(0.78) rotateY(${sign * -55}deg)`,
    opacity: depth === 1 ? 0.75 : 0.6,
  });
  const poster =
    'absolute left-1/2 top-4 sm:top-6 rounded-xl skeleton-glass ring-1 ring-black/10 dark:ring-white/15';
  return (
    <div className="w-full select-none">
      <div
        className="relative mx-auto h-[340px] sm:h-[400px] w-full max-w-5xl"
        style={{ perspective: '1400px' }}
      >
        {([-1, 1] as const).map((s) =>
          ([1, 2] as const).map((d) => (
            <div
              key={`${s}-${d}`}
              className={poster}
              style={{
                width: 'clamp(150px, 34vw, 210px)',
                aspectRatio: '2 / 3',
                ...sideCls(s, d),
              }}
            />
          ))
        )}
        <div
          className={poster + ' shadow-2xl shadow-black/25'}
          style={{
            position: 'absolute',
            width: 'clamp(150px, 34vw, 210px)',
            aspectRatio: '2 / 3',
            transform: 'translateX(-50%)',
          }}
        />
      </div>
      <div className="flex flex-col items-center gap-2.5 -mt-2 sm:mt-1 px-6">
        <div className="h-5 w-40 rounded skeleton-glass" />
        <div className="h-3 w-56 rounded skeleton-glass" />
        <div className="mt-2 h-9 w-24 rounded-full skeleton-glass" />
      </div>
    </div>
  );
}
