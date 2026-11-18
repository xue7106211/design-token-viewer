import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useChangeLogStore } from './changelog-store';
import type { LogEntry } from '@/types/changelog';
import { apiRequest, setActiveDocumentId } from '@/lib/collaboration/client';

vi.mock('@/lib/collaboration/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/collaboration/client')>(
    '@/lib/collaboration/client',
  );
  return {
    ...actual,
    apiRequest: vi.fn(),
  };
});

/** 重置 store 到初始状态 */
function resetStore() {
  useChangeLogStore.setState({
    entries: [],
    total: 0,
    isLoading: false,
    error: null,
    epoch: 0,
  });
}

describe('resetForDocument', () => {
  beforeEach(resetStore);

  it('切换文档时清空缓存并作废进行中的请求', () => {
    useChangeLogStore.setState({
      entries: [{ id: 'log-1', timestamp: 1, ip: '127.0.0.1', changeType: 'update_value' }],
      total: 4,
      error: '旧错误',
    });

    useChangeLogStore.getState().resetForDocument();

    expect(useChangeLogStore.getState().entries).toEqual([]);
    expect(useChangeLogStore.getState().total).toBe(0);
    expect(useChangeLogStore.getState().error).toBeNull();
    expect(useChangeLogStore.getState().epoch).toBe(1);
  });
});

describe('fetchEntries', () => {
  beforeEach(() => {
    resetStore();
    vi.mocked(apiRequest).mockReset();
  });

  it('保存服务端返回的最新页和总数', async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      entries: [{ id: 'server-1', timestamp: 5, ip: '127.0.0.1', changeType: 'update_value' }],
      total: 8,
    });

    await useChangeLogStore.getState().fetchEntries();

    expect(useChangeLogStore.getState().entries).toHaveLength(1);
    expect(useChangeLogStore.getState().total).toBe(8);
    expect(useChangeLogStore.getState().error).toBeNull();
  });

  it('请求失败时保留错误信息', async () => {
    vi.mocked(apiRequest).mockRejectedValue(new Error('日志加载失败'));

    await useChangeLogStore.getState().fetchEntries();

    expect(useChangeLogStore.getState().error).toBe('日志加载失败');
    expect(useChangeLogStore.getState().isLoading).toBe(false);
  });

  it('文档切换后丢弃过期响应', async () => {
    let resolveRequest: (value: { entries: LogEntry[]; total: number }) => void = () => {};
    vi.mocked(apiRequest).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );
    setActiveDocumentId('hyperos4');
    const pending = useChangeLogStore.getState().fetchEntries();
    setActiveDocumentId('hyperos3');
    useChangeLogStore.getState().resetForDocument();

    resolveRequest({
      entries: [{ id: 'stale', timestamp: 1, ip: '127.0.0.1', changeType: 'update_value' }],
      total: 1,
    });
    await pending;

    expect(useChangeLogStore.getState().entries).toEqual([]);
    expect(useChangeLogStore.getState().total).toBe(0);
  });
});
