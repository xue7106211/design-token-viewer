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
import { parseTokenJSON } from "@/lib/parsers";
import { resolveTokens } from "@/lib/token-resolver";
import { buildTokenTree } from "@/lib/tree-builder";
import { rebuildRawJSON } from "@/lib/token-rebuilder";

interface TokenState {
  // Data
  rawJSON: unknown | null;
  collections: TokenCollection[];
  tokens: Record<string, DesignToken>;
  tree: TokenTreeNode[];

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
  loadJSON: (json: unknown) => boolean;
  clearData: () => void;
  setActiveCollection: (id: string) => void;
  setActiveMode: (modeId: string) => void;
  selectToken: (id: string | null) => void;
  scrollToGroup: (path: string) => void;
  clearScrollTarget: () => void;
  togglePath: (path: string) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setCodeFormat: (format: CodeFormat) => void;
  setInspectorOpen: (open: boolean) => void;
  setInspectorWidth: (width: number) => void;
  setEditingToken: (id: string | null, position?: { x: number; y: number }) => void;
  updateTokenValue: (tokenId: string, modeId: string, value: TokenValue) => void;
  updateTokenName: (tokenId: string, newName: string) => void;
  updateTokenDescription: (tokenId: string, description: string) => void;
  updateTokenCodeSyntax: (tokenId: string, codeSyntax: { WEB?: string; ANDROID?: string; iOS?: string }) => void;
  setTokenAlias: (tokenId: string, modeId: string, targetTokenId: string | null) => void;
  deleteToken: (tokenId: string) => void;
  reorderFilteredTokens: (newOrder: string[]) => void;
  renameGroup: (oldPath: string, newPath: string) => void;
  exportRawJSON: () => string;
  getTokensByGroup: (group: string) => DesignToken[];
  getVisibleTokens: () => DesignToken[];
}

export const useTokenStore = create<TokenState>()(
  persist(
    (set, get) => ({
      // Data
      rawJSON: null,
      collections: [],
      tokens: {},
      tree: [],

      // UI state
      activeCollectionId: null,
      activeModeId: null,
      selectedTokenId: null,
      scrollToTokenId: null,
      expandedPaths: new Set<string>(),
      searchQuery: "",
      viewMode: "list" as ViewMode,
      codeFormat: "css" as CodeFormat,
      inspectorOpen: false,
      inspectorWidth: 320,
      editingTokenId: null,
      editingPosition: null,

      // Computed
      activeCollection: null,
      filteredTokenIds: [],

      // Actions
      loadJSON: (json: unknown) => {
        const parsed = parseTokenJSON(json);
        if (!parsed) return false;

        const resolved = resolveTokens(parsed);
        const firstCollection = resolved.collections[0] ?? null;
        const firstMode = firstCollection?.modes[0] ?? null;

        const tree = buildTokenTree(
          Object.values(resolved.tokens),
          firstCollection?.name
        );

        set({
          rawJSON: json,
          collections: resolved.collections,
          tokens: resolved.tokens,
          tree,
          activeCollectionId: firstCollection?.id ?? null,
          activeModeId: firstMode?.modeId ?? null,
          selectedTokenId: null,
          scrollToTokenId: null,
          expandedPaths: new Set<string>(),
          searchQuery: "",
          inspectorOpen: false,
          editingTokenId: null,
          editingPosition: null,
          filteredTokenIds: firstCollection?.tokenIds ?? [],
          activeCollection: firstCollection,
        });

        return true;
      },

      clearData: () => {
        set({
          rawJSON: null,
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
        const { collections, tokens } = get();
        const collection = collections.find((c) => c.id === id) ?? null;
        const firstMode = collection?.modes[0] ?? null;
        const tree = buildTokenTree(
          Object.values(tokens),
          collection?.name
        );
        set({
          activeCollectionId: id,
          activeModeId: firstMode?.modeId ?? null,
          activeCollection: collection,
          filteredTokenIds: collection?.tokenIds ?? [],
          tree,
          selectedTokenId: null,
          scrollToTokenId: null,
          expandedPaths: new Set<string>(),
          searchQuery: "",
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

      setSearchQuery: (query: string) => {
        const { activeCollection, tokens } = get();
        if (!activeCollection) {
          set({ searchQuery: query, filteredTokenIds: [] });
          return;
        }

        if (!query.trim()) {
          set({
            searchQuery: query,
            filteredTokenIds: activeCollection.tokenIds,
          });
          return;
        }

        const lowerQuery = query.toLowerCase();
        const filtered = activeCollection.tokenIds.filter((id) => {
          const token = tokens[id];
          return token?.name.toLowerCase().includes(lowerQuery);
        });

        set({ searchQuery: query, filteredTokenIds: filtered });
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

      updateTokenValue: (tokenId: string, modeId: string, value: TokenValue) => {
        const { tokens, collections, activeCollectionId } = get();
        const token = tokens[tokenId];
        if (!token || !token.rawValues[modeId] || token.rawValues[modeId].type === "ALIAS") return;
        const nextTokens = { ...tokens };
        const t = { ...nextTokens[tokenId], rawValues: { ...token.rawValues, [modeId]: value } };
        nextTokens[tokenId] = t;
        const resolved = resolveTokens({ collections, tokens: nextTokens });
        const tree = buildTokenTree(
          Object.values(resolved.tokens),
          collections.find((c) => c.id === activeCollectionId)?.name
        );
        const rawJSON = rebuildRawJSON(resolved.collections, resolved.tokens);
        set({
          tokens: resolved.tokens,
          collections: resolved.collections,
          tree,
          rawJSON,
          filteredTokenIds: resolved.collections.find((c) => c.id === activeCollectionId)?.tokenIds ?? get().filteredTokenIds,
          activeCollection: resolved.collections.find((c) => c.id === activeCollectionId) ?? null,
          editingTokenId: null,
          editingPosition: null,
        });
      },

      updateTokenName: (tokenId: string, newName: string) => {
        const { tokens, collections, activeCollectionId } = get();
        const token = tokens[tokenId];
        if (!token || !newName.trim()) return;
        const trimmed = newName.trim();
        const pathSegments = trimmed.split("/").filter(Boolean);
        if (pathSegments.length === 0) return;
        const group = pathSegments.slice(0, -1).join("/");
        const nextTokens = { ...tokens };
        nextTokens[tokenId] = {
          ...token,
          name: trimmed,
          path: pathSegments,
          group,
        };
        const resolved = resolveTokens({ collections, tokens: nextTokens });
        const tree = buildTokenTree(
          Object.values(resolved.tokens),
          collections.find((c) => c.id === activeCollectionId)?.name
        );
        const rawJSON = rebuildRawJSON(resolved.collections, resolved.tokens);
        set({
          tokens: resolved.tokens,
          tree,
          rawJSON,
          filteredTokenIds: resolved.collections.find((c) => c.id === activeCollectionId)?.tokenIds ?? get().filteredTokenIds,
          activeCollection: resolved.collections.find((c) => c.id === activeCollectionId) ?? null,
        });
      },

      updateTokenDescription: (tokenId: string, description: string) => {
        const { tokens, collections } = get();
        const token = tokens[tokenId];
        if (!token) return;
        const nextTokens = { ...tokens };
        nextTokens[tokenId] = { ...token, description: description || undefined };
        const rawJSON = rebuildRawJSON(collections, nextTokens);
        set({ tokens: nextTokens, rawJSON });
      },

      updateTokenCodeSyntax: (tokenId: string, codeSyntax: { WEB?: string; ANDROID?: string; iOS?: string }) => {
        const { tokens, collections } = get();
        const token = tokens[tokenId];
        if (!token) return;
        const nextTokens = { ...tokens };
        nextTokens[tokenId] = { ...token, codeSyntax };
        const rawJSON = rebuildRawJSON(collections, nextTokens);
        set({ tokens: nextTokens, rawJSON });
      },

      setTokenAlias: (tokenId: string, modeId: string, targetTokenId: string | null) => {
        const { tokens, collections, activeCollectionId } = get();
        const token = tokens[tokenId];
        if (!token) return;
        const nextTokens = { ...tokens };
        const rawValues = { ...token.rawValues };
        if (targetTokenId == null) {
          const resolved = token.resolvedValues[modeId];
          if (resolved) rawValues[modeId] = resolved;
        } else {
          rawValues[modeId] = { type: "ALIAS", id: targetTokenId };
        }
        nextTokens[tokenId] = { ...token, rawValues };
        const resolved = resolveTokens({ collections, tokens: nextTokens });
        const t = resolved.tokens[tokenId];
        const isAlias = Object.values(t.rawValues).some((v) => v.type === "ALIAS");
        const firstRaw = Object.values(t.rawValues)[0];
        const aliasOf = firstRaw?.type === "ALIAS" ? firstRaw.id : undefined;
        resolved.tokens[tokenId] = { ...t, isAlias, aliasOf };
        const tree = buildTokenTree(
          Object.values(resolved.tokens),
          collections.find((c) => c.id === activeCollectionId)?.name
        );
        const rawJSON = rebuildRawJSON(resolved.collections, resolved.tokens);
        set({
          tokens: resolved.tokens,
          collections: resolved.collections,
          tree,
          rawJSON,
          filteredTokenIds: resolved.collections.find((c) => c.id === activeCollectionId)?.tokenIds ?? get().filteredTokenIds,
          activeCollection: resolved.collections.find((c) => c.id === activeCollectionId) ?? null,
        });
      },

      deleteToken: (tokenId: string) => {
        const { tokens, collections, activeCollectionId, selectedTokenId } = get();
        const nextTokens = { ...tokens };
        delete nextTokens[tokenId];
        const nextCollections = collections.map((col) => ({
          ...col,
          tokenIds: col.tokenIds.filter((id) => id !== tokenId),
        }));
        const resolved = resolveTokens({ collections: nextCollections, tokens: nextTokens });
        const activeCol = resolved.collections.find((c) => c.id === activeCollectionId) ?? null;
        const tree = buildTokenTree(
          Object.values(resolved.tokens),
          activeCol?.name
        );
        const rawJSON = rebuildRawJSON(resolved.collections, resolved.tokens);
        set({
          tokens: resolved.tokens,
          collections: resolved.collections,
          tree,
          rawJSON,
          filteredTokenIds: activeCol?.tokenIds ?? [],
          activeCollection: activeCol,
          selectedTokenId: selectedTokenId === tokenId ? null : selectedTokenId,
          scrollToTokenId: get().scrollToTokenId === tokenId ? null : get().scrollToTokenId,
          inspectorOpen: selectedTokenId === tokenId ? false : get().inspectorOpen,
          editingTokenId: get().editingTokenId === tokenId ? null : get().editingTokenId,
          editingPosition: get().editingTokenId === tokenId ? null : get().editingPosition,
        });
      },

      reorderFilteredTokens: (newOrder: string[]) => {
        const { collections, activeCollectionId, tokens, searchQuery } = get();
        if (searchQuery.trim()) return;
        const nextCollections = collections.map((col) =>
          col.id === activeCollectionId ? { ...col, tokenIds: newOrder } : col
        );
        const activeCol = nextCollections.find((c) => c.id === activeCollectionId) ?? null;
        const rawJSON = rebuildRawJSON(nextCollections, tokens);
        set({
          filteredTokenIds: newOrder,
          collections: nextCollections,
          activeCollection: activeCol,
          rawJSON,
        });
      },

      renameGroup: (oldPath: string, newPath: string) => {
        const { tokens, collections, activeCollectionId } = get();
        const trimmed = newPath.trim();
        if (!trimmed || trimmed === oldPath) return;
        const newSegments = trimmed.split("/").filter(Boolean);
        if (newSegments.length === 0) return;

        const nextTokens = { ...tokens };
        const prefix = oldPath + "/";
        for (const token of Object.values(tokens)) {
          if (token.name === oldPath || token.name.startsWith(prefix)) {
            const newName =
              token.name === oldPath ? trimmed : trimmed + token.name.slice(oldPath.length);
            const pathSegments = newName.split("/").filter(Boolean);
            const group = pathSegments.length > 1 ? pathSegments.slice(0, -1).join("/") : "";
            nextTokens[token.id] = {
              ...token,
              name: newName,
              path: pathSegments,
              group,
            };
          }
        }
        const resolved = resolveTokens({ collections, tokens: nextTokens });
        const tree = buildTokenTree(
          Object.values(resolved.tokens),
          collections.find((c) => c.id === activeCollectionId)?.name
        );
        const rawJSON = rebuildRawJSON(resolved.collections, resolved.tokens);
        set({
          tokens: resolved.tokens,
          tree,
          rawJSON,
          filteredTokenIds:
            resolved.collections.find((c) => c.id === activeCollectionId)?.tokenIds ??
            get().filteredTokenIds,
          activeCollection:
            resolved.collections.find((c) => c.id === activeCollectionId) ?? null,
        });
      },

      exportRawJSON: () => {
        const { collections, tokens } = get();
        const json = rebuildRawJSON(collections, tokens);
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
    }),
    {
      name: "design-token-viewer-storage",
      partialize: (state) => ({
        rawJSON: state.rawJSON,
        collections: state.collections,
        tokens: state.tokens,
        tree: state.tree,
        activeCollectionId: state.activeCollectionId,
        activeModeId: state.activeModeId,
        activeCollection: state.activeCollection,
        filteredTokenIds: state.filteredTokenIds,
        viewMode: state.viewMode,
        codeFormat: state.codeFormat,
        inspectorWidth: state.inspectorWidth,
      }),
      onRehydrateStorage: () => (state) => {
        // Legacy: only rawJSON was persisted → re-parse to restore collections/tokens/tree
        const hasData = state?.collections?.length && Object.keys(state?.tokens ?? {}).length > 0;
        if (state?.rawJSON && !hasData) {
          state.loadJSON(state.rawJSON);
        }
      },
    }
  )
);
