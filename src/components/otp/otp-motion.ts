/**
 * OTP 动效常量（原包 otp-motion 未随组件分发，这里按胶囊/六格布局补全）。
 * 宽度单位 px；时长单位秒（*Duration）或毫秒（*Delay/*Duration 中以 ms 使用的项）。
 */
export const OTP_MOTION = {
  compactWidth: 132,
  expandedWidth: 340,
  verifiedWidth: 190,
  openDuration: 0.42,
  collapseDuration: 0.34,
  focusDuration: 0.28,
  verifyDelay: 900,
  errorDuration: 1400,
  ease: 'power3.inOut',
} as const;

/** 自动演示序列（本项目不使用 autoPlay，留空） */
export const OTP_REPLAY: Array<[number, string]> = [];
