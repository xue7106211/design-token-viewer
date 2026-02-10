import { useTokenStore } from "@/stores/token-store";

/**
 * In development, POSTs current token data to /api/save-sample-tokens
 * so that src/data/sample-tokens.json is updated (name, value, description, etc.).
 */
export function syncSampleTokensToFile(): void {
  const rawJSON = useTokenStore.getState().rawJSON;
  if (!rawJSON) return;
  fetch("/api/save-sample-tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rawJSON),
  }).catch(() => {});
}
