import { spawnSync } from "node:child_process";

const metroAssetRegressionScript = `
  const path = require("node:path");
  const { getAssetSize } = require(path.join(process.cwd(), "node_modules/metro/src/Assets"));
  const malformedIcns = Buffer.from([
    0x69, 0x63, 0x6e, 0x73, 0x00, 0x00, 0x00, 0x10,
    0x69, 0x63, 0x30, 0x37, 0x00, 0x00, 0x00, 0x00,
  ]);

  try {
    getAssetSize("png", malformedIcns, "malformed-icns.png");
    console.error("The malformed ICNS payload was unexpectedly accepted.");
    process.exit(2);
  } catch (error) {
    if (
      error instanceof TypeError &&
      error.message === "Invalid ICNS, image entry length must be at least 8 bytes"
    ) {
      console.log("ICNS entry-length guard active");
      process.exit(0);
    }

    console.error(error);
    process.exit(3);
  }
`;

const metroBoxRegressionScript = `
  const path = require("node:path");
  const { getAssetSize } = require(path.join(process.cwd(), "node_modules/metro/src/Assets"));
  const malformedJxl = Buffer.from([
    0x00, 0x00, 0x00, 0x00, 0x4a, 0x58, 0x4c, 0x20,
  ]);

  try {
    getAssetSize("png", malformedJxl, "malformed-jxl.png");
    console.log("JXL zero-length box handled without an infinite loop");
    process.exit(0);
  } catch (error) {
    if (error instanceof TypeError) {
      console.log("JXL zero-length box rejected without an infinite loop");
      process.exit(0);
    }

    console.error(error);
    process.exit(3);
  }
`;

describe("Metro image-size security patch", () => {
  it("rejects a malformed ICNS payload within a bounded process", () => {
    const result = spawnSync(
      process.execPath,
      ["-e", metroAssetRegressionScript],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        timeout: 2_000,
      },
    );

    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("ICNS entry-length guard active");
  });

  it("handles a zero-length JXL box without blocking Metro asset processing", () => {
    const result = spawnSync(
      process.execPath,
      ["-e", metroBoxRegressionScript],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        timeout: 2_000,
      },
    );

    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/JXL zero-length box (handled|rejected)/);
  });
});
