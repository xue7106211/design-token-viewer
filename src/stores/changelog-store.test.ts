import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useChangeLogStore } from './changelog-store';
import type { LogEntry } from '@/types/changelog';

// Mock fetchClientIP 避免真实网络请求
vi.mock('@/lib/changelog', () => ({
  fetchClientIP: vi.fn().mockResolvedValue('127.0.0.1'),
}));

/** 重置 store 到初始状态 */
function resetStore() {
  useChangeLogStore.setState({ entries: [], clientIP: 'unknown' });
}

/** 创建一条最小化的日志输入 */
function makeEntry(
  overrides: Partial<Omit<LogEntry, 'id' | 'timestamp' | 'ip'>> = {},
): Omit<LogEntry, 'id' | 'timestamp' | 'ip'> {
  return { changeType: 'update_value', tokenId: 't1', tokenName: 'color/primary', ...overrides };
}

// ---------------------------------------------------------------------------
// addLogEntry
// ---------------------------------------------------------------------------
describe('addLogEntry', () => {
  beforeEach(resetStore);

  it('自动填充 id、timestamp、ip', () => {
    const fakeUUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce(fakeUUID as `${string}-${string}-${string}-${string}-${string}`);
    const now = 1700000000000;
    vi.spyOn(Date, 'now').mockReturnValueOnce(now);

    // 设置 clientIP
    useChangeLogStore.getState().setClientIP('192.168.1.1');
    useChangeLogStore.getState().addLogEntry(makeEntry());

    const entries = useChangeLogStore.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe(fakeUUID);
    expect(entries[0].timestamp).toBe(now);
    expect(entries[0].ip).toBe('192.168.1.1');
    expect(entries[0].changeType).toBe('update_value');
    expect(entries[0].tokenId).toBe('t1');
  });

  it('clientIP 默认为 "unknown"', () => {
    useChangeLogStore.getState().addLogEntry(makeEntry());
    const entry = useChangeLogStore.getState().entries[0];
    expect(entry.ip).toBe('unknown');
  });

  it('500 条上限截断：保留最新的 500 条', () => {
    // 预填充 500 条
    const existing: LogEntry[] = Array.from({ length: 500 }, (_, i) => ({
      id: `old-${i}`,
      timestamp: i,
      ip: 'unknown',
      changeType: 'update_value' as const,
      tokenId: `t-${i}`,
    }));
    useChangeLogStore.setState({ entries: existing });

    // 再添加一条
    useChangeLogStore.getState().addLogEntry(makeEntry({ tokenId: 'new-token' }));

    const entries = useChangeLogStore.getState().entries;
    expect(entries).toHaveLength(500);
    // 最早的 old-0 应该被截断
    expect(entries[0].id).toBe('old-1');
    // 最后一条是新添加的
    expect(entries[entries.length - 1].tokenId).toBe('new-token');
  });

  it('保留传入的可选字段（oldValue、newValue、meta）', () => {
    useChangeLogStore.getState().addLogEntry(
      makeEntry({
        changeType: 'update_name',
        oldValue: 'old-name',
        newValue: 'new-name',
        meta: { modeId: 'mode-1' },
      }),
    );

    const entry = useChangeLogStore.getState().entries[0];
    expect(entry.oldValue).toBe('old-name');
    expect(entry.newValue).toBe('new-name');
    expect(entry.meta).toEqual({ modeId: 'mode-1' });
  });
});

// ---------------------------------------------------------------------------
// clearAll
// ---------------------------------------------------------------------------
describe('clearAll', () => {
  beforeEach(resetStore);

  it('清空所有条目', () => {
    // 添加几条
    useChangeLogStore.getState().addLogEntry(makeEntry());
    useChangeLogStore.getState().addLogEntry(makeEntry());
    expect(useChangeLogStore.getState().entries).toHaveLength(2);

    useChangeLogStore.getState().clearAll();
    expect(useChangeLogStore.getState().entries).toHaveLength(0);
  });

  it('对空列表调用 clearAll 不报错', () => {
    expect(useChangeLogStore.getState().entries).toHaveLength(0);
    useChangeLogStore.getState().clearAll();
    expect(useChangeLogStore.getState().entries).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// setClientIP
// ---------------------------------------------------------------------------
describe('setClientIP', () => {
  beforeEach(resetStore);

  it('更新 clientIP', () => {
    useChangeLogStore.getState().setClientIP('10.0.0.1');
    expect(useChangeLogStore.getState().clientIP).toBe('10.0.0.1');
  });
});


// ---------------------------------------------------------------------------
// 属性测试：日志条目上限
// ---------------------------------------------------------------------------
import fc from 'fast-check';

describe('属性测试：日志条目上限', () => {
  beforeEach(resetStore);

  /**
   * 属性 1：日志条目数量始终 ≤ 500
   * 无论添加多少条日志，entries.length 始终不超过 500。
   *
   * **Validates: Requirements 3.3**
   */
  it('日志条目数量始终 ≤ 500', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 600 }),
        (count) => {
          // 每次属性测试运行前重置 store
          useChangeLogStore.setState({ entries: [], clientIP: 'unknown' });

          // 使用预填充 + 少量 addLogEntry 调用来加速测试
          if (count > 10) {
            // 预填充 count-10 条，再逐条添加 10 条
            const prefill: LogEntry[] = Array.from({ length: count - 10 }, (_, i) => ({
              id: `prefill-${i}`,
              timestamp: i,
              ip: 'unknown',
              changeType: 'update_value' as const,
              tokenId: `t-${i}`,
            }));
            useChangeLogStore.setState({ entries: prefill });
            for (let i = 0; i < 10; i++) {
              useChangeLogStore.getState().addLogEntry(makeEntry({ tokenId: `new-${i}` }));
            }
          } else {
            for (let i = 0; i < count; i++) {
              useChangeLogStore.getState().addLogEntry(makeEntry({ tokenId: `t-${i}` }));
            }
          }

          const entries = useChangeLogStore.getState().entries;
          expect(entries.length).toBeLessThanOrEqual(500);
        },
      ),
      { numRuns: 50 },
    );
  });
});
