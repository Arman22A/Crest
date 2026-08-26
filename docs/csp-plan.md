# CSP plan for GitHub Pages

GitHub Pages does not provide repository-controlled response headers. A meta CSP can
enforce many directives, but it cannot provide a real report-only phase and does not
support `frame-ancestors`. This branch therefore prepares the policy without enabling
it in production.

Candidate enforcement policy after browser and iPhone tests:

```text
default-src 'self';
base-uri 'self';
object-src 'none';
form-action 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self';
connect-src 'self' https://bclhwefsswxtqtwzppik.supabase.co wss://bclhwefsswxtqtwzppik.supabase.co;
manifest-src 'self';
worker-src 'self';
media-src 'self';
frame-src 'none';
upgrade-insecure-requests
```

`unsafe-eval` is not required and must not be added. `unsafe-inline` remains a tracked
technical debt because the current HTML has an inline pre-paint theme bootstrap and
the UI generates inline style attributes for user-selected colors. Removing both
patterns is required before tightening `script-src` and `style-src`.

Before adding a meta tag, test sign-in, token refresh, pull/push, photo data URLs,
offline navigation, Service Worker installation, and Web Push on desktop and the
installed iPhone PWA. Do not claim clickjacking protection from `frame-ancestors`
unless hosting later supports a real HTTP response header.
