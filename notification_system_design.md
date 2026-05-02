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
