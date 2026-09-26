import { describe, expect, it, beforeEach } from "vitest";
import { checkToken, makeToken } from "./auth";

describe("jeton de session", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = "secret-de-test";
  });

  it("accepte un jeton qu'il a signé", async () => {
    expect(await checkToken(await makeToken(1))).toBe(true);
  });

  it("refuse un jeton expiré, modifié ou vide", async () => {
    expect(await checkToken(await makeToken(-1))).toBe(false);
    const t = await makeToken(1);
    expect(await checkToken(t.slice(0, -2) + "xx")).toBe(false);
    expect(await checkToken("")).toBe(false);
    expect(await checkToken(null)).toBe(false);
  });

  it("refuse un jeton signé avec un autre secret", async () => {
    const t = await makeToken(1);
    process.env.AUTH_SECRET = "autre-secret";
    expect(await checkToken(t)).toBe(false);
  });
});
