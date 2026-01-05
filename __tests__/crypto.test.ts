import { encrypt, decrypt } from "../src/crypto";

describe("AES-256-GCM encryption", () => {
  it("encrypts and decrypts data correctly", async () => {
    const plaintext = "secret-data";
    const key = Buffer.alloc(32, 1);

    const encrypted = await encrypt(plaintext, key);
    const decrypted = await decrypt(encrypted, key);

    expect(decrypted).toBe(plaintext);
  });
});
