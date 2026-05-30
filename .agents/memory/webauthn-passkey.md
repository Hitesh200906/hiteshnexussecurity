---
name: WebAuthn Passkey TypeScript
description: How to handle Uint8Array type mismatch with WebAuthn BufferSource types
---

When passing `Uint8Array` values to the WebAuthn API (`navigator.credentials.create`/`get`), TypeScript complains because `Uint8Array.buffer` is typed as `ArrayBufferLike` but the WebAuthn spec requires `BufferSource = ArrayBuffer | ArrayBufferView<ArrayBuffer>`.

**The rule:** Cast with `as unknown as ArrayBuffer` at all WebAuthn usage sites.

```tsx
challenge: challengeBytes as unknown as ArrayBuffer,
allowCredentials: [{ id: credBytes as unknown as ArrayBuffer, type: "public-key" }]
```

**Why:** TypeScript's `lib.dom.d.ts` for WebAuthn uses strict `ArrayBuffer` (not `ArrayBufferLike`), and `Uint8Array` has `buffer: ArrayBufferLike` which doesn't satisfy `ArrayBuffer` at compile time even though it works at runtime.

**How to apply:** Any time you call `navigator.credentials.create()` or `.get()` and pass Uint8Array values, add the cast.
