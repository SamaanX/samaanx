# Rentals feature (Phase 5B)

Buyer request → seller approve/reject → conversation + in-app notifications.

## Server actions

- `createRentalRequestAction`
- `approveRentalRequestAction`
- `rejectRentalRequestAction`
- `cancelRentalRequestAction`
- `getBuyerRentalsAction`
- `getSellerRentalsAction`

## Routes

- `/rentals` — buyer dashboard
- `/seller/rentals` — seller request inbox
- `/chat/[id]` — conversation placeholder (messaging in Phase 6)
