import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DesignToken, TokenType, TokenValue } from "@/types/token";
import { TokenInspector } from "./token-inspector";

vi.mock("@/stores/token-store", () => ({
  useTokenStore: vi.fn(),
}));

vi.mock("@/lib/token-resolver", () => ({
  getAliasChain: vi.fn(() => []),
}));

vi.mock("@/lib/code-generators", () => ({
  generateTokenCode: vi.fn(() => "generated code"),
}));

vi.mock("@/lib/contrast", () => ({
  colorToHex: vi.fn(() => "#000000"),
  colorToHexWithAlpha: vi.fn(() => "#00000099"),
  colorToRGB: vi.fn(() => "rgba(0, 0, 0, 0.60)"),
  colorToHSL: vi.fn(() => "hsla(0, 0%, 0%, 0.60)"),
  contrastRatio: vi.fn(() => 4.5),
  getWCAGLevel: vi.fn(() => "AA"),
}));

vi.mock("./color-swatch", () => ({
  ColorSwatch: () => <div data-testid="color-swatch" />,
}));

vi.mock("./number-preview", () => ({
  NumberPreview: () => <div data-testid="number-preview" />,
}));

vi.mock("./code-output", () => ({
  CodeOutput: () => <div data-testid="code-output" />,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

const { useTokenStore } = await import("@/stores/token-store");

const valuesByType: Record<TokenType, TokenValue> = {
  COLOR: { type: "COLOR", value: { r: 0, g: 0, b: 0, a: 0.6 } },
  NUMBER: { type: "NUMBER", value: 16 },
  STRING: { type: "STRING", value: "value" },
  BOOLEAN: { type: "BOOLEAN", value: true },
};

function makeToken(type: TokenType = "COLOR", scopes?: string[]): DesignToken {
  const value = valuesByType[type];

  return {
    id: "token-1",
    name: "text/default/miuix_color_text_primary_pressed",
    path: ["text", "default", "miuix_color_text_primary_pressed"],
    type,
    collection: "Semantic Token",
    group: "text/default",
    rawValues: { light: value },
    resolvedValues: { light: value },
    isAlias: false,
    referencedBy: [],
    description: "用于主要文字的按下状态，反馈正在进行的按压操作。",
    scopes,
  };
}

function setupStore(token: DesignToken) {
  const state = {
    selectedTokenId: token.id,
    tokens: { [token.id]: token },
    activeCollection: null,
    activeModeId: "light",
    selectToken: vi.fn(),
    inspectorOpen: true,
    setInspectorOpen: vi.fn(),
    codeFormat: "android" as const,
    inspectorWidth: 320,
    setInspectorWidth: vi.fn(),
  };

  (useTokenStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (selector: (store: typeof state) => unknown) => selector(state)
  );
}

function expectBefore(first: HTMLElement, second: HTMLElement) {
  expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
}

const tokenTypes = ["COLOR", "NUMBER", "STRING", "BOOLEAN"] as const;
const missingScopeCases = [
  { label: "undefined", scopes: undefined },
  { label: "empty array", scopes: [] },
  { label: "blank values", scopes: ["", "   "] },
];

describe("TokenInspector Token Scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows scopes in source order between description and contrast", () => {
    setupStore(makeToken("COLOR", ["TEXT_FILL", "STROKE_COLOR"]));

    render(<TokenInspector />);

    const descriptionHeading = screen.getByText("描述");
    const scopeHeading = screen.getByText("Token Scope");
    const firstScope = screen.getByText("TEXT_FILL");
    const secondScope = screen.getByText("STROKE_COLOR");
    const contrastHeading = screen.getByText("对比度");

    expectBefore(descriptionHeading, scopeHeading);
    expectBefore(scopeHeading, contrastHeading);
    expectBefore(firstScope, secondScope);
  });

  it.each(tokenTypes)("shows Token Scope for %s tokens", (type) => {
    setupStore(makeToken(type, ["ALL_SCOPES"]));

    render(<TokenInspector />);

    expect(screen.getByText("Token Scope")).toBeInTheDocument();
    expect(screen.getByText("ALL_SCOPES")).toBeInTheDocument();
  });

  it.each(missingScopeCases)("shows a fallback for $label", ({ scopes }) => {
    setupStore(makeToken("COLOR", scopes));

    render(<TokenInspector />);

    expect(screen.getByText("Token Scope")).toBeInTheDocument();
    expect(screen.getByText("未设置")).toBeInTheDocument();
  });
});
