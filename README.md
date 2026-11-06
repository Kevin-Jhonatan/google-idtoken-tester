# Google ID Token Tester

A static page to generate and decode Google ID tokens for testing login flows without a backend.

## Quick Start

1. Add your **Google OAuth 2.0 Client ID** (must allow the current origin).
2. Sign in with Google.
3. Decode & verify the `idToken` payload, claims, and expiry.

> Note: Requires a valid server origin. Cannot run with `file://`.

## Usage on GitHub Pages

1. Push to any repository.
2. Add a **GitHub Pages** source (Branch/main or custom).
3. This project has no build steps—just verify that `index.html`, `style.css`, and `script.js` are present.

## How it works

- Reads the current origin as an **authorized JavaScript origin** in your OAuth Client.
- Initializes Google Identity Services to render a sign‑ button.
- Decodes JWT payloads and displays claims (email, name, sub, aud, iss) + remaining expiry time.

## License

MIT
