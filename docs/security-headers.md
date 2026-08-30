# Security headers

The application generates a fresh CSP nonce in middleware for every document
request and forwards the CSP request header so Next.js can attach that nonce to
its framework scripts and styles. Production `script-src` contains neither
`unsafe-inline` nor `unsafe-eval`; development alone permits `unsafe-eval` for
Next.js Fast Refresh.

Next.js 15's development overlay is an exception: its bundled
`devtool-style-inject.js` and `font-styles.tsx` create `<style>` elements at
runtime without exposing a nonce hook to the application. Development therefore
uses `style-src-elem 'self' 'unsafe-inline'` so the Next error overlay and Fast
Refresh UI render correctly. This exception is not emitted by `next start` or a
deployed production build. Production `style-src-elem` accepts only same-origin
stylesheets plus style elements carrying the current request nonce or the exact
framework hash described below. `script-src` never receives `unsafe-inline`.

`style-src-attr 'unsafe-inline'` is deliberately narrow. Existing React
components calculate chart widths, animation delays, and heights using style
attributes, so blocking style attributes would break those features. It does
not permit inline script execution or authorize `<style>` elements because
`style-src-elem` is defined separately.

The single `style-src` SHA-256 hash allows Next.js 15.5.24's built-in 404
fallback style. It was captured from the browser violation and permits only
that exact static block; other unnonced style blocks remain blocked.

The CSP allows only application resources plus Sentry ingestion and public
Vercel Blob images. Frames and objects are denied. HSTS is emitted only for
HTTPS requests in a production runtime and intentionally omits `preload` until
the final production domain and every subdomain are confirmed HTTPS-only.

Test the deployed headers with browser developer tools and:

```powershell
curl.exe -I https://YOUR-STAGING-DOMAIN/
```

Verify `Content-Security-Policy`, `Strict-Transport-Security`,
`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and
`Permissions-Policy`, then exercise hydration, navigation, geolocation, image
loading, and Sentry delivery while watching for CSP violations.

If a development warning names a browser extension, reproduce it with
extensions disabled or in an Incognito window. Do not relax the production CSP
for extension-injected content.
