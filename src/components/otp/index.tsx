'use client';

import { useEffect, useRef } from 'react';
import { mountOtpVerification } from './OtpVerificationEngine.js';
import type { MotionController, MotionOptions } from './motion-runtime';

export type OtpOptions = MotionOptions & {
  /** 返回 true 表示验证通过，false 表示失败；支持异步 */
  onVerify?: (code: string) => boolean | Promise<boolean>;
  /** 验证成功（绿色反馈）触发，可在此延迟关闭弹窗 */
  onSuccess?: (code: string) => void;
};

export function OtpVerification({ options, className }: { options?: OtpOptions; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<MotionController | null>(null);

  useEffect(() => {
    const instance = mountOtpVerification(host.current!, options);
    controller.current = instance;
    return () => {
      instance.destroy();
      controller.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 回调更新时同步给引擎，无需重新挂载
  useEffect(() => {
    controller.current?.update((options ?? {}) as MotionOptions);
  }, [options]);

  return <div ref={host} className={className} data-motion-component="otp-verification" />;
}
