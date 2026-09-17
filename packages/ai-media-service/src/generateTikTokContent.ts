import Anthropic from "@anthropic-ai/sdk";
import type { ProductListing, TikTokContent } from "@ninecrate/types";

const MODEL = "claude-sonnet-5";

function buildPrompt(listing: ProductListing): string {
  return `You are writing a short-form TikTok content brief for an e-commerce product.

Product title: ${listing.title}
Description: ${listing.description || "(none provided)"}
Price: ${listing.price} ${listing.currency}

Respond with ONLY a JSON object (no markdown fences, no commentary) matching exactly this shape:
{
  "hook": "a 1-sentence attention-grabbing opening line for the first 2 seconds of the video",
  "script": "a short shot-by-shot script (3-5 beats) for a 15-30 second video, as plain text with line breaks between beats",
  "caption": "a TikTok caption for the post, under 150 characters, no hashtags included",
  "hashtags": ["5 to 8 relevant hashtags, without the # symbol"]
}`;
}

/**
 * Generates a TikTok content brief (hook/script/caption/hashtags) for a
 * scraped product listing using Claude. This only produces content — it does
 * NOT post to TikTok. Posting requires TikTok's Content Posting API, which
 * needs a TikTok for Business developer app + per-account OAuth, and hasn't
 * been wired up. Treat this as a manual-review-then-post step for now.
 */
export async function generateTikTokContent(listing: ProductListing): Promise<TikTokContent> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your Anthropic API key."
    );
  }

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: buildPrompt(listing) }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("generateTikTokContent: Claude response contained no text block.");
  }

  return parseTikTokContent(textBlock.text);
}

function parseTikTokContent(text: string): TikTokContent {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(
      `generateTikTokContent: could not find a JSON object in the model's response. ` +
        `Raw response: ${text.slice(0, 500)}`
    );
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    throw new Error(
      `generateTikTokContent: model response was not valid JSON. ` +
        `Raw response: ${text.slice(0, 500)}`
    );
  }

  const { hook, script, caption, hashtags } = parsed;
  if (
    typeof hook !== "string" ||
    typeof script !== "string" ||
    typeof caption !== "string" ||
    !Array.isArray(hashtags)
  ) {
    throw new Error(
      `generateTikTokContent: model response was missing required fields ` +
        `(hook/script/caption strings, hashtags array). Got: ${JSON.stringify(parsed)}`
    );
  }

  return {
    hook,
    script,
    caption,
    hashtags: hashtags.filter((h: unknown): h is string => typeof h === "string"),
  };
}
