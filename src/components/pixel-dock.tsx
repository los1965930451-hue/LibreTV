'use client';

import Link from 'next/link';
import { useLayoutEffect, useRef, useState } from 'react';
import { useTheme, type ThemeChoice } from './theme';
import { cn } from '@/lib/utils';

/**
 * 像素停靠栏：方块像素图标 + 日夜双色（夜蓝昼橙）+ 按压回弹 + 悬停光带。
 * 风格参考 LeiBox pixel-toggle 的设计语言，按 tkyTV 停靠栏重新设计，非照搬。
 */

type Grid = string[];

// 7×7 像素图案（1 = 实心像素）
const PIXELS: Record<string, Grid> = {
  home: [
    '0001000',
    '0011100',
    '0111110',
    '1111111',
    '1101011',
    '1101011',
    '1111111',
  ],
  live: [
    '0001000',
    '0011100',
    '0001000',
    '0101010',
    '0001000',
    '0100010',
    '1000001',
  ],
  about: [
    '0011100',
    '0010100',
    '0011100',
    '0010100',
    '0010100',
    '0010100',
    '0000000',
  ],
  moon: [
    '0011100',
    '0111110',
    '0111100',
    '0111100',
    '0011100',
    '0001110',
    '0000000',
  ],
  sun: [
    '0001000',
    '1001001',
    '0011100',
    '1111111',
    '0011100',
    '1001001',
    '0001000',
  ],
  clock: [
    '0011100',
    '0100010',
    '1001010',
    '1001000',
    '1000000',
    '0100010',
    '0011100',
  ],
  download: [
    '1000001',
    '0100010',
    '0010100',
    '0001000',
    '0001000',
    '0111110',
    '0000000',
  ],
  gear: [
    '0011100',
    '0111110',
    '1101011',
    '1011101',
    '1101011',
    '0111110',
    '0011100',
  ],
  search: [
    '0111000',
    '1100100',
    '1000100',
    '0111000',
    '0001000',
    '0000100',
    '0000010',
  ],
};

export function PixelIcon({ name, className }: { name: keyof typeof PIXELS | string; className?: string }) {
  const grid = PIXELS[name];
  const cells: { x: number; y: number }[] = [];
  grid.forEach((row, y) => {
    row.split('').forEach((v, x) => {
      if (v === '1') cells.push({ x, y });
    });
  });
  return (
    <svg className={cn('px-icon', className)} viewBox="0 0 7 7" aria-hidden="true">
      {cells.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={1} height={1} fill="currentColor" />
      ))}
    </svg>
  );
}

export function PixelDockLink({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active?: boolean;
  icon: string;
}) {
  return (
    <Link href={href} title={label} aria-label={label} className={cn('px-btn', active && 'px-active')}>
      <PixelIcon name={icon} />
    </Link>
  );
}

export function PixelDockButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} className={cn('px-btn', active && 'px-active')}>
      <PixelIcon name={icon} />
    </button>
  );
}

/**
 * 像素分段滑块：一条轨道把所有选项连起来，激活块以滑动方式在选项间移动。
 * 窄屏可横向滚动，滑块按真实按钮位置/宽度定位。
 */
export function PixelSegmented({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [ind, setInd] = useState({ left: 0, width: 0, ready: false });

  const measure = () => {
    const el = btnRefs.current[value];
    if (el) setInd({ left: el.offsetLeft, width: el.offsetWidth, ready: true });
  };

  useLayoutEffect(measure, [value, options]);

  return (
    <div ref={trackRef} className="px-seg" role="group" aria-label={ariaLabel}>
      <span
        className="px-seg-ind"
        style={{ left: ind.left, width: ind.width, opacity: ind.ready ? 1 : 0 }}
        aria-hidden="true"
      />
      {options.map((o) => (
        <button
          key={o.id}
          ref={(el) => {
            btnRefs.current[o.id] = el;
          }}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          className={cn('px-seg-btn', value === o.id && 'px-seg-on')}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** 像素日夜切换：深色显月亮、浅色显太阳，点击在两态间切换 */
export function PixelThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next: ThemeChoice = theme === 'light' ? 'dark' : 'light';
  const label = theme === 'dark' ? '深色' : '浅色';
  return (
    <button
      type="button"
      className="px-btn"
      aria-label={`切换主题，当前 ${label}`}
      onClick={() => setTheme(next)}
    >
      <PixelIcon name={theme === 'dark' ? 'moon' : 'sun'} />
    </button>
  );
}
