/**
 * Lesson 09, part 1 of 3 — the SERVICE DEFINITION.
 *
 * dsh splits a replaceable capability into three packages that never depend on
 * each other sideways:
 *
 *   Service Definition  (this file)  owns the service NAME + the abstract shape
 *   Service Provider    (provider.ts) one concrete implementation
 *   Consumer            (consumer.ts) uses it, usually exposing it as a tool
 *
 * The payoff: swap the provider and the consumer needs zero changes. That is how
 * ctx.shell swaps bash-local -> bash-sandbox, and ctx.fs swaps fs-local ->
 * fs-e2b, without touching tool-bash or tool-fs.
 *
 * The docs' warning is worth repeating: do NOT split preemptively. A capability
 * with exactly one sensible implementation should just be a plain service.
 */

import { Service, type Context } from '@deepseek-ai/cordis'

/**
 * Declaration merging. THIS is what makes `ctx.quotes` a typed property for
 * every consumer in the codebase. It belongs in the Definition, never in a
 * provider or consumer.
 */
declare module '@deepseek-ai/cordis' {
  interface Context {
    quotes: QuoteService
  }
}

export interface Quote {
  text: string
  author: string
}

/**
 * `abstract` is what makes this a seam rather than an implementation. Providers
 * subclass it; consumers only ever see this type.
 *
 * super(ctx, 'quotes') is the actual registration — the string is both the
 * service name and the `ctx.` key. This is why you do NOT use ctx.set() here:
 * ctx.set only overwrites an already-provided value. The Service base class
 * calls the real registration for you, and unregisters when the plugin unloads.
 */
export abstract class QuoteService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'quotes')
  }

  /** Return one quote. Providers decide where it comes from. */
  abstract random(): Promise<Quote>
}

// NOTE: only ONE implementation of a service may exist per context. Loading a
// second provider for 'quotes' throws — that is Cordis's standard duplicate
// service behavior, not a dsh rule. Use ctx.isolate() if you genuinely need two
// side by side in different subtrees.
