/**
 * Lesson 06 — Tools, properly.
 *
 * Lesson 05 was the minimum. This is what a production tool actually uses:
 * richer parameter schemas, a structured canonical value, UI cards, cancellation,
 * timeouts, and correct failure signalling.
 *
 * The mental model to hold: ONE tool has THREE audiences, and they see different
 * things.
 *   1. The model      sees name + description + parameters, and reads output.render(...)
 *   2. A programmatic caller (Code Mode) receives output.schema's value verbatim
 *   3. The human UI   sees presentCall(...) / presentResult(...) cards
 * Keeping these separate is why you do not format prose into your return value.
 */

import type { Context } from "@deepseek-ai/cordis";
import { defineTool } from "@deepseek-ai/dsh-tools";

export const name = "lesson-06-tool-deep-dive";
export const inject = ["tools"];

export function apply(ctx: Context) {
  ctx.tools.register(
    defineTool({
      name: "lesson_word_stats",
      description:
        "Analyze a block of text and return word/character counts and the longest words. " +
        "Use when the user asks about the composition of some text.",

      // ---- Parameter schema DSL ----------------------------------------------
      // Supported `type`: string | number | integer | boolean | null | array |
      // object | json. Plus `oneOf` branch nodes (with NO `type` alongside).
      //
      // Supported annotations: description, title, default, examples.
      // NOT supported (the compiler rejects them): minimum, maxLength, pattern,
      // format, minItems, nullable. Range-check those yourself in execute().
      parameters: {
        text: {
          type: "string",
          required: true,
          description: "The text to analyze",
        },

        // enum restricts to a fixed set. `default` here is an ANNOTATION ONLY —
        // it is shown to the model but never applied, so an omitted arg is
        // genuinely undefined. Apply your own fallback in execute().
        sort: {
          type: "string",
          enum: ["length", "alpha"],
          default: "length",
          description: "How to order the longest-words list",
        },

        top: {
          type: "integer",
          description: "How many long words to return (1-10, default 3)",
        },

        // A nested object MUST declare additionalProperties explicitly.
        // (The parameter ROOT is implicitly open; nested objects are not.)
        ignore: {
          type: "object",
          additionalProperties: false,
          properties: {
            stopwords: { type: "array", items: { type: "string" } },
            caseSensitive: { type: "boolean" },
          },
          description: "Optional filtering controls",
        },
      },

      // ---- Canonical output ---------------------------------------------------
      output: {
        // A structured value, not a string. This is the real contract.
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            words: { type: "integer" },
            characters: { type: "integer" },
            longest: { type: "array", items: { type: "string" } },
          },
        },

        // render() projects that value into what the model reads. Pure function —
        // it also runs when replaying an old session log, so no I/O, no clock,
        // no randomness.
        render: (_args, value) => [
          {
            type: "text",
            text: `Summary stats:\nwords: ${value.words}\ncharacters: ${value.characters}`,
          },
          {
            type: "text",
            text: `Longest matching tokens:\n${value.longest.join(", ") || "(none)"}`,
          },
        ],

        // Optional. Replayable metadata for the UI, persisted on tool/result.
        // Also must be pure.
        presentationMeta: (_args, value) => ({ wordCount: value.words }),
      },

      // A cooperative deadline. Enforced by the timeout policy plugin, never sent
      // to the model. Must be positive and finite or defineTool() throws.
      timeoutMs: 5_000,

      // Pure classifier. Returning exactly `true` lets the harness run this call
      // in parallel with sibling calls. Only claim it if your body has no shared
      // mutable state and no side effects — this one is pure computation.
      isConcurrencySafe: () => true,

      // ---- Body ---------------------------------------------------------------
      // Second arg `exec` is the ToolRunContext: callId, name, agent?, and
      // crucially `signal` (an AbortSignal) — honor it and pass it to any I/O.
      async execute(args, exec) {
        // Hand-validate what the schema DSL cannot express.
        const top = args.top ?? 3;
        if (top < 1 || top > 10) {
          // THROW to signal failure. The registry catches it and produces an
          // isError result the model can see and react to. Do not return a
          // string like "error: ..." — that reads as success.
          throw new Error("`top` must be between 1 and 10");
        }

        // Cooperate with cancellation. In a real tool you would forward
        // exec.signal into fetch/spawn/etc. rather than only checking it.
        exec.signal.throwIfAborted();

        const stopwords = new Set(
          (args.ignore?.stopwords ?? []).map((w) =>
            args.ignore?.caseSensitive ? w : w.toLowerCase(),
          ),
        );

        const words = args.text
          .split(/\s+/)
          .filter(Boolean)
          .filter(
            (w) =>
              !stopwords.has(args.ignore?.caseSensitive ? w : w.toLowerCase()),
          );

        const sorted = [...words].sort(
          (args.sort ?? "length") === "alpha"
            ? (a, b) => a.localeCompare(b)
            : (a, b) => b.length - a.length,
        );

        // Return ONLY the canonical value. No prose, no formatting — render()
        // owns presentation.
        return {
          words: words.length,
          characters: args.text.length,
          longest: sorted.slice(0, top),
        };
      },

      // ---- UI cards -----------------------------------------------------------
      // The pending card, shown while the call is in flight. Pure; may return
      // undefined to fall back to a generic card.
      presentCall: (args) => ({
        card: "generic",
        title: `Analyze ${args.text.length} characters of text`,
        kind: "other",
      }),

      presentResult: (args, value) => {
        // 1. Extract longest words safely using optional chaining (?.) and a fallback empty array
        const longestWords = value?.longest ?? [];

        // 2. Format the list of longest words safely
        const wordsList =
          longestWords.length > 0
            ? longestWords
                .map(
                  (word, i) => `${i + 1}. **${word}** (${word.length} chars)`,
                )
                .join("\n")
            : "(no words found)";

        return {
          card: "generic",
          title: "Text Analysis Complete",
          kind: "other",
          body: [
            {
              type: "text",
              text: `📊 **Total Words:** ${value?.words ?? 0}  \n🔤 **Total Characters:** ${value?.characters ?? 0}`,
            },
            {
              type: "text",
              text: `🏆 **Top Longest Words (${args?.sort ?? "length"} order):**\n${wordsList}`,
            },
          ],
        };
      },
    }),
  );

  console.log("[lesson-06] registered tool: lesson_word_stats");
}
