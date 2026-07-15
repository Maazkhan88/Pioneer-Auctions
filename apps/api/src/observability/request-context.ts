import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContext {
  readonly correlationId: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();
