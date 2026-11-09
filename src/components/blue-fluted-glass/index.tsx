'use client';

import { useEffect, useRef, useState } from 'react';
import { mountBlueFlutedGlass } from './BlueFlutedGlassEngine.js';
import type { MotionController } from './motion-runtime';
import type { BlueFlutedGlassOptions } from './BlueFlutedGlassEngine';

export function BlueFlutedGlass({ options, className }: { options?: BlueFlutedGlassOptions; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<MotionController | null>(null);
  const [vh, setVh] = useState<number>(() =>
    typeof window === 'undefined' ? 833 : window.innerHeight
  );

  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const instance = mountBlueFlutedGlass(host.current!, options);
    controller.current = instance;
    return () => {
      instance.destroy();
      controller.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    controller.current?.update({ ...(options ?? {}), height: vh });
  }, [options, vh]);

  return <div ref={host} className={className} data-motion-component="blue-fluted-glass" />;
}
