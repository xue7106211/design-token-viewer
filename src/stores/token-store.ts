import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  DesignToken,
  TokenCollection,
  TokenTreeNode,
  ViewMode,
  CodeFormat,
} from "@/types/token";
import { parseTokenJSON } from "@/lib/parsers";
import { resolveTokens } from "@/lib/token-resolver";
import { buildTokenTree } from "@/lib/tree-builder";

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
  expandedPaths: Set<string>;
  searchQuery: string;
  viewMode: ViewMode;
  codeFormat: CodeFormat;
  inspectorOpen: boolean;
  inspectorWidth: number;

  // Computed
  activeCollection: TokenCollection | null;
  filteredTokenIds: string[];

  // Actions
  loadJSON: (json: unknown) => boolean;
  clearData: () => void;
  setActiveCollection: (id: string) => void;
  setActiveMode: (modeId: string) => void;
  selectToken: (id: string | null) => void;
  togglePath: (path: string) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setCodeFormat: (format: CodeFormat) => void;
  setInspectorOpen: (open: boolean) => void;
  setInspectorWidth: (width: number) => void;
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
      expandedPaths: new Set<string>(),
      searchQuery: "",
      viewMode: "grid" as ViewMode,
      codeFormat: "css" as CodeFormat,
      inspectorOpen: false,
      inspectorWidth: 320,

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
          expandedPaths: new Set<string>(),
          searchQuery: "",
          inspectorOpen: false,
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
          expandedPaths: new Set<string>(),
          searchQuery: "",
          inspectorOpen: false,
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
          inspectorOpen: id !== null,
        });
      },

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
        viewMode: state.viewMode,
        codeFormat: state.codeFormat,
        inspectorWidth: state.inspectorWidth,
      }),
      onRehydrateStorage: () => (state) => {
        // Re-parse stored JSON on hydration
        if (state?.rawJSON) {
          state.loadJSON(state.rawJSON);
        }
      },
    }
  )
);
