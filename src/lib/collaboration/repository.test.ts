import { describe, expect, it } from "vitest";
import { selectRepositoryKind } from "./repository";

describe("collaboration repository selection", () => {
  it("requires a database in production", () => {
    expect(selectRepositoryKind({ hasDatabaseUrl: false, nodeEnv: "production" })).toBe(
      "missing-database"
    );
  });

  it("allows the file fallback only outside production", () => {
    expect(selectRepositoryKind({ hasDatabaseUrl: false, nodeEnv: "development" })).toBe("file");
  });

  it("uses postgres when DATABASE_URL is configured", () => {
    expect(selectRepositoryKind({ hasDatabaseUrl: true, nodeEnv: "production" })).toBe("postgres");
  });
});
