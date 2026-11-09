import type { MotionController, MotionOptions } from './motion-runtime';

export type OtpVerificationOptions = MotionOptions & {
  autoPlay?: boolean;
  onReplayComplete?: () => void;
  onVerify?: (code: string) => boolean | Promise<boolean>;
  onSuccess?: (code: string) => void;
};

export function mountOtpVerification(
  target: HTMLElement,
  options?: OtpVerificationOptions
): MotionController;
