// Copies the latest legal docs from ../legal/ into ./content/
// Run when the canonical docs in /legal change.
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const sourceDir = join(root, "..", "legal");
const targetDir = join(root, "content");

const files = ["privacy-policy.md", "terms-of-service.md"];

for (const file of files) {
  const src = join(sourceDir, file);
  const dst = join(targetDir, file);
  if (!existsSync(src)) {
    console.error(`Source not found: ${src}`);
    process.exit(1);
  }
  copyFileSync(src, dst);
  console.log(`✓ Copied ${file}`);
}

console.log("Legal docs synced.");
