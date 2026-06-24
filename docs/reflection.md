# Part 4 — Short Reflection

### 1. MERN vs Firebase + TypeScript Transition
- **What felt familiar**: Building React components, setting up an Express backend, and interacting with a document-based NoSQL database (Firestore feels structurally similar to MongoDB).
- **What felt different**: Shifting from custom backend database drivers (Mongoose) and custom session/JWT middleware to Firebase's out-of-the-box Client Auth SDK and Server Admin SDK. Writing Firestore Security Rules was a new paradigm compared to checking user permissions directly in MongoDB controllers.
- **How I adapted**: I leveraged Firebase Emulators to replicate the entire environment locally without setup delays. I used TypeScript interfaces to align the schema of client-side reads with server-side writes, ensuring complete type safety across the database boundary.

### 2. Underestimated Platform Engineering Concern: Observability
Early-stage teams often underestimate **observability (logging, tracing, and metrics)**. Under pressure to deliver features, teams rely on console logs. Once in production, diagnosing issues (such as the infinite error loop observed in the thinktac.com review) becomes nearly impossible without structured logs and distributed tracing. 

A lack of real-time monitoring leads to:
- Delayed responses to user-facing bugs.
- Silent failures in background workers.
- Difficulties debugging performance bottlenecks (e.g., database lock contention or API latency).

Implementing structured logging (like Winston/Morgan) and application performance monitoring (APM) tools (like Sentry or Datadog) early in the development lifecycle prevents debugging blindspots and helps track down critical performance regressions before they impact users.
