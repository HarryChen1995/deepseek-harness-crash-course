/**
 * Lesson 09, part 2 of 3 — a SERVICE PROVIDER.
 *
 * One concrete implementation of the seam. It depends on the Definition and
 * nothing else. It has no idea a tool exists.
 *
 * EXPORT SHAPE MATTERS — this is a real trap with its own postmortem in the
 * repo: a service package DEFAULT-exports its service class, while a function
 * plugin NAMED-exports name/inject/Config/apply and has NO default export.
 * Mixing the two forms makes the Loader discard the function plugin's namespace.
 * So: this file default-exports the class, and exports nothing else.
 */

import type { Context } from '@deepseek-ai/cordis'
import { QuoteService, type Quote } from './service.ts'

const CANNED: Quote[] = [
  { text: 'Everything is a plugin.', author: 'DeepSeek Harness' },
  { text: 'Make it work, make it right, make it fast.', author: 'Kent Beck' },
  { text: 'Simplicity is prerequisite for reliability.', author: 'Edsger Dijkstra' },
]

/**
 * The class IS the plugin. Cordis sees a constructor plugin and instantiates it
 * with (ctx, config); the Service base class registers it as `ctx.quotes`.
 */
export default class LocalQuoteProvider extends QuoteService {
  constructor(ctx: Context) {
    super(ctx)
    console.log('[lesson-09] provider mounted: ctx.quotes is now available')
  }

  async random(): Promise<Quote> {
    // A real provider would hit an API here — and would take an AbortSignal so
    // callers can cancel. Kept synchronous-ish for the lesson.
    return CANNED[Math.floor(Math.random() * CANNED.length)]!
  }
}

// Swapping providers is pure composition. To replace this one, change the row's
// `name` in the patch file to another module that also extends QuoteService.
// consumer.ts does not change, does not get recompiled, does not care.
