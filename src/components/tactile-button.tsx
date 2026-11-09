'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface TactileButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** pill：独立胶囊（带抬起投影）；flush：贴合容器边缘，无外投影、无圆角底座 */
  variant?: 'pill' | 'flush';
}

/**
 * 立体按压按钮（移植自 LeiBox tactile-push-button，设计参考：少荃）。
 * 表面渐变 + 内阴影，悬停下沉，按住内缩；配色改用 tkyTV 露露紫。
 */
export function TactileButton({
  children,
  variant = 'pill',
  className = '',
  type = 'button',
  ...rest
}: TactileButtonProps) {
  return (
    <button
      type={type}
      className={`tactile tactile--${variant} ${className}`.trim()}
      {...rest}
    >
      <span className="tactile-outer">
        <span className="tactile-inner">
          <span className="tactile-label">{children}</span>
        </span>
      </span>
    </button>
  );
}
