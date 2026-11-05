'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 临时诊断页（手机端直播排障）：
 * - 显示 UA / iOS 版本 / 原生 HLS 探测结果
 * - 用纯 <video> 播放 Apple 官方 HTTPS 测试 HLS，验证设备本身能否播 HLS
 * - 全程事件日志，便于截图定位
 */
const TEST_STREAM =
  'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8';

export default function LiveDebugPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const customVideoRef = useRef<HTMLVideoElement>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [customUrl, setCustomUrl] = useState('');
  const log = (line: string) =>
    setLogs((prev) => [`${new Date().toLocaleTimeString()}  ${line}`, ...prev].slice(0, 40));

  /** 从粘贴的地址里提取真实流地址（支持直接粘 /live?url=... 页面地址） */
  const extractStreamUrl = (raw: string): string => {
    const m = raw.match(/[?&]url=([^&]+)/);
    if (m) {
      try { return decodeURIComponent(m[1]); } catch { return m[1]; }
    }
    return raw.trim();
  };

  const testCustomUrl = () => {
    const target = extractStreamUrl(customUrl);
    if (!target) return;
    log(`开始测试频道: ${target}`);
    if (target.startsWith('http://')) {
      log('警告: 流地址是 HTTP 明文，HTTPS 页面会被 iOS 拦截（混合内容）');
    }
    const video = customVideoRef.current;
    if (!video) return;
    const onError = () =>
      log(`频道播放失败: code=${video.error?.code} message=${video.error?.message || ''}`);
    const onPlaying = () => log('频道播放成功: playing');
    video.addEventListener('error', onError, { once: true });
    video.addEventListener('playing', onPlaying, { once: true });
    video.src = target;
    video.load();
    video.play().catch((e) => log(`play() 被拒绝: ${String(e)}`));
  };

  useEffect(() => {
    const v = document.createElement('video');
    const hlsA = v.canPlayType('application/vnd.apple.mpegurl');
    const hlsB = v.canPlayType('application/x-mpegURL');
    const ua = navigator.userAgent;
    const ios = ua.match(/OS (\d+)[._](\d+)/);
    log(`UA: ${ua}`);
    log(`iOS: ${ios ? ios[1] + '.' + ios[2] : '非 iOS'}`);
    log(`canPlayType vnd.apple.mpegurl: "${hlsA || '空'}"`);
    log(`canPlayType x-mpegURL: "${hlsB || '空'}"`);
    log(`代码版本标记: NATIVE-HLS-20261105`);

    const video = videoRef.current;
    if (!video) return;
    const events = ['loadstart', 'loadedmetadata', 'canplay', 'playing', 'error', 'stalled', 'waiting'];
    const handlers: Record<string, () => void> = {};
    for (const evt of events) {
      handlers[evt] = () => {
        if (evt === 'error') {
          const err = video.error;
          log(`事件 ${evt}: code=${err?.code} message=${err?.message || ''}`);
        } else {
          log(`事件 ${evt}`);
        }
      };
      video.addEventListener(evt, handlers[evt]);
    }
    video.src = TEST_STREAM;
    video.load();
    video.play().catch((e) => log(`play() 被拒绝: ${String(e)}`));
    return () => {
      for (const evt of events) video.removeEventListener(evt, handlers[evt]);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-4 flex flex-col gap-3">
      <h1 className="text-base font-bold">tkyTV 直播诊断</h1>
      <video
        ref={videoRef}
        playsInline
        muted
        controls
        className="w-full aspect-video bg-zinc-900 rounded-lg"
      />
      <p className="text-xs text-zinc-400">
        上方播放的是 Apple 官方 HTTPS 测试流。能出画面 = 手机本身没问题，问题在你的频道地址；
        不能播 = 设备/浏览器层面问题。
      </p>
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-bold">测试你失败的频道</h2>
        <input
          value={customUrl}
          onChange={(e) => setCustomUrl(e.target.value)}
          placeholder="粘贴 m3u8 流地址，或 /live?url=... 页面地址"
          className="w-full bg-zinc-900 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-500"
        />
        <button
          onClick={testCustomUrl}
          className="bg-purple-600 text-white text-xs font-bold rounded-lg px-4 py-2"
        >
          测试这个频道
        </button>
        <video
          ref={customVideoRef}
          playsInline
          muted
          controls
          className="w-full aspect-video bg-zinc-900 rounded-lg"
        />
      </div>
      <div className="text-[11px] leading-5 font-mono bg-zinc-900 rounded-lg p-3 break-all">
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}
