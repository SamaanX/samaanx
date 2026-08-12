const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "SamaanX API",
    description:
      "REST API for the SamaanX rental marketplace. Most user flows also use Next.js Server Actions from the web UI; these HTTP routes expose the same underlying services for documentation and testing.\n\n**Authentication:** Sign in via the web app (`/login`). Session cookies from Supabase are sent automatically on same-origin requests. For Postman, authenticate in the browser first or use Supabase auth tokens with cookie forwarding.",
    version: "1.0.0",
    contact: {
      name: "SamaanX",
      url: appUrl,
    },
  },
  servers: [{ url: appUrl, description: "Current environment" }],
  tags: [
    { name: "Auth", description: "Session and profile" },
    { name: "Categories", description: "Listing categories" },
    { name: "Listings", description: "Browse and search listings" },
    { name: "Seller", description: "Seller listing management" },
    { name: "Wishlist", description: "Saved listings (favorites)" },
    { name: "Jobs", description: "Background cron jobs" },
    { name: "Testing", description: "Development-only utilities" },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "sb-access-token",
        description:
          "Supabase session cookie set after signing in at /login. Browser and same-origin fetch send this automatically.",
      },
      cronBearer: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "secret",
        description: "Bearer token matching CRON_SECRET environment variable.",
      },
    },
    schemas: {
      ApiError: {
        type: "object",
        properties: {
          ok: { type: "boolean", example: false },
          error: {
            type: "object",
            properties: {
              code: {
                type: "string",
                example: "UNAUTHORIZED",
              },
              message: { type: "string", example: "You must be signed in." },
            },
            required: ["code", "message"],
          },
        },
        required: ["ok", "error"],
      },
      Category: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "Electronics" },
          slug: { type: "string", example: "electronics" },
          icon: { type: "string", nullable: true },
          sortOrder: { type: "integer" },
        },
      },
      ListingCard: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          slug: { type: "string" },
          title: { type: "string" },
          city: { type: "string" },
          area: { type: "string", nullable: true },
          rentPriceAmount: { type: "number" },
          rentPriceUnit: { type: "string", enum: ["DAY", "WEEK", "MONTH"] },
          currency: { type: "string", example: "PKR" },
          isWishlisted: { type: "boolean" },
          category: {
            type: "object",
            properties: {
              name: { type: "string" },
              slug: { type: "string" },
            },
          },
        },
      },
      SearchResult: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/ListingCard" },
          },
          total: { type: "integer" },
          page: { type: "integer" },
          pageSize: { type: "integer" },
          totalPages: { type: "integer" },
        },
      },
      WishlistItem: {
        allOf: [{ $ref: "#/components/schemas/ListingCard" }],
      },
      SessionProfile: {
        type: "object",
        properties: {
          authenticated: { type: "boolean" },
          user: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "string", format: "uuid" },
              email: { type: "string", nullable: true },
            },
          },
          profile: {
            type: "object",
            nullable: true,
            properties: {
              id: { type: "string", format: "uuid" },
              displayName: { type: "string" },
              role: { type: "string" },
              avatarUrl: { type: "string", nullable: true },
            },
          },
        },
      },
    },
  },
  paths: {
    "/api/v1/auth/session": {
      get: {
        tags: ["Auth"],
        summary: "Get current session",
        description:
          "Returns whether the caller is authenticated and basic profile info. Uses Supabase session cookies.",
        responses: {
          "200": {
            description: "Session state",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/SessionProfile" },
                  },
                },
                examples: {
                  authenticated: {
                    value: {
                      ok: true,
                      data: {
                        authenticated: true,
                        user: {
                          id: "00000000-0000-0000-0000-000000000001",
                          email: "user@example.com",
                        },
                        profile: {
                          id: "00000000-0000-0000-0000-000000000001",
                          displayName: "Ali Khan",
                          role: "USER",
                          avatarUrl: null,
                        },
                      },
                    },
                  },
                  guest: {
                    value: {
                      ok: true,
                      data: { authenticated: false, user: null, profile: null },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/categories": {
      get: {
        tags: ["Categories"],
        summary: "List active categories",
        responses: {
          "200": {
            description: "Active categories",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Category" },
                    },
                  },
                },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
        },
      },
    },
    "/api/v1/listings": {
      get: {
        tags: ["Listings"],
        summary: "Search and filter public listings",
        parameters: [
          {
            name: "q",
            in: "query",
            schema: { type: "string" },
            description: "Text search",
          },
          {
            name: "category",
            in: "query",
            schema: { type: "string" },
            description: "Category slug",
          },
          {
            name: "city",
            in: "query",
            schema: { type: "string" },
          },
          {
            name: "sort",
            in: "query",
            schema: {
              type: "string",
              enum: ["recent", "price_asc", "price_desc", "nearest"],
            },
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "pageSize",
            in: "query",
            schema: { type: "integer", default: 24 },
          },
          {
            name: "nearLat",
            in: "query",
            schema: { type: "number" },
            description: "Latitude for nearest sort",
          },
          {
            name: "nearLng",
            in: "query",
            schema: { type: "number" },
            description: "Longitude for nearest sort",
          },
          {
            name: "radiusKm",
            in: "query",
            schema: { type: "number", default: 25 },
          },
        ],
        responses: {
          "200": {
            description: "Paginated listings",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/SearchResult" },
                  },
                },
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
        },
      },
    },
    "/api/v1/listings/{slug}": {
      get: {
        tags: ["Listings"],
        summary: "Get listing detail by slug",
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Listing detail",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean", example: true },
                    data: { type: "object" },
                  },
                },
              },
            },
          },
          "404": {
            description: "Listing not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
        },
      },
    },
    "/api/v1/wishlist": {
      get: {
        tags: ["Wishlist"],
        summary: "List saved listings (favorites)",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "q", in: "query", schema: { type: "string" } },
          {
            name: "sort",
            in: "query",
            schema: {
              type: "string",
              enum: ["recent", "price_asc", "price_desc", "title"],
              default: "recent",
            },
          },
        ],
        responses: {
          "200": {
            description: "Wishlist items",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean", example: true },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/WishlistItem" },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Not signed in",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
        },
      },
      post: {
        tags: ["Wishlist"],
        summary: "Add listing to wishlist",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["listingId"],
                properties: {
                  listingId: { type: "string", format: "uuid" },
                },
              },
              example: { listingId: "00000000-0000-0000-0000-000000000010" },
            },
          },
        },
        responses: {
          "201": {
            description: "Added to wishlist",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        wishlisted: { type: "boolean", example: true },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "404": { description: "Listing not found" },
        },
      },
    },
    "/api/v1/wishlist/{listingId}": {
      get: {
        tags: ["Wishlist"],
        summary: "Check if listing is favorited",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "listingId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Wishlist status",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        wishlisted: { type: "boolean" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
      delete: {
        tags: ["Wishlist"],
        summary: "Remove listing from wishlist",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "listingId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Removed from wishlist",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        wishlisted: { type: "boolean", example: false },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/seller/listings/{id}": {
      delete: {
        tags: ["Seller"],
        summary: "Delete (soft-delete) a seller listing",
        security: [{ cookieAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Listing deleted",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        success: { type: "boolean", example: true },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "404": { description: "Listing not found" },
        },
      },
    },
    "/api/cron/jobs": {
      get: {
        tags: ["Jobs"],
        summary: "Run due background jobs",
        security: [{ cronBearer: [] }],
        parameters: [
          {
            name: "mode",
            in: "query",
            schema: { type: "string", enum: ["due", "weekly"], default: "due" },
          },
        ],
        responses: {
          "200": { description: "Jobs processed" },
          "401": { description: "Invalid cron secret" },
        },
      },
      post: {
        tags: ["Jobs"],
        summary: "Run due background jobs (POST)",
        security: [{ cronBearer: [] }],
        parameters: [
          {
            name: "mode",
            in: "query",
            schema: { type: "string", enum: ["due", "weekly"], default: "due" },
          },
        ],
        responses: {
          "200": { description: "Jobs processed" },
          "401": { description: "Invalid cron secret" },
        },
      },
    },
    "/api/test/sentry-error": {
      get: {
        tags: ["Testing"],
        summary: "Trigger a test error for Sentry (development only)",
        description:
          "Throws a real error captured by Sentry. Disabled in production unless ENABLE_SENTRY_TEST=1 and Authorization Bearer matches CRON_SECRET.",
        responses: {
          "500": { description: "Intentional test error" },
          "404": { description: "Disabled in production" },
        },
      },
    },
  },
};
