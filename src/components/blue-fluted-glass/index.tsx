'use client';

import { useEffect, useRef } from 'react';
import { mountBlueFlutedGlass } from './BlueFlutedGlassEngine.js';
import type { MotionController } from './motion-runtime';
import type { BlueFlutedGlassOptions } from './BlueFlutedGlassEngine';

export function BlueFlutedGlass({ options, className }: { options?: BlueFlutedGlassOptions; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<MotionController | null>(null);

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
    controller.current?.update(options ?? {});
  }, [options]);

  return <div ref={host} className={className} data-motion-component="blue-fluted-glass" />;
}
