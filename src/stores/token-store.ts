import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  DesignToken,
  TokenCollection,
  TokenTreeNode,
  TokenValue,
  ViewMode,
  CodeFormat,
} from "@/types/token";
import { buildTokenTree } from "@/lib/tree-builder";
import { rebuildRawJSON } from "@/lib/token-rebuilder";
import {
  ApiError,
  apiRequest,
  withActor,
  setActiveDocumentId,
  DEFAULT_DOCUMENT_ID,
  type TokenDocumentResponse,
} from "@/lib/collaboration/client";

type CodeSyntax = { WEB?: string; ANDROID?: string; iOS?: string };

interface TokenState {
  // Shared server data
  rawJSON: unknown | null;
  revision: number | null;
  updatedAt: number | null;
  updatedBy?: string;
  collections: TokenCollection[];
  tokens: Record<string, DesignToken>;
  tree: TokenTreeNode[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Active token document (HyperOS3 / HyperOS4)
  activeDocumentId: string;

  // UI state
  activeCollectionId: string | null;
  activeModeId: string | null;
  selectedTokenId: string | null;
  scrollToTokenId: string | null;
  expandedPaths: Set<string>;
  searchQuery: string;
  viewMode: ViewMode;
  codeFormat: CodeFormat;
  inspectorOpen: boolean;
  inspectorWidth: number;
  editingTokenId: string | null;
  editingPosition: { x: number; y: number } | null;

  // Computed
  activeCollection: TokenCollection | null;
  filteredTokenIds: string[];

  // Actions
  setActiveDocument: (documentId: string) => void;
  loadRemoteDocument: () => Promise<void>;
  loadJSON: (json: unknown) => Promise<boolean>;
  clearData: () => void;
  setActiveCollection: (id: string) => void;
  setActiveMode: (modeId: string) => void;
  selectToken: (id: string | null) => void;
  scrollToGroup: (path: string) => void;
  clearScrollTarget: () => void;
  togglePath: (path: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setCodeFormat: (format: CodeFormat) => void;
  setInspectorOpen: (open: boolean) => void;
  setInspectorWidth: (width: number) => void;
  setEditingToken: (id: string | null, position?: { x: number; y: number }) => void;
  updateTokenValue: (tokenId: string, modeId: string, value: TokenValue) => Promise<void>;
  updateTokenName: (tokenId: string, newName: string) => Promise<void>;
  updateTokenDescription: (tokenId: string, description: string) => Promise<void>;
  updateTokenCodeSyntax: (tokenId: string, codeSyntax: CodeSyntax) => Promise<void>;
  setTokenAlias: (tokenId: string, modeId: string, targetTokenId: string | null) => Promise<void>;
  deleteToken: (tokenId: string) => Promise<void>;
  reorderFilteredTokens: (newOrder: string[]) => Promise<void>;
  renameGroup: (oldPath: string, newPath: string) => Promise<void>;
  exportRawJSON: () => string;
  getTokensByGroup: (group: string) => DesignToken[];
  getVisibleTokens: () => DesignToken[];
}

type PersistedTokenState = Partial<
  Pick<
    TokenState,
    | "activeDocumentId"
    | "activeCollectionId"
    | "activeModeId"
    | "searchQuery"
    | "viewMode"
    | "codeFormat"
    | "inspectorWidth"
  >
> & {
  expandedPaths?: string[];
};

// 每套文档的默认选中集合（无持久化选择时生效）
const DEFAULT_COLLECTION_BY_DOCUMENT: Record<string, string> = {
  hyperos4: "col_reference",
};

export const useTokenStore = create<TokenState>()(
  persist(
    (set, get) => {
      const applyDocument = (document: TokenDocumentResponse) => {
        const preferredCollectionId = get().activeCollectionId;
        const preferredModeId = get().activeModeId;
        const fallbackCollectionId = DEFAULT_COLLECTION_BY_DOCUMENT[get().activeDocumentId];
        const activeCollection =
          document.collections.find((collection) => collection.id === preferredCollectionId) ??
          document.collections.find((collection) => collection.id === fallbackCollectionId) ??
          document.collections[0] ??
          null;
        const activeMode =
          activeCollection?.modes.find((mode) => mode.modeId === preferredModeId) ??
          activeCollection?.modes[0] ??
          null;
        const tree = buildTokenTree(Object.values(document.tokens), activeCollection?.name);
        const filteredTokenIds = filterTokenIds(
          activeCollection,
          document.tokens,
          get().searchQuery
        );
        const selectedTokenId = get().selectedTokenId;
        const selectedTokenStillExists = selectedTokenId != null && document.tokens[selectedTokenId] != null;

        set({
          rawJSON: document.currentJson,
          revision: document.revision,
          updatedAt: document.updatedAt,
          updatedBy: document.updatedBy,
          collections: document.collections,
          tokens: document.tokens,
          tree,
          activeCollectionId: activeCollection?.id ?? null,
          activeModeId: activeMode?.modeId ?? null,
          activeCollection,
          filteredTokenIds,
          selectedTokenId: selectedTokenStillExists ? selectedTokenId : null,
          inspectorOpen: selectedTokenStillExists ? get().inspectorOpen : false,
          error: null,
        });
      };

      const commit = async (
        url: string,
        body: Record<string, unknown>,
        method: "PATCH" | "POST" | "DELETE" = "PATCH"
      ) => {
        const revision = get().revision;
        if (revision == null) return;
        set({ isSaving: true, error: null });
        try {
          const document = await apiRequest<TokenDocumentResponse>(url, {
            method,
            body: JSON.stringify(withActor({ ...body, revision })),
          });
          applyDocument(document);
        } catch (error) {
          await handleMutationError(error, get().loadRemoteDocument);
          set({ error: error instanceof Error ? error.message : "保存失败" });
        } finally {
          set({ isSaving: false });
        }
      };

      return {
        // Shared server data
        rawJSON: null,
        revision: null,
        updatedAt: null,
        updatedBy: undefined,
        collections: [],
        tokens: {},
        tree: [],
        isLoading: false,
        isSaving: false,
        error: null,

        // Active document
        activeDocumentId: DEFAULT_DOCUMENT_ID,

        // UI state
        activeCollectionId: null,
        activeModeId: null,
        selectedTokenId: null,
        scrollToTokenId: null,
        expandedPaths: new Set<string>(),
        searchQuery: "",
        viewMode: "list" as ViewMode,
        codeFormat: "android" as CodeFormat,
        inspectorOpen: false,
        inspectorWidth: 320,
        editingTokenId: null,
        editingPosition: null,

        // Computed
        activeCollection: null,
        filteredTokenIds: [],

        loadRemoteDocument: async () => {
          set({ isLoading: true, error: null });
          try {
            const document = await apiRequest<TokenDocumentResponse>("/api/token-document");
            applyDocument(document);
          } catch (error) {
            set({ error: error instanceof Error ? error.message : "加载失败" });
          } finally {
            set({ isLoading: false });
          }
        },

        setActiveDocument: (documentId: string) => {
          if (documentId === get().activeDocumentId) return;
          // 同步全局请求头来源，使后续 apiRequest 命中新文档
          setActiveDocumentId(documentId);
          // 切表即清空当前文档相关状态，避免旧集合/选中残留
          set({
            activeDocumentId: documentId,
            rawJSON: null,
            revision: null,
            updatedAt: null,
            updatedBy: undefined,
            collections: [],
            tokens: {},
            tree: [],
            activeCollectionId: null,
            activeModeId: null,
            activeCollection: null,
            selectedTokenId: null,
            scrollToTokenId: null,
            expandedPaths: new Set<string>(),
            filteredTokenIds: [],
            inspectorOpen: false,
            editingTokenId: null,
            editingPosition: null,
            error: null,
          });
          void get().loadRemoteDocument();
        },

        loadJSON: async (json: unknown) => {
          const revision = get().revision;
          if (revision == null) return false;
          set({ isSaving: true, error: null });
          try {
            const document = await apiRequest<TokenDocumentResponse>("/api/token-document/import", {
              method: "POST",
              body: JSON.stringify(withActor({ json, revision })),
            });
            applyDocument(document);
            return true;
          } catch (error) {
            await handleMutationError(error, get().loadRemoteDocument);
            set({ error: error instanceof Error ? error.message : "导入失败" });
            return false;
          } finally {
            set({ isSaving: false });
          }
        },

        clearData: () => {
          set({
            rawJSON: null,
            revision: null,
            updatedAt: null,
            updatedBy: undefined,
            collections: [],
            tokens: {},
            tree: [],
            activeCollectionId: null,
            activeModeId: null,
            selectedTokenId: null,
            scrollToTokenId: null,
            expandedPaths: new Set<string>(),
            searchQuery: "",
            inspectorOpen: false,
            editingTokenId: null,
            editingPosition: null,
            filteredTokenIds: [],
            activeCollection: null,
          });
        },

        setActiveCollection: (id: string) => {
          const { collections, tokens, searchQuery } = get();
          const collection = collections.find((c) => c.id === id) ?? null;
          const firstMode = collection?.modes[0] ?? null;
          const tree = buildTokenTree(Object.values(tokens), collection?.name);
          set({
            activeCollectionId: id,
            activeModeId: firstMode?.modeId ?? null,
            activeCollection: collection,
            filteredTokenIds: filterTokenIds(collection, tokens, searchQuery),
            tree,
            selectedTokenId: null,
            scrollToTokenId: null,
            expandedPaths: new Set<string>(),
          });
        },

        setActiveMode: (modeId: string) => {
          set({ activeModeId: modeId });
        },

        selectToken: (id: string | null) => {
          set({
            selectedTokenId: id,
            scrollToTokenId: id,
            inspectorOpen: id !== null,
          });
        },

        scrollToGroup: (path: string) => {
          const { filteredTokenIds, tokens } = get();
          const prefix = path + "/";
          const firstId = filteredTokenIds.find((id) => {
            const token = tokens[id];
            return token?.name.startsWith(prefix) ?? false;
          }) ?? null;
          set({ scrollToTokenId: firstId });
        },

        clearScrollTarget: () => set({ scrollToTokenId: null }),

        togglePath: (path: string) => {
          const { expandedPaths } = get();
          const next = new Set(expandedPaths);
          if (next.has(path)) {
            next.delete(path);
          } else {
            next.add(path);
          }
          set({ expandedPaths: next });
        },

        expandAll: () => {
          const { tree } = get();
          const allPaths = new Set<string>();
          const collect = (nodes: TokenTreeNode[]) => {
            for (const node of nodes) {
              if (node.children.length > 0) {
                allPaths.add(node.path);
                collect(node.children);
              }
            }
          };
          collect(tree);
          set({ expandedPaths: allPaths });
        },

        collapseAll: () => {
          set({ expandedPaths: new Set<string>() });
        },

        setSearchQuery: (query: string) => {
          const { activeCollection, tokens } = get();
          set({
            searchQuery: query,
            filteredTokenIds: filterTokenIds(activeCollection, tokens, query),
          });
        },

        setViewMode: (mode: ViewMode) => set({ viewMode: mode }),
        setCodeFormat: (format: CodeFormat) => set({ codeFormat: format }),
        setInspectorOpen: (open: boolean) => set({ inspectorOpen: open }),
        setInspectorWidth: (width: number) =>
          set({ inspectorWidth: Math.min(560, Math.max(280, width)) }),

        setEditingToken: (id: string | null, position?: { x: number; y: number }) => {
          set({
            editingTokenId: id,
            editingPosition: id != null && position ? position : null,
          });
        },

        updateTokenValue: async (tokenId: string, modeId: string, value: TokenValue) => {
          await commit(`/api/tokens/${encodeURIComponent(tokenId)}/value`, { modeId, value });
          set({ editingTokenId: null, editingPosition: null });
        },

        updateTokenName: (tokenId: string, newName: string) =>
          commit(`/api/tokens/${encodeURIComponent(tokenId)}/name`, { newName }),

        updateTokenDescription: (tokenId: string, description: string) =>
          commit(`/api/tokens/${encodeURIComponent(tokenId)}/description`, { description }),

        updateTokenCodeSyntax: (tokenId: string, codeSyntax: CodeSyntax) =>
          commit(`/api/tokens/${encodeURIComponent(tokenId)}/code-syntax`, { codeSyntax }),

        setTokenAlias: (tokenId: string, modeId: string, targetTokenId: string | null) =>
          commit(`/api/tokens/${encodeURIComponent(tokenId)}/alias`, { modeId, targetTokenId }),

        deleteToken: (tokenId: string) =>
          commit(`/api/tokens/${encodeURIComponent(tokenId)}`, {}, "DELETE"),

        reorderFilteredTokens: async (newOrder: string[]) => {
          const { collections, activeCollectionId, tokens, searchQuery, revision } = get();
          if (searchQuery.trim() || revision == null) return;
          const nextCollections = collections.map((collection) =>
            collection.id === activeCollectionId ? { ...collection, tokenIds: newOrder } : collection
          );
          const rawJSON = rebuildRawJSON(nextCollections, tokens);
          await get().loadJSON(rawJSON);
        },

        renameGroup: async (oldPath: string, newPath: string) => {
          const { tokens } = get();
          const trimmed = newPath.trim();
          if (!trimmed || trimmed === oldPath) return;
          const prefix = oldPath + "/";
          const affected = Object.values(tokens).filter(
            (token) => token.name === oldPath || token.name.startsWith(prefix)
          );
          for (const token of affected) {
            const nextName =
              token.name === oldPath ? trimmed : trimmed + token.name.slice(oldPath.length);
            await get().updateTokenName(token.id, nextName);
          }
        },

        exportRawJSON: () => {
          const { rawJSON, collections, tokens } = get();
          const json = rawJSON ?? rebuildRawJSON(collections, tokens);
          return JSON.stringify(json, null, 2);
        },

        getTokensByGroup: (group: string) => {
          const { filteredTokenIds, tokens } = get();
          return filteredTokenIds
            .map((id) => tokens[id])
            .filter((t): t is DesignToken => t !== undefined && t.group === group);
        },

        getVisibleTokens: () => {
          const { filteredTokenIds, tokens } = get();
          return filteredTokenIds
            .map((id) => tokens[id])
            .filter((t): t is DesignToken => t !== undefined);
        },
      };
    },
    {
      name: "design-token-viewer-storage",
      partialize: (state) =>
        ({
          activeDocumentId: state.activeDocumentId,
          activeCollectionId: state.activeCollectionId,
          activeModeId: state.activeModeId,
          expandedPaths: [...state.expandedPaths],
          searchQuery: state.searchQuery,
          viewMode: state.viewMode,
          codeFormat: state.codeFormat,
          inspectorWidth: state.inspectorWidth,
        }) as PersistedTokenState,
      merge: (persisted, current) => {
        const state = persisted as PersistedTokenState;
        const activeDocumentId = state.activeDocumentId ?? DEFAULT_DOCUMENT_ID;
        // 水合时同步全局文档 id，保证首个请求命中持久化的文档
        setActiveDocumentId(activeDocumentId);
        return {
          ...current,
          ...state,
          activeDocumentId,
          expandedPaths: new Set(state.expandedPaths ?? []),
        };
      },
    }
  )
);

function filterTokenIds(
  activeCollection: TokenCollection | null,
  tokens: Record<string, DesignToken>,
  query: string
) {
  if (!activeCollection) return [];
  if (!query.trim()) return activeCollection.tokenIds;
  const lowerQuery = query.toLowerCase();
  return activeCollection.tokenIds.filter((id) => {
    const token = tokens[id];
    return token?.name.toLowerCase().includes(lowerQuery) ?? false;
  });
}

async function handleMutationError(error: unknown, refresh: () => Promise<void>) {
  if (error instanceof ApiError && error.status === 409) {
    window.alert(error.message);
    await refresh();
    return;
  }
  if (typeof window !== "undefined") {
    window.alert(error instanceof Error ? error.message : "保存失败");
  }
}
