# Part 3 — Review and Critique: thinktac.com

I audited multiple pages on **thinktac.com** (Home, Programmes, Schools, and About Us) under desktop and mobile viewports. Below are three platform engineering observations:

### 1. Site-Wide WhatsApp Widget Error Loop
- **Issue**: On every single page, the WhatsApp chat widget (`whatsapp-widget.min.js`) throws a `TypeError: Cannot read properties of undefined (reading 'options')` continuously.
- **Impact**: Although the widget is visually functional and responsive to user interactions, this infinite console error loop creates continuous CPU overhead and thread congestion, draining client device battery.
- **Recommendation**: Upgrade the extension or replace it with a lightweight, native chat integration.

### 2. Cross-Origin Frame Security Warnings
- **Issue**: Subpages (Programmes, Schools, About) throw a `SecurityError: Blocked a frame with origin...` exception.
- **Impact**: This happens because third-party analytics and tracking scripts attempt to read properties from window frames cross-origin. Unsecured scripts failing security checks can stop the execution of subsequent scripts in the main event loop.
- **Recommendation**: Audit third-party frames and configure scripts to communicate using safe, standardized messaging interfaces (`window.postMessage`).

### 3. Excess Third-Party Script Page Weight
- **Issue**: Multiple Shopify plugins inject heavy external scripts synchronously.
- **Impact**: While responsive styles stack correctly and the mobile hamburger menu responds instantly on click, synchronous scripts increase Total Blocking Time (TBT), delaying the time it takes for a page to become fully interactive on low-tier mobile devices.
- **Recommendation**: Perform a dependency audit to prune unused extensions. Use the `defer` or `async` attribute for all non-critical third-party integrations.
