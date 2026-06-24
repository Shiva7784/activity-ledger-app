# Part 2 — Written Explanation

### Data Structure Rationale
I chose a flat root-level `events` collection where each document contains `userId`, `eventType`, `timestamp`, and an optional `metadata` object. 
- **Query Efficiency**: Since our primary access pattern is fetching the last 10 events for a specific user, Firestore can execute this instantly using an index on `(userId, timestamp DESC)`. 
- **Security**: Flat collections work seamlessly with Firestore Security Rules, allowing us to enforce that a user can only read events where `resource.data.userId == request.auth.uid` while keeping writes entirely disabled from the client.

### Scaling to Millions of Events
If volume scaled to millions of documents per user, we would run into high storage costs and potential write throughput bottlenecks. To resolve this:
1. **TTL and Archiving**: Set a Time-to-Live (TTL) on the `events` collection to auto-delete documents older than, say, 30 days. Prior to deletion, export older logs in batches to cold storage (e.g., Google Cloud Storage as compressed JSON/Parquet) for auditing.
2. **Write Queueing**: Instead of writing directly from the Express API to Firestore synchronously, we would push events to a message broker (e.g., Google Cloud Pub/Sub) and process them asynchronously via a worker pool or serverless functions to absorb write spikes.
3. **Partitioning/Subcollections**: Group events by month (e.g., `events_2026_06`) or shift to user subcollections (`/users/{userId}/events/{eventId}`) to reduce partition hotspotting on index keys.

### Production Improvements
For a production system, I would implement **event hashing and ledger chaining**. Each new event would store the cryptographic SHA-256 hash of the previous event's payload + its own payload. This creates a tamper-evident audit trail, ensuring that even administrators with database access cannot modify or delete past activities without breaking the validation chain.

### Shortcuts Taken
- **API Validation**: The server-side `/api/events` endpoint checks basic types but lacks rigorous JSON schema validation (e.g., using Zod) to restrict metadata structure.
- **Error Resiliency**: If Firestore is temporarily down, the API server will return a 500 error instead of caching events locally in Redis or retrying. A production system would employ an offline queue.
