# Security

This application renders a local illustrated world. It does not require API keys,
send microphone audio, or connect to an AI service at runtime. Artwork is served
as local static files. Do not put credentials or private recordings in public/.

Use GitHub private vulnerability reporting when available. Do not post passwords,
tokens, personal recordings or private logs in public issues. Dependencies are
locked in package-lock.json; install with npm ci and review security updates.

The Vite development server is for local development. Deploy the production dist/
bundle using a static host; do not expose a development server as production.
