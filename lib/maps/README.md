# Maps (Phase 8)

Google Maps loads **only** via dynamic import when the user clicks:

- “Choose location on map” (seller listing form)
- “View on map” (listing detail)

Never import map modules from layouts or the homepage.

Requires `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
