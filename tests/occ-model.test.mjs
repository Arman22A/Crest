import assert from "node:assert/strict";
import test from "node:test";

class AtomicProgressStore {
  #row = { revision: 1, payload: { source: "initial" } };

  async compareAndSwap(baseRevision, payload) {
    await Promise.resolve();
    if (this.#row.revision !== baseRevision) {
      return { status: "conflict", revision: this.#row.revision, payload: structuredClone(this.#row.payload) };
    }
    this.#row = { revision: this.#row.revision + 1, payload: structuredClone(payload) };
    return { status: "saved", revision: this.#row.revision, payload: structuredClone(this.#row.payload) };
  }

  read() {
    return structuredClone(this.#row);
  }
}

test("two devices cannot silently save the same base revision", async () => {
  const store = new AtomicProgressStore();
  const [phone, laptop] = await Promise.all([
    store.compareAndSwap(1, { source: "phone" }),
    store.compareAndSwap(1, { source: "laptop" })
  ]);
  assert.deepEqual([phone.status, laptop.status].sort(), ["conflict", "saved"]);
  assert.equal(store.read().revision, 2);
  assert.ok(["phone", "laptop"].includes(store.read().payload.source));
});
