import Anthropic from '@anthropic-ai/sdk';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { App } from 'supertest/types';
import { AiConfig } from '../src/ai/ai-config';
import { AI_MODEL_CLIENT, AiCompletionRequest, AiModelClient } from '../src/ai/anthropic-client';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

export type Message = Anthropic.Beta.BetaMessage;

/** A message as the SDK would return it, with only the fields the services read. */
export function fakeMessage(options: {
  text?: string;
  stopReason?: Message['stop_reason'];
  model?: string;
  usage?: Partial<{ input: number; output: number; cacheRead: number; cacheCreation: number }>;
  refusalCategory?: string;
}): Message {
  const usage = { input: 1200, output: 300, cacheRead: 0, cacheCreation: 0, ...options.usage };
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: options.model ?? 'claude-opus-5-5',
    content: options.text === undefined ? [] : [{ type: 'text', text: options.text, citations: null }],
    stop_reason: options.stopReason ?? 'end_turn',
    stop_sequence: null,
    stop_details: options.stopReason === 'refusal' ? ({ type: 'refusal', category: options.refusalCategory ?? 'general_harms' } as never) : null,
    container: null,
    context_management: null,
    usage: {
      input_tokens: usage.input,
      output_tokens: usage.output,
      cache_read_input_tokens: usage.cacheRead,
      cache_creation_input_tokens: usage.cacheCreation,
      cache_creation: null,
      server_tool_use: null,
      service_tier: null,
      inference_geo: null,
      iterations: null,
      fallback_credit: null,
      speed: null,
    } as never,
  } as unknown as Message;
}

/** Stands in for the SDK: records every request and answers from a queue. */
export class MockModelClient implements AiModelClient {
  requests: AiCompletionRequest[] = [];
  queue: (() => Promise<Message>)[] = [];

  answer(message: Message) {
    this.queue.push(() => Promise.resolve(message));
  }

  fail(error: Error) {
    this.queue.push(() => Promise.reject(error));
  }

  /** Queues an answer that arrives only when the returned function is called (step-by-step jobs). */
  answerLater(): (message: Message) => void {
    let resolve!: (message: Message) => void;
    const promise = new Promise<Message>((r) => (resolve = r));
    this.queue.push(() => promise);
    return resolve;
  }

  async complete(request: AiCompletionRequest): Promise<Message> {
    this.requests.push(request);
    const next = this.queue.shift();
    if (!next) throw new Error('MockModelClient: no answer queued');
    return next();
  }
}

export async function createAiTestApp(config: AiConfig, client: AiModelClient): Promise<INestApplication<App>> {
  const builder: TestingModuleBuilder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(AiConfig)
    .useValue(config)
    .overrideProvider(AI_MODEL_CLIENT)
    .useValue(client);
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}
