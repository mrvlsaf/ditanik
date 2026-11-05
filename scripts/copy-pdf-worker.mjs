import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The in-app PDF viewer (components/documents/DocumentViewer.tsx) needs
// pdfjs-dist's worker script served from this app's own origin: the CSP's
// script-src only allows 'self' (next.config.ts), so pdfjs-dist's documented
// default of loading the worker straight from a CDN (unpkg.com) gets
// silently blocked by the browser, and the viewer fails with "Could not
// open this PDF." — no console-visible network error, just a rejected
// getDocument() promise.
//
// The copied file is committed to git (public/pdf.worker.min.mjs is NOT
// gitignored) rather than left to be regenerated at deploy time: Vercel's
// build container did not reliably run this project's own postinstall
// script, which silently left the worker file missing from the deployed
// static assets and broke the viewer with a 404 for /pdf.worker.min.mjs
// (as opposed to the CSP failure this script exists to avoid in the first
// place). Running this script locally after bumping pdfjs-dist keeps the
// committed copy in sync; nothing depends on it running automatically
// during install anymore.
const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, "..", "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const destDir = join(root, "..", "public");
const dest = join(destDir, "pdf.worker.min.mjs");

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`Copied pdfjs-dist worker -> ${dest}`);
