## Stage 1

### POST /api/v1/events

{
"eventType": "login",
"userId": "7eb95d23-074e-4aed-be8c-c8d41ebe3a9f",
"payload": {
"tokenId": "<uuid>",
"message": "User succesfully logged in"
},
"timestamp": "2026-05-02T10:00:00Z"
}

this is how the post request for any event is designed, i generalized every types of notifications or occurances in the app/server as events.

### GET /api/v1/users/:userId/notifications

{
"notifications": [
{
"id": "<uuid>",
"eventType": "login notification",
"title": "User Authentication",
"message": "User has been authenticated to access.",
"payload": { "userId": "...", "token": 100x123xx08 },
"isRead": false,
"createdAt": "2026-05-02T10:00:00Z"
}
],
"unreadCount": 3
}

core notification that shall be fetched upon success from the webhook that will be deployed on the Edge servers across world.
the reason for edge servers is due to it being present across the world in all major geo locations for least latency.
also because compared to SSE (server sent events) or polling, i have real experience working with edge deployed notification and email services that are as low-latent as possible

### POST to registered webhook URL

{
"id": "<webhook-event-uuid>",
"eventType": "hook.created",
"timestamp": "2026-05-02T10:00:00Z",
"data": {
"userId": "...",
"tokenId": "...",
}
}

upon any login this will be evoked for thorough checking and revision on 0auth and relevent services.

### Headers on the webhook POST

X-Webhook-Signature: sha256=<hmac>
X-Webhook-Event: user.logged.in
X-Webhook-ID: <uuid>
Content-Type: application/json

a simple header for the webhook that will be responsible for re-verifying and dispatching real time notifications that are able enough to scale more than mentioned.

### FLow example

1. User calls POST /api/v1/auth on main service
2. Main service fires POST /api/v1/events to edge server for each succesful attempt
3. Edge server:
   a. Stores notification in user's inbox (for login display)
   b. Finds matching webhook subscriptions for "user.logged.in"
   c. Async delivers POST to each registered webhook URL with HMAC signature
4. User logs in → GET /api/v1/users/:id/notifications → notification fired to the device

## Stage 2

### DB of choice

based on requirement, the database of choice for initial scales would be postgreSQL with pgbouncer for pooled connections capable enough for scaling well above most enterprises can hit for a long time.
even so, upon scaling we can start horizontal scaling by distributing the databases based on nodes and hashes, partitioning, shards, shared_buffers, read replicas and offloading strategies. Its a large topic on its own, even though i want to write a long para on this!

for stage 1, the default choice for notifs would also be nosql dbs like cassandra, mongodb that can scale well above with trade offs being non relational (rows and cols) but i preferred postgresQL because its battle-tested and works well everytime. (Latest Jargon and Hype <<< battle tested enterprise software with decades of exp)

### db schema - SQL

`notifs table`
CREATE TABLE notifications (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID NOT NULL,
event_type VARCHAR(100) NOT NULL,
title VARCHAR(255) NOT NULL,
message TEXT NOT NULL,
payload JSONB NOT NULL DEFAULT '{}',
is_read BOOLEAN NOT NULL DEFAULT FALSE,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notif_user_id ON notifications(user_id);
CREATE INDEX idx_notif_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notif_created_desc ON notifications(created_at DESC);

`webhook subscription for each connected clients`
CREATE TABLE webhook_subscriptions (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID NOT NULL,
url VARCHAR(2048) NOT NULL,
subscribed_events TEXT[] NOT NULL DEFAULT '{}',
hmac_secret VARCHAR(255) NOT NULL,
is_active BOOLEAN NOT NULL DEFAULT TRUE,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_webhook_user ON webhook_subscriptions(user_id);
CREATE INDEX idx_webhook_active ON webhook_subscriptions(is_active);

`webhook tracking`
CREATE TABLE webhook_deliveries (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
event_type VARCHAR(100) NOT NULL,
delivery_payload JSONB NOT NULL,
status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | delivered | failed | retrying
response_status_code INTEGER,
response_body TEXT,
attempts INTEGER NOT NULL DEFAULT 0,
max_attempts INTEGER NOT NULL DEFAULT 5,
next_retry_at TIMESTAMPTZ,
delivered_at TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_delivery_status ON webhook_deliveries(status);
CREATE INDEX idx_delivery_retry ON webhook_deliveries(next_retry_at) WHERE status = 'pending';

## stage 3

The database does a full table scan of 500K rows, filters in memory, then sorts — all in RAM/disk. No index means O(n) every time.

### changes

CREATE INDEX idx_notif_student_unread_created
ON notification(studentId, isRead, createdAt DESC);

## what is does

1. Seek directly to studentId = 1042
2. Filter isRead = false within that range
3. Return already sorted by createdAt DESC

### Is "add index on every column" accurate?

No, that's bad advice. Indexes on every column:

- Slows every INSERT/UPDATE/DELETE (each index must be updated on write)
- Wastes disk space
- The optimizer may still pick the wrong one
- we need the targeted composite indexes that match actual query patterns
  Rule of thumb for remembbering: one composite index per query pattern, not one per column

### Query: students with placement notifications in last 7 days

SELECT DISTINCT studentId
FROM notification
WHERE notification_type = 'placement'
AND createdAt >= NOW() - INTERVAL '7 days';

and if indexed then:
CREATE INDEX idx_notif_type_created
ON notification(notification_type, createdAt DESC);

## stage 4

the notification being fetched on each page loads needs to be done with two things primarily:

- cache the notif if successfully trigged/fired to the client once.
- make sure `isRead` is idempotent or update the schema to have a idempotent field that tracks the occurances of that notification to ensure its not fired upon load again.
- simultaneously, delete older notifications after idemptotent field is filled/updated to not risk the "500000 notifs" loaded issues
- intermittent cleaning via bash script for each distrubuted or vertically scaled pgsql instance is a good practice!

as for tradeoffs, this method just gets the jobs done, but critically speaking:

- delays/late updates for the idempotent field, also to solve this create a redis cluster with instances that keep track for updating idempotent field and update them later

## stage 5

when hr clicked notif_all, the first was that assuming its a express server which is single-threaded event-loop, it is bound to fail, matter of fact not only 200, but around 1000s should fail.
some ways i can think of saving this:

- asynchronous post requests
- use of better frameworks than express, (go/gin, rust, java) that can handle multi threaded channels that can dsitribute the tasks efficiently
- no need to do sequential for loops, fetch the total students, divide into mini batches then send then with a distributed event processing engine like apache kafka, bullmq that can asynchronously process and batch out events faster than express ever can!
- as for the failed 200 students, due to the idempotent field, retries + batch processing needs to be handled carefully.
- the processing of saving to db at the same time should'nt happen if the db is not distributed across cluster, channels will be filled and cause breakout and circuit breaking techniques needs to be applied
- i suggest, using the redis cluster i mentioned to fan-in and fan-out the db writes needed.

### code

def async notify_all(batch_id, message, batch_len):
for i in range(batch_len):
res = await sendEmail(batch_id, message, kafka_id) -- kafka will handle the db updation via redis cluster
if (res):
push_to\_\_app(message, batch_id)

## stage 6

we can maintain an index or a instance that keeps updating the list of top 10 efficiently with polling calls in repeated intervals
