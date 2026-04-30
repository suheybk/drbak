# ADR-0003 — NestJS-style DI on Cloudflare Workers without `reflect-metadata`

**Date:** 2026-04-30
**Status:** Accepted

## Context

The original spec mandates *"NestJS patterns — modules/providers/controllers/guards/pipes — emulated via lightweight DI"*. Real NestJS depends on `reflect-metadata` and TypeScript decorators, which work in Node but are unreliable in V8 isolates without polyfills that cost startup-time budget. We can't ship 50ms of polyfill on a Worker that has a 50ms CPU budget unbusted.

## Decision

A 100-line functional DI container with the same mental model as Nest, no decorators, no reflection.

```ts
// composition/container.ts
import type { Env } from '../interfaces/workers/env';

export type Token<T> = { readonly _t?: T; key: symbol; description: string };
export const token = <T>(description: string): Token<T> =>
  ({ key: Symbol(description), description });

type Factory<T> = (c: Container) => T;

export class Container {
  private readonly factories = new Map<symbol, Factory<unknown>>();
  private readonly singletons = new Map<symbol, unknown>();

  bind<T>(t: Token<T>, factory: Factory<T>): void {
    this.factories.set(t.key, factory as Factory<unknown>);
  }

  bindSingleton<T>(t: Token<T>, factory: Factory<T>): void {
    this.bind(t, (c) => {
      if (!this.singletons.has(t.key)) {
        this.singletons.set(t.key, factory(c));
      }
      return this.singletons.get(t.key) as T;
    });
  }

  resolve<T>(t: Token<T>): T {
    const f = this.factories.get(t.key);
    if (!f) throw new Error(`No binding for ${t.description}`);
    return f(this) as T;
  }
}

export const buildContainer = (env: Env, ctx: ExecutionContext): Container => {
  const c = new Container();
  // request-scoped, env-bound bindings
  c.bindSingleton(EnvT, () => env);
  c.bindSingleton(ExecCtxT, () => ctx);
  // … wire each port to a concrete adapter
  return c;
};
```

## Mental-model mapping

| NestJS concept | Our equivalent |
|---|---|
| `@Module` | A folder under `infrastructure/` or `application/use-cases/` exporting a `register(c: Container)` function |
| `@Injectable()` provider | A `Token<T>` plus a factory bound in the container |
| `@Controller()` | A Hono route file under `interfaces/http/routes/` |
| `@UseGuards()` | Hono middleware composed in the route file |
| `@UsePipes()` | A Zod-validator middleware (`zodValidator(schema)`) |
| `@Inject(TOKEN)` | `c.resolve(TOKEN)` inside a route handler |
| Request-scoped lifecycle | Container is built per `fetch` invocation |
| Singleton lifecycle | Bound via `bindSingleton` (cached for the life of the request — Workers don't share state across requests anyway) |

## Why not `tsyringe`?

- Requires `reflect-metadata`. Adds ~30kb and unreliable behaviour in V8 isolates.
- Decorator-based — we'd be teaching a third syntax (decorators + Hono + Workers) instead of two.
- Our 100-line container is plenty for a project of this size; introducing a library here is overengineering.

## Why not "no DI, just import"?

- Test substitution becomes painful. We want use-cases to be testable with in-memory adapters in <1ms — that means ports + factories, not direct imports.
- Composition root needs *one* file where the wiring is visible. Without a container, that file becomes a god-object of imports.

## Consequences

- 100 lines of bespoke code we own. Trivial to understand, extend, or rip out.
- Discoverability slightly worse than NestJS (no IDE auto-injection hint). Mitigation: every use-case takes its dependencies as explicit parameters in the function signature; the container is the *outer* edge of the system.
