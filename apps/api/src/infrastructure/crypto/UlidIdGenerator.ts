import { ulid } from 'ulid';
import type { IdGenerator, RandomTokenGenerator } from '../../application/ports/index.js';

export class UlidIdGenerator implements IdGenerator {
  generate(): string {
    return ulid();
  }
}

export class WebcryptoRandomTokens implements RandomTokenGenerator {
  generate(bytes: number): string {
    const buf = new Uint8Array(bytes);
    crypto.getRandomValues(buf);
    return base64url(buf);
  }
}

const base64url = (bytes: Uint8Array): string => {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  // btoa is available in Workers
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
