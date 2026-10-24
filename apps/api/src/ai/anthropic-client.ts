import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';
import { AiConfig } from './ai-config';

/** Injection token for the model client, so tests can replace the network with a mock. */
export const AI_MODEL_CLIENT = Symbol('AI_MODEL_CLIENT');

export interface AiCompletionRequest {
  model: string;
  /** Stable blocks first; the last stable block carries the cache breakpoint. */
  system: Anthropic.Beta.BetaTextBlockParam[];
  userText: string;
  /** JSON schema for structured output. */
  schema: Record<string, unknown>;
  maxTokens: number;
}

export interface AiModelClient {
  complete(request: AiCompletionRequest): Promise<Anthropic.Beta.BetaMessage>;
}

/**
 * Official SDK client. Streams (the input can be long) and returns the final message.
 * Adaptive thinking, explicit high effort, structured JSON output, prompt caching and the
 * server-side refusal fallback are all set here, in one place.
 */
@Injectable()
export class AnthropicModelClient implements AiModelClient {
  private client: Anthropic | null = null;

  constructor(private readonly config: AiConfig) {}

  private sdk(): Anthropic {
    if (!this.config.apiKey) throw new Error('ANTHROPIC_API_KEY is not configured.');
    this.client ??= new Anthropic({ apiKey: this.config.apiKey });
    return this.client;
  }

  async complete(request: AiCompletionRequest): Promise<Anthropic.Beta.BetaMessage> {
    const stream = this.sdk().beta.messages.stream({
      model: request.model,
      max_tokens: request.maxTokens,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high', format: { type: 'json_schema', schema: request.schema } },
      system: request.system,
      messages: [{ role: 'user', content: request.userText }],
    });
    return stream.finalMessage();
  }
}

/** User-facing message for an SDK error; never includes the key or the raw request. */
export function describeApiError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) return 'Claude API nije prihvatio ključ (ANTHROPIC_API_KEY).';
  if (error instanceof Anthropic.PermissionDeniedError) return 'Claude API je odbio pristup ovom modelu ili funkciji.';
  if (error instanceof Anthropic.RateLimitError) return 'Claude API je privremeno ograničio broj zahteva. Pokušajte kasnije.';
  if (error instanceof Anthropic.BadRequestError) return `Claude API je odbio zahtev: ${error.message}`;
  if (error instanceof Anthropic.APIConnectionError) return 'Nije moguće uspostaviti vezu sa Claude API-jem.';
  if (error instanceof Anthropic.APIError) return `Greška Claude API-ja (${error.status ?? 'nepoznat status'}): ${error.message}`;
  return error instanceof Error ? error.message : 'Nepoznata greška.';
}
