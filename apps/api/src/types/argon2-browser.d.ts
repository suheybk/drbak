declare module 'argon2-browser' {
  export const ArgonType: {
    Argon2d: 0;
    Argon2i: 1;
    Argon2id: 2;
  };

  export interface HashOptions {
    pass: string | Uint8Array;
    salt: string | Uint8Array;
    type?: 0 | 1 | 2;
    time?: number;
    mem?: number;
    parallelism?: number;
    hashLen?: number;
    distPath?: string;
  }

  export interface HashResult {
    hash: Uint8Array;
    hashHex: string;
    encoded: string;
  }

  export interface VerifyOptions {
    pass: string | Uint8Array;
    encoded: string;
    type?: 0 | 1 | 2;
  }

  export function hash(opts: HashOptions): Promise<HashResult>;
  export function verify(opts: VerifyOptions): Promise<void>;

  const _default: {
    ArgonType: typeof ArgonType;
    hash: typeof hash;
    verify: typeof verify;
  };
  export default _default;
}
