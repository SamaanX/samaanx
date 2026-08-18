# Feature: notifications

In-app notification inbox for existing `Notification` rows.

- Queries: list + unread count (Prisma, server-only)
- Actions: mark one / mark all read (revalidates header layout)
- UI: `/notifications`, header bell dropdown + badge, mark all as read
- Push: `public/sw.js`, `lib/push/send.ts`, subscription actions, settings toggle

Writes still happen from rental / verification / chat flows via `buildInAppNotificationData`.
Email and push fan-out uses `scheduleChannelDelivery` in `services/dispatch.ts` (async, non-blocking).
