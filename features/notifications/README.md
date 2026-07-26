# Feature: notifications

In-app notification inbox for existing `Notification` rows.

- Queries: list + unread count (Prisma, server-only)
- Actions: mark one / mark all read (revalidates header layout)
- UI: `/notifications`, header bell dropdown + badge, mark all as read

Writes still happen from rental / verification flows via `buildInAppNotificationData`.
