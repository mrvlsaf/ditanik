# Gotenberg — self-hosted Excel → PDF conversion

Ditanik's "Convert to PDF" feature needs a real spreadsheet engine
(LibreOffice) to render an `.xlsx` file to PDF, which Vercel's serverless
functions can't run. [Gotenberg](https://gotenberg.dev/) is an open-source
Docker service that wraps LibreOffice behind a small HTTP API — this folder
stands one up on any small always-on VM.

**Cost:** roughly $5–6/month for the smallest VM at Hetzner, DigitalOcean, or
similar (1 vCPU / 1–2GB RAM is plenty for occasional document conversion).

Gotenberg's HTTP API has **no built-in authentication** — anyone who can
reach it can convert arbitrary files, which is a real abuse/DoS risk if it's
open to the internet. This setup puts [Caddy](https://caddyserver.com/) in
front of it for automatic HTTPS + Basic Auth, and Gotenberg itself is never
bound to a host port — only Caddy can reach it, over Docker's internal
network.

## One-time setup

1. **Get a small VM** (Hetzner CX22, DigitalOcean $6 droplet, etc.) with
   Docker and the Docker Compose plugin installed.
2. **Point a subdomain at it** — e.g. `gotenberg.yourcompany.com` — an A
   record to the VM's IP. Caddy needs this for its automatic Let's Encrypt
   certificate; a bare IP address won't get you HTTPS.
3. **Pick a username and password** for Basic Auth, then hash the password
   with Caddy's own tool (no need to install anything extra — Caddy ships
   inside the image already used below):

   ```bash
   docker run --rm caddy:2-alpine caddy hash-password --plaintext 'your-chosen-password'
   ```

   Copy the bcrypt hash it prints out — that's `GOTENBERG_BASIC_AUTH_HASH`
   below. Caddy only ever stores/checks the hash; nowhere does the plaintext
   password get written to disk on the VM.

4. **Copy this folder to the VM** (`infra/gotenberg/`) and create a `.env`
   file next to `docker-compose.yml`:

   ```env
   GOTENBERG_DOMAIN=gotenberg.yourcompany.com
   GOTENBERG_BASIC_AUTH_USER=ditanik
   GOTENBERG_BASIC_AUTH_HASH=$2a$14$...   # the hash from step 3, quote it if your shell mangles the $ signs
   ```

5. **Start it:**

   ```bash
   docker compose up -d
   ```

   Give Caddy a minute to issue its certificate, then confirm it's up:

   ```bash
   curl -u ditanik:your-chosen-password https://gotenberg.yourcompany.com/health
   ```

## Wiring it into Ditanik

Set these in Vercel's environment variables (and your local `.env` if you
want to test conversion locally):

```env
GOTENBERG_URL=https://gotenberg.yourcompany.com
GOTENBERG_BASIC_AUTH_USER=ditanik
GOTENBERG_BASIC_AUTH_PASSWORD=your-chosen-password   # the PLAINTEXT password, not the hash
```

`GOTENBERG_URL` has no trailing slash requirement either way —
`modules/documents/infrastructure/pdf-conversion.ts` normalizes it. Once
these are set, both "Convert to PDF" on a generated document and the
standalone `/documents/convert` upload-and-convert page will work; until
then, both surface a clear "PDF conversion isn't set up yet" error instead of
failing silently.

## Upgrading Gotenberg

Bump the pinned tag in `docker-compose.yml` (`gotenberg/gotenberg:8`) and
re-run `docker compose pull && docker compose up -d` — check
[Gotenberg's release notes](https://github.com/gotenberg/gotenberg/releases)
first for breaking API changes.
