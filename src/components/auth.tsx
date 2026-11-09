'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, onUnauthorized, STATUS_QUERY_KEY } from '@/lib/client-api';
import { applyEnvPresets } from '@/lib/subscription-sync';
import type { AuthStatusResponse } from '@/lib/types';
import { useToast } from './toast';
import { cn } from '@/lib/utils';

/**
 * 认证上下文：
 * - 页面加载时查询 /api/status 判断会话有效性；
 * - 任何 API 返回 401/503 时全局打开登录框（客户端 API 层统一触发，不再散落检查）。
 */

type SetupRequired = boolean;

interface AuthContextValue {
  checked: boolean;
  verified: boolean;
  /** 服务器未设置 PASSWORD，需要管理员配置 */
  setupRequired: SetupRequired;
  /** /api/status 返回的应用版本（构建时从 package.json 注入） */
  version: string | null;
  openLogin: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  checked: false,
  verified: false,
  setupRequired: false,
  version: null,
  openLogin: () => {},
  logout: async () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [verified, setVerified] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 与 Providers 共用同一 query key 与缓存，避免 /api/status 被请求两次
  useEffect(() => {
    let cancelled = false;
    queryClient
      .fetchQuery({ queryKey: STATUS_QUERY_KEY, queryFn: () => api.status() })
      .then((s) => {
        if (cancelled) return;
        setVerified(s.verified);
        setSetupRequired(!s.passwordRequired);
        setVersion(s.version);
        setChecked(true);
      })
      .catch(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  useEffect(
    () =>
      onUnauthorized((event) => {
        const setup = (event as CustomEvent).detail === 'setup';
        setSetupRequired(setup);
        setVerified(false);
        setModalOpen(true);
      }),
    []
  );

  const openLogin = useCallback(() => setModalOpen(true), []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setVerified(false);
      toast('已退出登录', 'info');
    }
  }, [toast]);

  const handleLoginSuccess = useCallback(async () => {
    setVerified(true);
    setSetupRequired(false);
    setModalOpen(false);
    // 登录前以 401 失败的查询（如豆瓣推荐）需要重新拉取
    queryClient.invalidateQueries();
    toast('验证成功', 'success');
    // 预置订阅（DEFAULT_SUBSCRIPTIONS）的首屏同步发生在登录之前，会 401 静默失败，
    // 这里用缓存中的 /api/status 补跑一次（缓存缺失时回落为一次请求）
    try {
      const cached = queryClient.getQueryData<AuthStatusResponse>(STATUS_QUERY_KEY);
      const status =
        cached ??
        (await queryClient.fetchQuery<AuthStatusResponse>({
          queryKey: STATUS_QUERY_KEY,
          queryFn: () => api.status(),
          staleTime: 0,
        }));
      if (status) await applyEnvPresets(status);
    } catch {
      // 补拉预置数据失败不影响登录后的正常使用
    }
  }, [toast, queryClient]);

  return (
    <AuthContext.Provider value={{ checked, verified, setupRequired, version, openLogin, logout }}>
      {children}
      {modalOpen && (
        <LoginModal
          setupRequired={setupRequired}
          onSuccess={handleLoginSuccess}
          onClose={() => setModalOpen(false)}
        />
      )}
    </AuthContext.Provider>
  );
}

function LoginModal({
  setupRequired,
  onSuccess,
  onClose,
}: {
  setupRequired: boolean;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const CELLS = 6;
  const [chars, setChars] = useState<string[]>(Array(CELLS).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pill, setPill] = useState<'idle' | 'error' | 'success'>('idle');
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  // 错误摇动结束后复位，便于再次输入
  useEffect(() => {
    if (pill !== 'error') return;
    const t = setTimeout(() => setPill('idle'), 520);
    return () => clearTimeout(t);
  }, [pill]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const submit = async (next: string[]) => {
    const code = next.join('');
    if (code.length !== CELLS || loading) return;
    setLoading(true);
    setError('');
    setPill('idle');
    try {
      await api.login(code);
      setPill('success');
      setTimeout(onSuccess, 320);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '验证失败';
      setError(msg === '需要登录' ? '密码错误' : msg);
      setPill('error');
      setChars(Array(CELLS).fill(''));
      setLoading(false);
      refs.current[0]?.focus();
    }
  };

  const handleChange = (i: number, raw: string) => {
    // 允许字母（含大小写）与数字，取本格最后一个有效字符
    const v = raw.replace(/[^a-zA-Z0-9]/g, '');
    if (!v) return;
    const ch = v.slice(-1);
    const next = [...chars];
    next[i] = ch;
    setChars(next);
    if (i < CELLS - 1) refs.current[i + 1]?.focus();
    else refs.current[i]?.blur();
    if (next.every((c) => c !== '')) submit(next);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !chars[i] && i > 0) {
      const next = [...chars];
      next[i - 1] = '';
      setChars(next);
      refs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/[^a-zA-Z0-9]/g, '').slice(0, CELLS);
    if (!text) return;
    const next = Array(CELLS).fill('');
    text.split('').forEach((c, i) => {
      next[i] = c;
    });
    setChars(next);
    const focusAt = Math.min(text.length, CELLS - 1);
    refs.current[focusAt]?.focus();
    if (text.length === CELLS) submit(next);
  };

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-surface-raised rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={setupRequired ? '需要配置密码' : '访问验证'}
      >
        {setupRequired ? (
          <>
            <h2 className="text-lg font-semibold text-content mb-3">需要配置密码</h2>
            <p className="text-sm text-muted leading-relaxed">
              为确保安全，必须设置 <code className="text-accent">PASSWORD</code> 环境变量才能使用本服务。
              请联系管理员在部署配置中添加该变量后重启服务。
            </p>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-content mb-1">懂的都懂</h2>
            <p className="text-sm text-muted mb-4">输入六位密钥</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(chars);
              }}
            >
              <div
                className={cn(
                  'otp-cells',
                  pill === 'error' && 'otp-error',
                  pill === 'success' && 'otp-success',
                  loading && 'otp-loading'
                )}
              >
                {chars.map((c, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      refs.current[i] = el;
                    }}
                    type="text"
                    inputMode="text"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    value={c}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    className="otp-cell"
                    aria-label={`第 ${i + 1} 位`}
                    disabled={loading || pill === 'success'}
                  />
                ))}
              </div>
              {error && <p className="mt-3 text-sm text-danger text-center">{error}</p>}
              {loading && (
                <div className="mt-4 flex justify-center">
                  <span className="otp-spin" aria-hidden="true" />
                </div>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
