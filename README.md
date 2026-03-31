# SwiftPick API — Backend

**School Pickup & Bus Tracking System with AI Dismissal Agent**

## Tech Stack
- **Framework:** Laravel (PHP)
- **Database:** MySQL (Azure Database for MySQL)
- **Cloud:** Microsoft Azure App Service
- **Real-time:** Socket.IO for live bus tracking & status updates
- **Geofencing:** Google Maps Geofencing API
- **AI:** Flowise (orchestration) + Azure OpenAI Service (NLP)

## Requirements
- PHP 8.1+ with Composer
- MySQL 8.0+
- Node.js 18+ (for Socket.IO server)
- Google Maps API Key

## Setup

1. **Database**: Import `migrations/001_create_tables.sql` into MySQL
2. **Config**: Update `config/database.php` with your Azure MySQL credentials
3. **Environment**: Set your API keys:
   - `GOOGLE_MAPS_API_KEY` — for geofencing
   - `JWT_SECRET` — for token signing
4. **Test**: Visit `http://localhost/swiftpick-api/api`

## Admin
- **Email**: `******`
- **Password**: `*******`

## API Base URL
```
# Local Development
http://localhost/swiftpick-api/api

# Azure Production
***********************
```

## Authentication
All protected routes require:
```
Authorization: Bearer <JWT_TOKEN>
```

## Real-time Events (Socket.IO)
```
busLocationUpdate  — Driver emits GPS coordinates
pickupStatusChange — Teacher/Driver emits status updates
parentNotification — Server pushes alerts to parent
```

## Endpoints Summary

| Group | Prefix | Role |
|-------|--------|------|
| Auth | `/api/auth/*` | Public |
| Parent | `/api/parent/*` | parent |
| Teacher | `/api/teacher/*` | teacher |
| Driver | `/api/driver/*` | driver |
| Admin | `/api/admin/*` | admin |
