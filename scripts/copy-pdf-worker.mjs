import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The PDF viewer needs pdfjs-dist's worker served from this origin (the CSP
// allows scripts from 'self' only, so the default CDN worker is blocked).
// The copied public/pdf.worker.min.mjs is committed to git because Vercel did not
// reliably run postinstall. Run this after bumping pdfjs-dist.
const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, "..", "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const destDir = join(root, "..", "public");
const dest = join(destDir, "pdf.worker.min.mjs");

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`Copied pdfjs-dist worker -> ${dest}`);
