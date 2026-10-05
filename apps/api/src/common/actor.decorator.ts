import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ActorType } from '@prisma/client';

export const ACTOR_HEADER = 'x-actor-type';

/**
 * Who performs the request. Without authentication (first milestone) the caller
 * declares itself via the `X-Actor-Type` header. Anything other than an explicit
 * `USER` is treated as `AGENT` — least privilege: agents cannot confirm facts,
 * approve steps or resolve conflicts.
 */
export function resolveActor(headerValue: string | string[] | undefined): ActorType {
  const value = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  return value?.trim().toUpperCase() === 'USER' ? 'USER' : 'AGENT';
}

export const Actor = createParamDecorator((_data: unknown, ctx: ExecutionContext): ActorType => {
  const request = ctx.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>();
  return resolveActor(request.headers[ACTOR_HEADER]);
});
