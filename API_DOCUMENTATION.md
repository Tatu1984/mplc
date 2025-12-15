# SRGG Marketplace API Documentation

## Overview

The SRGG Marketplace API provides RESTful endpoints for managing producers, listings, orders, payments, and more. All API responses follow a consistent format.

## Base URL

```
Development: http://localhost:3005/api
Production: https://your-domain.com/api
```
hello
## Response Format

All API responses follow this structure:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

## Authentication

Most endpoints require authentication via JWT token.

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "User Name",
      "role": "PRODUCER"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Using the Token

Include the token in the Authorization header:

```http
Authorization: Bearer <token>
```

Or send it as a cookie named `token`.

---

## Producers API

### List Producers

```http
GET /api/producers?page=1&limit=20&status=VERIFIED&type=FARMER&search=john
Authorization: Bearer <token>
```

Query Parameters:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `status` (string): Filter by verification status (PENDING, VERIFIED, REJECTED)
- `type` (string): Filter by producer type (FARMER, MINER, ARTISAN, COOPERATIVE, ENVIRONMENTAL)
- `search` (string): Search by name, email, phone, or SRGG EID

### Get Single Producer

```http
GET /api/producers/:id
Authorization: Bearer <token>
```

### Create Producer

```http
POST /api/producers
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+233123456789",
  "country": "GH",
  "region": "Ashanti",
  "city": "Kumasi",
  "idType": "national_id",
  "idNumber": "GHA-123456789",
  "producerType": "FARMER",
  "commodities": ["Cocoa", "Coffee"],
  "parcels": [
    {
      "name": "Main Farm",
      "size": 10,
      "unit": "hectares",
      "location": "Near Kumasi"
    }
  ]
}
```

Required Fields:
- `fullName` (string): Full legal name
- `email` (string): Email address
- `phone` (string): Phone number
- `country` (string): Country code (GH, DR)
- `region` (string): Region/state
- `city` (string): City/town
- `idType` (string): ID document type
- `idNumber` (string): ID document number
- `producerType` (string): Producer category
- `commodities` (array): List of commodities

### Update Producer

```http
PUT /api/producers/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "John Doe Updated",
  "phone": "+233987654321"
}
```

### Verify Producer (Admin Only)

```http
PATCH /api/producers/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "verificationStatus": "VERIFIED",
  "rating": 4.5
}
```

### Delete Producer (Admin Only)

```http
DELETE /api/producers/:id
Authorization: Bearer <token>
```

---

## Listings API

### List Listings

```http
GET /api/listings?page=1&limit=20&status=ACTIVE&commodityId=xxx&search=cocoa
```

Query Parameters:
- `page` (number): Page number
- `limit` (number): Items per page
- `status` (string): DRAFT, PENDING, ACTIVE, SOLD, CANCELLED
- `commodityId` (string): Filter by commodity
- `producerId` (string): Filter by producer
- `minPrice` (number): Minimum price per unit
- `maxPrice` (number): Maximum price per unit
- `search` (string): Search in title and description

### Get Single Listing

```http
GET /api/listings/:id
```

### Create Listing

```http
POST /api/listings
Authorization: Bearer <token>
Content-Type: application/json

{
  "commodityId": "commodity-id",
  "title": "Premium Cocoa Beans - Grade A",
  "description": "High quality cocoa beans from Ashanti region",
  "quantity": 1000,
  "unit": "kg",
  "pricePerUnit": 5.50,
  "currency": "USD",
  "location": {
    "country": "Ghana",
    "region": "Ashanti",
    "city": "Kumasi"
  },
  "images": ["https://example.com/image1.jpg"],
  "status": "DRAFT"
}
```

### Update Listing

```http
PUT /api/listings/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "quantity": 900,
  "pricePerUnit": 6.00
}
```

### Update Listing Status

```http
PATCH /api/listings/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "ACTIVE"
}
```

### Delete Listing

```http
DELETE /api/listings/:id
Authorization: Bearer <token>
```

---

## Orders API

### List Orders

```http
GET /api/orders?page=1&limit=20&status=PENDING&paymentStatus=PENDING
Authorization: Bearer <token>
```

Query Parameters:
- `status` (string): PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, COMPLETED, CANCELLED
- `paymentStatus` (string): PENDING, PROCESSING, COMPLETED, FAILED, REFUNDED
- `startDate` (string): Filter orders from date (ISO format)
- `endDate` (string): Filter orders to date (ISO format)

### Get Single Order

```http
GET /api/orders/:id
Authorization: Bearer <token>
```

### Create Order

```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "listingId": "listing-id",
  "quantity": 100,
  "shippingAddress": {
    "country": "Ghana",
    "region": "Greater Accra",
    "city": "Accra",
    "address": "123 Main Street",
    "contactName": "Jane Buyer",
    "contactPhone": "+233111222333"
  },
  "notes": "Please pack carefully"
}
```

### Update Order

```http
PUT /api/orders/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "SHIPPED",
  "trackingNumber": "TRACK123456"
}
```

### Order Actions

```http
PATCH /api/orders/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "confirm"
}
```

Available actions:
- `confirm` - Producer confirms the order
- `ship` - Mark as shipped
- `deliver` - Mark as delivered
- `cancel` - Cancel the order

### Delete Order

```http
DELETE /api/orders/:id
Authorization: Bearer <token>
```

Only pending orders without payments can be deleted.

---

## Payments API

### List Payments

```http
GET /api/payments?page=1&limit=20&status=COMPLETED&orderId=xxx
Authorization: Bearer <token>
```

### Create Payment

```http
POST /api/payments
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "order-id",
  "amount": 550.00,
  "currency": "USD",
  "method": "CARD",
  "metadata": {
    "cardLast4": "4242"
  }
}
```

Payment Methods:
- `CARD` - Credit/Debit card (Stripe)
- `BANK_TRANSFER` - Bank transfer (pending verification)
- `MOBILE_MONEY` - Mobile money (MTN, Vodafone, etc.)
- `CRYPTO` - Cryptocurrency
- `ESCROW` - Escrow payment

---

## Commodities API

### List Commodities

```http
GET /api/commodities
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "commodity-id",
      "name": "Cocoa",
      "category": "Agriculture",
      "unit": "kg",
      "description": "Cocoa beans"
    }
  ]
}
```

---

## Dashboard API

### Get Dashboard Statistics

```http
GET /api/dashboard/stats
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "producers": {
      "total": 150,
      "verified": 120,
      "pending": 25,
      "rejected": 5
    },
    "listings": {
      "total": 450,
      "active": 380,
      "totalValue": 2500000
    },
    "orders": {
      "total": 1200,
      "pending": 45,
      "completed": 980,
      "revenue": 1800000
    },
    "tokens": {
      "total": 300,
      "active": 280,
      "minted": 280
    },
    "recentOrders": [...],
    "topCommodities": [...]
  }
}
```

---

## Tokenization API

### Tokenize a Listing

```http
POST /api/tokenization
Authorization: Bearer <token>
Content-Type: application/json

{
  "listingId": "listing-id",
  "tokenType": "NFT"
}
```

Token Types:
- `NFT` - Non-fungible token (unique asset)
- `FUNGIBLE` - Fungible token (divisible)

---

## Insurance API

### List Insurance Policies

```http
GET /api/insurance?page=1&limit=20
Authorization: Bearer <token>
```

### Create Insurance Policy

```http
POST /api/insurance
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "CROP",
  "assetId": "listing-id",
  "assetType": "LISTING",
  "coverageAmount": 10000,
  "currency": "USD",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
```

Insurance Types:
- `CROP` - Crop insurance
- `LIVESTOCK` - Livestock mortality
- `SHIPPING` - Shipping/maritime
- `MINERAL` - Mineral extraction
- `CARBON` - Carbon credit authenticity
- `CULTURAL_IP` - Cultural heritage & IP

---

## Hedging API

### List Hedge Positions

```http
GET /api/hedging?page=1&limit=20
Authorization: Bearer <token>
```

### Create Hedge Position

```http
POST /api/hedging
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "FUTURES",
  "commodity": "Cocoa",
  "quantity": 1000,
  "unit": "kg",
  "strikePrice": 5.50,
  "currency": "USD",
  "expiryDate": "2024-06-30",
  "direction": "LONG"
}
```

Hedge Types:
- `FORWARD` - Forward contract
- `FUTURES` - Futures contract
- `OPTIONS` - Options contract
- `SWAP` - Swap contract

Direction:
- `LONG` - Buy position
- `SHORT` - Sell position

---

## Health Check

```http
GET /api/health
```

Response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Invalid input data |
| `CONFLICT` | Resource conflict |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INTERNAL_ERROR` | Server error |

---

## Rate Limiting

- **Limit**: 100 requests per minute per IP
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`

---

## Roles & Permissions

| Role | Description |
|------|-------------|
| `SUPER_ADMIN` | Full system access |
| `TENANT_ADMIN` | Tenant-level administration |
| `PRODUCER` | Create listings, manage own profile |
| `BUYER` | Browse listings, create orders |
| `BROKER` | Manage listings and orders |
| `VALIDATOR` | Verify producers and certificates |
| `FINANCE` | Manage payments and finances |
| `AUDITOR` | Read-only audit access |

---

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@srgg.com | Admin123! |
| Producer | producer@srgg.com | Producer123! |
| Buyer | buyer@srgg.com | Buyer123! |

---

## SDK / Client Library

See `/src/lib/api-client.ts` for a TypeScript client library that can be used in frontend applications.

Example:
```typescript
import { apiClient } from '@/lib/api-client';

// Login
await apiClient.login('user@example.com', 'password');

// Get listings
const listings = await apiClient.getListings({ status: 'ACTIVE' });

// Create order
const order = await apiClient.createOrder({
  listingId: 'listing-id',
  quantity: 100
});
```

---

## Changelog

### v1.0.0 (2024)
- Initial release
- Producer, Listing, Order CRUD
- Payment processing
- Tokenization support
- Insurance & Hedging APIs
- Dashboard statistics

---

## Maintenance Endpoints (Cron Jobs)

These endpoints handle background maintenance tasks. They can be triggered manually or via external cron services.

### Cleanup Endpoint

```http
GET /api/cron/cleanup
Authorization: Bearer <CRON_SECRET>
```

Performs cleanup tasks:
- Deletes expired sessions
- Removes old read notifications (30+ days)
- Expires stale draft listings (90+ days)
- Cleans up old analytics events (1+ year)

### Notifications Endpoint

```http
GET /api/cron/notifications
Authorization: Bearer <CRON_SECRET>
```

Processes pending notifications:
- Order payment reminders (pending 24+ hours)
- Shipment arrival alerts
- Insurance policy expiry warnings
- Hedge position expiry notifications

### External Cron Services

Since Vercel's free plan doesn't support cron jobs, use one of these free alternatives:

1. **cron-job.org** - Free, reliable, 1-minute intervals
2. **EasyCron** - Free tier available
3. **GitHub Actions** - Use scheduled workflows to hit your endpoints

Example cron-job.org setup:
- URL: `https://your-app.vercel.app/api/cron/cleanup`
- Schedule: Daily at 2:00 AM
- HTTP Method: GET
- Headers: `Authorization: Bearer YOUR_CRON_SECRET`

Set `CRON_SECRET` in your Vercel environment variables to secure these endpoints
