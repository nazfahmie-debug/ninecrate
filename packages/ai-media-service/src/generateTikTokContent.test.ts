import { describe, it, expect, afterEach } from "vitest";
import { parseTikTokContent, generateTikTokContent } from "./generateTikTokContent.js";

describe("parseTikTokContent", () => {
  it("parses a clean JSON response", () => {
    const text = JSON.stringify({
      hook: "POV: your couch just got 10x cozier",
      script: "Shot 1: blanket close-up\nShot 2: draping over couch",
      caption: "This blanket is unreal",
      hashtags: ["homedecor", "cozy"],
    });

    expect(parseTikTokContent(text)).toEqual({
      hook: "POV: your couch just got 10x cozier",
      script: "Shot 1: blanket close-up\nShot 2: draping over couch",
      caption: "This blanket is unreal",
      hashtags: ["homedecor", "cozy"],
    });
  });

  it("extracts JSON even when the model wraps it in prose or markdown fences", () => {
    const text =
      "Sure, here's the content brief:\n```json\n" +
      JSON.stringify({ hook: "h", script: "s", caption: "c", hashtags: ["a"] }) +
      "\n```\nHope that helps!";

    expect(parseTikTokContent(text)).toEqual({ hook: "h", script: "s", caption: "c", hashtags: ["a"] });
  });

  it("drops non-string entries from the hashtags array instead of failing", () => {
    const text = JSON.stringify({ hook: "h", script: "s", caption: "c", hashtags: ["ok", 42, null] });
    expect(parseTikTokContent(text).hashtags).toEqual(["ok"]);
  });

  it("throws a specific error when there's no JSON object in the response", () => {
    expect(() => parseTikTokContent("sorry, I can't help with that")).toThrow(
      /could not find a JSON object/i
    );
  });

  it("throws a specific error when the extracted text isn't valid JSON", () => {
    expect(() => parseTikTokContent("{ this is not valid json }")).toThrow(/not valid JSON/i);
  });

  it("throws a specific error when required fields are missing", () => {
    const text = JSON.stringify({ hook: "h", script: "s" });
    expect(() => parseTikTokContent(text)).toThrow(/missing required fields/i);
  });
});

describe("generateTikTokContent", () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
  });

  it("throws without making any API call when ANTHROPIC_API_KEY is unset", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const listing = {
      sourceId: "1",
      sourceUrl: "https://example.com/item/1.html",
      title: "Test product",
      description: "",
      images: [],
      price: 1,
      currency: "USD",
      variants: [],
    };

    await expect(generateTikTokContent(listing)).rejects.toThrow(/ANTHROPIC_API_KEY is not set/i);
  });
});
