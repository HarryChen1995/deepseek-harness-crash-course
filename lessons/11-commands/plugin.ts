/**
 * Lesson 11 — Human commands: a real `/slash` entry point.
 *
 * Everything so far was for the MODEL. A command is for the HUMAN. The user
 * types `/wordcount some text`, your handler runs immediately, and the result is
 * rendered in the UI. No model turn. No tool call. No tokens spent.
 *
 * dsh has TWO independent slash namespaces, and confusing them is the single
 * most common mix-up in this material:
 *
 *   ctx.commands        a CLOSED registry. Slash must be at byte ZERO.
 *                       Resolved client-side, before the line becomes a prompt.
 *                       The model never sees it.
 *
 *   /skill-name         the OPEN skill catalog (lesson 10). Whitespace-bounded
 *                       ANYWHERE in the message. Resolved host-side in
 *                       agent/pre-step. Injects the skill body FOR the model.
 *
 * Use a command for something the human wants done. Use a skill for something
 * the model should know how to do.
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-commands'

export const name = 'lesson-11-commands'
export const inject = ['commands']

export function apply(ctx: Context) {
  ctx.commands.register({
    // Lowercase, no leading slash. Letters, digits, _ and - only.
    name: 'wordcount',

    // Shown in the UI's command discovery list.
    description: 'count the words and characters in the text you pass',

    // Advertises free-form input to capable clients. `hint` is the placeholder.
    // Add `images: true` to accept composer attachments — without it, an
    // invocation carrying images is REJECTED before your handler runs.
    input: { hint: '<text to count>' },

    // Whether the command/run session event records rawInput. Defaults true.
    // Set false when a domain event of your own already carries the payload,
    // to avoid duplicating it in the log.
    recordInput: true,

    /**
     * The handler. Receives a CommandInvocation:
     *   commandId    pairing id, already written to the command/run event
     *   agent        the exact Agent whose UI received this
     *   rawInput     everything after the command name, INCLUDING the leading
     *                separator whitespace — so trim it yourself
     *   attachments  frozen ImageBlock[], empty unless input.images is true
     *   signal       AbortSignal owned by the dispatching UI request
     *
     * Return { kind: 'success', text? } or { kind: 'error', text }.
     */
    handler: (invocation) => {
      const text = invocation.rawInput.trim()

      if (text === '') {
        // An error result is a normal outcome, not an exception. The UI renders
        // the text; the session log records command/done with kind 'error'.
        return { kind: 'error', text: 'Usage: /wordcount <text>' }
      }

      const words = text.split(/\s+/).filter(Boolean).length

      return {
        kind: 'success',
        text: `${words} words, ${text.length} characters (session ${invocation.agent.session.id})`,
      }
    },
  })

  console.log('[lesson-11] registered command: /wordcount')

  // SCOPING: registering on a plain ctx like this makes the command GLOBAL.
  // Register through an agent's own `agent.ctx` instead and the command is
  // agent-local, shadowing any global of the same name. Duplicate names within
  // one layer fail at registration.
  //
  // NOTHING reaches the model implicitly — the registry never submits rawInput
  // to the agent. If you want model-visible work, call the Agent API yourself
  // (that is what /plan does with its optional message).
}
