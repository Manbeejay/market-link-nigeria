import { createOpenAI } from "npm:@ai-sdk/openai@4";
import { Output, streamText, type ModelMessage } from "npm:ai@7";

import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "./run-id.ts";

export function createResponsesCall(
  request: Request,
  config: {
    baseURL: string;
    apiKey: string;
    model: string;
    system?: string;
    // Optional structured output: the AI SDK converts this schema to a strict
    // json_schema `text.format` on /v1/responses. Schema must be strict-compatible.
    output?: ReturnType<typeof Output.object>;
    // Output budget for the call (maps to max_output_tokens on /v1/responses).
    maxOutputTokens?: number;
  },
  messages: ModelMessage[],
) {
  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: `${config.baseURL.replace(/\/+$/, "").replace(/\/v1$/, "")}/v1`,
    apiKey: config.apiKey,
    headers: { "Lovable-API-Key": config.apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  const result = streamText({
    model: provider.responses(config.model),
    system: config.system,
    messages,
    abortSignal: request.signal,
    ...(config.output ? { output: config.output } : {}),
    ...(config.maxOutputTokens ? { maxOutputTokens: config.maxOutputTokens } : {}),
    providerOptions: {
      openai: {
        store: false,
      },
    },
  });
  return { result, runIdFetch };
}

/**
 * Streams plain text to the client. If the model produced no text at all
 * (empty stream), emits `fallback` instead of ending silently.
 */
export function textStreamResponse(
  result: { textStream: AsyncIterable<string> },
  fallback: string,
  headers?: Record<string, string>,
): Response {
  const encoder = new TextEncoder();
  const iterator = result.textStream[Symbol.asyncIterator]();
  let emitted = false;
  const guarded = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await iterator.next();
        if (done) {
          if (!emitted) controller.enqueue(encoder.encode(fallback));
          controller.close();
          return;
        }
        emitted = true;
        controller.enqueue(encoder.encode(value));
      } catch {
        // Stream failed mid-way; don't append an error to partial output.
        if (!emitted) {
          controller.enqueue(encoder.encode(fallback));
          controller.close();
        } else {
          controller.close();
        }
      }
    },
    cancel() {},
  });
  return new Response(guarded, {
    headers: { "Content-Type": "text/plain; charset=utf-8", ...(headers ?? {}) },
  });
}

/**
 * Wraps a UI message stream (SSE) response. If no assistant content part was
 * emitted, injects a terminal error part carrying `fallbackError` before the
 * finish marker, so the client shows a clear message instead of silence.
 */
export function uiMessageStreamResponseWithFallback(response: Response, fallbackError: string): Response {
  if (!response.body) return response;
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let hasContent = false;
  const held: string[] = [];
  const CONTENT_TYPES = new Set([
    "text-start",
    "text-delta",
    "reasoning-start",
    "reasoning-delta",
    "tool-input-start",
    "tool-input-delta",
    "tool-output",
    "error",
  ]);

  const guarded = response.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data:")) {
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") {
              held.push(line);
              continue;
            }
            try {
              const part = JSON.parse(payload) as { type?: string };
              if (part.type) {
                if (CONTENT_TYPES.has(part.type)) hasContent = true;
                if (part.type === "finish") {
                  held.push(line);
                  continue;
                }
              }
            } catch {
              // Not JSON; pass through unchanged.
            }
          }
          controller.enqueue(encoder.encode(line + "\n"));
        }
      },
      flush(controller) {
        if (buffer) controller.enqueue(encoder.encode(buffer + "\n"));
        if (!hasContent) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", errorText: fallbackError })}\n\n`),
          );
        }
        // Re-emit held finish/[DONE] lines as self-terminated SSE events.
        for (const line of held) controller.enqueue(encoder.encode(line + "\n\n"));
        controller.close();
      },
    }),
  );

  return new Response(guarded, { status: response.status, headers: response.headers });
}
