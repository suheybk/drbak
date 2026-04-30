/**
 * 100-line functional DI container — see ADR-0003.
 *
 * Pattern:
 *   1. Define `Token<T>` constants (in `tokens.ts`).
 *   2. Build a `Container` per request and bind tokens to factories.
 *   3. `c.resolve(TOKEN)` inside route handlers / use-cases.
 *
 * Singletons in Workers: cached for the LIFE of the request only — V8 isolates
 * may share state across requests, but we never assume so. If you need true
 * cross-request caching, use KV.
 */

declare const __tokenBrand: unique symbol;

export interface Token<T> {
  readonly description: string;
  readonly key: symbol;
  readonly [__tokenBrand]?: T;
}

export const token = <T>(description: string): Token<T> => ({
  description,
  key: Symbol(description),
});

type Factory<T> = (c: Container) => T;

export class Container {
  private readonly factories = new Map<symbol, Factory<unknown>>();
  private readonly cache = new Map<symbol, unknown>();

  bind<T>(t: Token<T>, factory: Factory<T>): this {
    this.factories.set(t.key, factory as Factory<unknown>);
    return this;
  }

  bindSingleton<T>(t: Token<T>, factory: Factory<T>): this {
    return this.bind(t, (c) => {
      if (!this.cache.has(t.key)) this.cache.set(t.key, factory(c));
      return this.cache.get(t.key) as T;
    });
  }

  bindValue<T>(t: Token<T>, value: T): this {
    return this.bind(t, () => value);
  }

  has<T>(t: Token<T>): boolean {
    return this.factories.has(t.key);
  }

  resolve<T>(t: Token<T>): T {
    const f = this.factories.get(t.key);
    if (!f) throw new Error(`No binding for token "${t.description}"`);
    return f(this) as T;
  }

  /** Create a child container that inherits parent bindings but can override them. */
  child(): Container {
    const c = new Container();
    for (const [k, f] of this.factories) c.factories.set(k, f);
    return c;
  }
}
