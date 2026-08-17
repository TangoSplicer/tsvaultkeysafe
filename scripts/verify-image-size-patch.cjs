const fs = require("node:fs");
const path = require("node:path");

const packagePath = require.resolve("image-size/package.json");
const packageDirectory = path.dirname(packagePath);
const imageSizePackage = require(packagePath);
const icnsParserPath = path.join(packageDirectory, "dist", "types", "icns.js");
const imageUtilsPath = path.join(packageDirectory, "dist", "types", "utils.js");
const workspacePath = path.join(process.cwd(), "pnpm-workspace.yaml");
const patchPath = path.join(process.cwd(), "patches", "image-size@1.2.1.patch");
const expectedIcnsGuard =
  "Invalid ICNS, image entry length must be at least 8 bytes";
const expectedBoxGuard = "offset += box.size > 0 ? box.size : 8;";

function fail(message) {
  console.error(`image-size patch verification failed: ${message}`);
  process.exit(1);
}

if (imageSizePackage.version !== "1.2.1") {
  fail(`expected image-size@1.2.1, found ${imageSizePackage.version}`);
}

if (!fs.existsSync(patchPath)) {
  fail("missing patches/image-size@1.2.1.patch");
}

const workspace = fs.readFileSync(workspacePath, "utf8");
if (!workspace.includes("image-size@1.2.1: patches/image-size@1.2.1.patch")) {
  fail("pnpm-workspace.yaml does not register the image-size patch");
}

const icnsParser = fs.readFileSync(icnsParserPath, "utf8");
if (!icnsParser.includes(expectedIcnsGuard)) {
  fail("the installed image-size ICNS parser does not include the guard");
}

const imageUtils = fs.readFileSync(imageUtilsPath, "utf8");
if (!imageUtils.includes(expectedBoxGuard)) {
  fail(
    "the installed image-size parser does not include the zero-length box guard",
  );
}

console.log(
  `image-size@${imageSizePackage.version} guards active: malformed ICNS entries are rejected and zero-length boxes advance safely.`,
);
