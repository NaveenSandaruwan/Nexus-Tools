/**
 * Agent Graph — State Machine Runner
 *
 * Defines the node transition table and executes the graph from an
 * initial state until it reaches the "end" node or encounters an error.
 *
 *   START
 *     │
 *     ▼
 *  [router]  ──► routedTo="question"          ──► [question_agent]  ──► END
 *            ──► routedTo="code_generation"   ──► [code_gen_agent]  ──► END
 *
 * Each node is a pure async function: (GraphState) => Promise<GraphState>.
 * Nodes mutate the state in place and set state.currentNode to the next node.
 */

import { createInitialState, type GraphState } from "./state";
import type { ConversationMessage } from "./types";
import { runRouterNode } from "./router";
import { runQuestionAgentNode } from "./question-agent";
import { runCodeGenAgentNode } from "./code-gen-agent";
import { runHistoryNode } from "./history-assistant";

// ─── Node registry ─────────────────────────────────────────────────────────────

type NodeFn = (state: GraphState) => Promise<GraphState>;

const NODE_MAP: Record<string, NodeFn> = {
  history_agent: runHistoryNode,
  router: runRouterNode,
  question_agent: runQuestionAgentNode,
  code_gen_agent: runCodeGenAgentNode,
};

// ─── Graph runner ──────────────────────────────────────────────────────────────

const MAX_STEPS = 10; // safety circuit-breaker to prevent infinite loops

/**
 * Run the full agent graph for a user message.
 *
 * @param userMessage  The raw message from the chat input.
 * @param history      Prior conversation turns (for multi-turn context).
 * @param currentCode  Current Python code in the editor.
 * @param preferredMode User's selected mode ("agent" or "ask") to override automatic routing.
 * @returns            The final graph state with .reply, .pythonCode, etc.
 */
export async function runGraph(
  userMessage: string,
  history: ConversationMessage[] = [],
  currentCode?: string,
  preferredMode?: "agent" | "ask"
): Promise<GraphState> {
  let state = createInitialState(userMessage, history, currentCode, preferredMode);
  let steps = 0;

  while (state.currentNode !== "end" && steps < MAX_STEPS) {
    const nodeFn = NODE_MAP[state.currentNode];

    if (!nodeFn) {
      // Unknown node — this is a bug in the graph definition
      state.error = `Unknown node: "${state.currentNode}"`;
      state.currentNode = "end";
      break;
    }

    state = await nodeFn(state);
    steps++;

    // Stop if an error was set by a node
    if (state.error && state.currentNode !== "end") {
      // ── FALLBACK: If error occurs AFTER code generation, use the generated code ──
      if (state.pythonCode && state.agentOutputs.code_generation) {
        // Code was already generated — use it and show code generation message
        state.reply = state.agentOutputs.code_generation;
        state.routedTo = "code_generation";
      } else {
        // Error occurred before code generation —show appropriate message
        state.reply = `Request limit exceeded or connection interrupted. Please try again.`;
      }
      state.currentNode = "end";
    }
  }

  if (steps >= MAX_STEPS) {
    // ── FALLBACK: If step limit exceeded but code was generated, use it ──
    if (state.pythonCode && state.agentOutputs.code_generation) {
      state.reply = state.agentOutputs.code_generation;
      state.routedTo = "code_generation";
    } else {
      state.error = "Request limit exceeded. Please try again.";
      state.reply = state.error;
    }
  }

  return state;
}
