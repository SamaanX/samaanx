# Maps (OpenStreetMap + Geoapify)

Leaflet map tiles come from OpenStreetMap. Address search and geocoding use Geoapify.

- Set `NEXT_PUBLIC_GEOAPIFY_API_KEY` in `.env.local`
- Map components are lazy-loaded — never import from root layout
- Seller picker: `LazyLocationPicker` / `LocationPicker`
- Buyer detail: `LazyListingMap` / `ListingMap`
- Search browse: `ListingsBrowseMap`
