# Browser warning investigation

## Next.js smooth-scroll warning

The project intentionally declares `scroll-behavior: smooth` on the global `<html>` element in `src/app/globals.css`.

The app-owned warning is fixed at the single global root element:

```tsx
<html lang="en" dir="ltr" data-scroll-behavior="smooth">
```

Smooth scrolling remains enabled; reduced-motion CSS still disables it for users who request reduced motion.

## Message-channel error

Reported message:

```text
Uncaught (in promise) Error: A listener indicated an asynchronous response by
returning true, but the message channel closed before a response was received
```

Repository searches found no `chrome.runtime`, `chrome.runtime.onMessage`, `browser.runtime`, extension `sendMessage`, or asynchronous browser-extension message listener. The app's `MessageProvider` uses a normal DOM `CustomEvent`; it is unrelated to Chrome extension message channels.

Therefore there is no evidence of an application listener that could produce this error, and no application try/catch or fake response code was added.

A clean headless-Chrome smoke test with extensions disabled produced neither this message nor any other application console warning/error on the tested valid routes. This strengthens the extension-source diagnosis without pretending to identify a specific installed extension.

The likely source is a Chrome extension. Confirm it in the affected browser by:

1. Expand the console error and inspect its first stack frame. A `chrome-extension://<extension-id>/...` URL identifies the extension.
2. Open the same page in an Incognito window with extensions disabled.
3. If the message disappears, enable extensions individually to identify the source.

This conclusion is based on repository provenance. A specific extension cannot be named without the original browser stack trace or an extension-disabled reproduction.

## Reproducible browser check

With the development server running, `npm run smoke -- http://localhost:3000` launches an extension-free Chrome profile and records console errors, failed responses, redirects, image failures, responsive overflow, English/Arabic direction, core performance timings, and security headers. Pass a different local URL when the server uses another port.
