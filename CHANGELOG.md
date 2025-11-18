# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.0] - 2025-11-18

### Added - VPS OCR Service Deployment (Phase 2 - Document Intelligence)

#### VPS Production Deployment

- **VPS Setup Script:** Automated installation for Debian (`vps-ocr-service/setup-debian.sh`)
  - Debian Bookworm compatible (Python 3.11)
  - Auto-detects repository path (`/root/Kairo/` via Syncthing)
  - System dependencies: python3, poppler-utils, libgl1, libglib2.0-0
  - Creates `ocruser` service account with restricted permissions
  - Python virtual environment with isolated dependencies
  - Systemd service installation and configuration
  - Clean `.env` file creation from template
  - Total setup time: ~15-20 minutes (includes model downloads)

- **Environment Configuration:** Production-ready settings (`vps-ocr-service/.env.example`)
  - No inline comments (Pydantic-compatible format)
  - Database connection via Supabase connection pooler (port 5432)
  - OCR settings: Spanish/English, CPU-only, single-document processing
  - Embeddings: 384d multilingual model, CPU device, batch size 8
  - Queue polling: 5-second intervals, 3 max retries, 15-minute timeout
  - Logging: INFO level, file rotation, 10-day retention
  - Webhook support (disabled by default)

- **Systemd Service:** Production service management (`vps-ocr-service/ocr-service.service`)
  - Runs as `ocruser` (non-root security)
  - Working directory: `/opt/kairo/vps-ocr-service`
  - Pydantic reads `.env` directly (removed systemd EnvironmentFile to avoid inline comment issues)
  - Auto-restart on failure with 10-second delay
  - Resource limits: 6GB memory max
  - Journal logging for centralized log management
  - Enable on boot: `systemctl enable ocr-service`

- **Documentation:** Complete deployment guides
  - `vps-ocr-service/README.md` - Full service documentation
  - `vps-ocr-service/TESTING.md` - Step-by-step testing guide
  - `docs/architecture/vps-ocr-service.md` - Architecture documentation
  - Installation, configuration, monitoring, troubleshooting, scaling guides

#### VPS Service Features

- **OCR Processing:** PaddleOCR 2.7.3 + PaddlePaddle 2.6.1
  - Spanish and English text extraction
  - PDF support via pdf2image with poppler
  - Image processing: PNG, JPG, JPEG, TIFF
  - Processing time: ~5-10 seconds per page
  - Confidence filtering for quality results

- **Embeddings Generation:** sentence-transformers (paraphrase-multilingual-MiniLM-L12-v2)
  - 384-dimensional semantic vectors
  - Text chunking: 500 chars per chunk, 50 char overlap
  - Batch processing: 8 chunks at a time
  - Processing time: ~2-3 seconds per document
  - CPU-optimized for 2vCPU VPS

- **Queue Management:** PostgreSQL-based job queue
  - Row-level locking for multi-VPS support
  - Background polling every 5 seconds
  - Automatic retry on failure (max 3 attempts)
  - Job timeout handling (15 minutes)
  - Status tracking: queued → processing → completed/failed
  - Unique VPS instance IDs for distributed processing

- **API Endpoints:** FastAPI REST API (port 8000)
  - `GET /health` - Service health check with models status
  - `GET /api/queue/stats` - Queue statistics (queued/processing/completed/failed)
  - `GET /api/test/ocr` - OCR models test endpoint
  - `GET /api/test/embeddings` - Embeddings models test endpoint
  - All endpoints JSON-formatted

#### Deployment Process & Fixes

- **Initial Setup Issues Resolved:**
  1. **Python Version Compatibility** (Debian Bookworm uses Python 3.11, not 3.10)
     - Created Debian-specific setup script
     - Auto-detects Python version dynamically

  2. **Environment File Parsing** (Pydantic couldn't parse inline comments)
     - Removed all inline comments from `.env.example`
     - Moved comments to separate lines above each setting
     - Updated systemd service to let Pydantic read `.env` directly

  3. **Numpy Version Conflicts** (imgaug incompatible with numpy 2.x)
     - Pinned numpy to 1.26.4 (`numpy>=1.23.0,<2.0.0`)
     - Resolved dependency conflicts with scipy, opencv, contourpy
     - Ensured compatibility with PaddleOCR and sentence-transformers

- **Service Verification:**
  - ✅ Health endpoint returns 200 OK
  - ✅ PaddleOCR models loaded (~500MB download on first run)
  - ✅ Sentence-transformers model loaded (~200MB download)
  - ✅ Database connection pool established
  - ✅ Job poller running (checks queue every 5 seconds)
  - ✅ Service auto-starts on VPS boot
  - ✅ Logs accessible via journalctl

#### Technical Stack

- **VPS Specifications:**
  - OS: Debian Bookworm
  - CPU: 2 vCPU
  - RAM: 8GB
  - Storage: ~20GB for models and temp files
  - Network: Internet connection for model downloads and Supabase access

- **Python Dependencies:**
  - FastAPI 0.109.0 - Web framework
  - uvicorn[standard] 0.27.0 - ASGI server
  - paddleocr 2.7.3 - OCR engine
  - paddlepaddle 2.6.1 - Deep learning framework (CPU version)
  - sentence-transformers 2.3.1 - Embeddings generation
  - asyncpg 0.29.0 - PostgreSQL async client
  - numpy 1.26.4 - Numerical computing (pinned for compatibility)
  - opencv-python-headless 4.8.1.78 - Image processing
  - pdf2image 1.17.0 - PDF to image conversion
  - pydantic-settings 2.1.0 - Configuration management
  - loguru 0.7.2 - Logging

- **System Dependencies:**
  - poppler-utils - PDF rendering
  - libgl1 - OpenCV graphics library
  - libglib2.0-0 - GLib library for image processing

#### Performance & Capacity

- **Processing Performance:**
  - OCR: 5-10 seconds per page
  - Embeddings: 2-3 seconds per document
  - Total: 30-60 seconds per document (multi-page PDFs)
  - Memory usage: ~500MB idle, ~2.5GB peak during processing
  - CPU usage: ~5% idle, 80-100% during OCR

- **Capacity Estimates:**
  - Single VPS (2vCPU): ~50-100 documents/day
  - Horizontal scaling: Add more VPS instances (same queue, different instance IDs)
  - Queue handles distributed processing with row-level locking

- **Cost Analysis:**
  - VPS: $5-10/month (vs $50-100/month for managed OCR services)
  - Models: Free (open source)
  - Processing: $0 per document (vs $0.01-0.05/page for cloud OCR)
  - Total: ~$0.10 per 1000 docs (vs $10-50 for cloud services)

### Changed

- VPS setup script: Ubuntu-specific → Debian-compatible
- Environment file format: Inline comments → Separate line comments
- Systemd service: Uses EnvironmentFile → Pydantic reads .env directly
- Numpy version: 2.x → 1.26.4 (for imgaug compatibility)

### Fixed

- **Setup Script Path Detection** (setup-debian.sh)
  - Issue: Script couldn't find repository at `/Kairo/` path
  - Solution: Auto-detection for `/root/Kairo/` (Syncthing) and `/Kairo/` paths
  - Impact: Works with different VPS configurations

- **Environment Variable Parsing**
  - Issue: Pydantic couldn't parse inline comments in .env file
  - Root cause: `OCR_USE_GPU=false # comment` read as single string by both systemd and Pydantic
  - Solution: Moved all comments to separate lines, removed EnvironmentFile from systemd
  - Impact: Service starts successfully with clean environment

- **Numpy Compatibility**
  - Issue: imgaug package incompatible with numpy 2.x (`np.sctypes` removed)
  - Root cause: PaddleOCR depends on imgaug which uses deprecated numpy API
  - Solution: Pinned numpy to `>=1.23.0,<2.0.0` (1.26.4 installed)
  - Impact: All dependencies install and import correctly

### Security

- ✅ Service runs as non-root user (`ocruser`)
- ✅ Environment file permissions: 600 (owner read/write only)
- ✅ Database connection encrypted (Supabase SSL)
- ✅ Resource limits in systemd (6GB memory max)
- ✅ Temp files auto-cleaned (24-hour retention)

### Phase Status

**Phase 1: Foundation** - ✅ Complete
- ✅ Authentication + 7-day trial subscription system
- ✅ Stripe payment integration
- ✅ Dashboard MVP with action center
- ✅ Navigation sidebars

**Phase 2: Core CRM** - 🔄 In Progress (60% complete)
- ✅ **Contacts CRUD** - Full implementation with phone-book UI
- ✅ **Properties Management** - Complete with CRUD, search, filtering, image gallery
- ✅ **Documents Backend** - Database schema, types, repositories, services ready
- ✅ **Document Intelligence** - OCR fields, AI metadata, embeddings table
- ✅ **VPS OCR Service** - Deployed and operational (production-ready)
- ✅ **Property-Contact Linking** - Bidirectional with role-based relationships
- ⏳ **Documents Upload UI** - Next priority
- ⏳ Deals pipeline - Types defined
- ⏳ Activities timeline - Types defined
- ⏳ Advanced search & filters - Basic search done, advanced pending
- ⏳ Dashboard stats - Placeholder data, awaiting real data integration

**Next Steps:**
- Document upload UI with file picker
- Connect upload to VPS OCR queue
- Test end-to-end OCR processing
- AI metadata extraction integration
- Semantic search UI
- Document viewer component

## [0.8.0] - 2025-01-17

### Added - Properties Management & Documents (Phase 2 - Core CRM Continuation)

#### Database Infrastructure

- **Properties Table:** Complete real estate properties schema (`supabase/migrations/20250117_properties_and_documents.sql`)
  - **Core Fields:**
    - Identity: id (UUID), user_id (FK to users)
    - Basic: title, description, address, city, state, zip_code, country
    - Pricing: price (numeric with 2 decimals)
    - Property Details: bedrooms, bathrooms (allows half baths), square_feet, lot_size, year_built
  - **Property Types:**
    - property_type (residential, commercial, land)
    - status (available, pending, sold, rented)
  - **Media:**
    - images (text array for image URLs)
    - virtual_tour_url (text)
  - **Metadata:**
    - listing_date (timestamptz)
    - tags (text array for categorization)
    - custom_fields (JSONB for extensibility)
  - **Audit:**
    - created_at, updated_at (with auto-update trigger)

- **Documents Table:** Polymorphic document management
  - Links to contacts, properties, or deals via entity_type/entity_id pattern
  - Fields: filename, file_url, file_size, mime_type, category
  - Supports document categorization (contract, inspection, appraisal, etc.)
  - Prepared for future file upload integration

- **Property-Contact Relationship:** Completed many-to-many with roles
  - Added FK constraint: contact_properties.property_id → properties.id
  - Unique constraint on (contact_id, property_id, role)
  - Supports multiple roles: owner, buyer, seller, tenant
  - Bidirectional relationship tracking

- **Performance Indexes:**
  - Standard indexes: user_id, status, property_type, price, created_at, updated_at
  - Full-text search index on title, address, city fields
  - Junction table indexes for efficient relationship queries

- **Row-Level Security (RLS) Policies:**
  - Users can view/create/update/delete only their own properties
  - Property-contact relationship policies enforce ownership
  - Document policies ensure entity-level access control

#### Type System & Validation

- **TypeScript Types:** Comprehensive property types (`types/crm.ts`)
  - Core: `Property`, `PropertyWithRelations`, `Document`
  - Input types: `CreatePropertyInput`, `UpdatePropertyInput`, `CreateDocumentInput`
  - Filtering: `PropertiesFilterParams` with search, price range, bedrooms, bathrooms, sqft, type, status
  - Enums: `PropertyType`, `PropertyStatus`, `DocumentCategory`, `EntityType`
  - Helper functions:
    - `formatPropertyPrice()` - Format price with $ symbol
    - `formatPropertyDetails()` - Format bed/bath/sqft summary
    - `getPropertyStatusColor()` - Status badge colors
    - `getPropertyStatusLabel()` - Status display labels
    - `getPropertyTypeLabel()` - Type display labels

- **Zod Validation Schemas:** Type-safe validation (`lib/validations.ts`)
  - `propertyTypeSchema`, `propertyStatusSchema`, `propertyRoleSchema`
  - `createPropertySchema` - Full property creation with validations:
    - Title: max 200 chars
    - Address: max 300 chars
    - Price: max $999,999,999
    - Bedrooms: max 100
    - Bathrooms: max 50
    - Year built: 1800 to current year + 1
    - Images: array of valid URLs
  - `updatePropertySchema` - Partial updates
  - `propertiesFilterSchema` - Advanced filtering with price ranges, sqft ranges
  - `createDocumentSchema` - Document validation with 100MB file size limit
  - `entityTypeSchema` - Polymorphic entity type validation

#### Data Access Layer

- **Properties Repository:** Clean data access (`server/repositories/properties.repository.ts`)
  - **CRUD Operations:**
    - `list()` - Advanced filtering (price, beds, baths, sqft, type, status, search)
    - `findById()` - Get single property
    - `create()` - Create new property
    - `update()` - Update property
    - `delete()` - Delete property
    - `search()` - Quick search by title/address
  - **Advanced Features:**
    - Full-text search on title, address, city
    - Price range filtering (min/max)
    - Bedroom/bathroom/sqft range filtering
    - Property type and status filtering
    - Sorting by price, createdAt
    - Pagination support
  - Private `mapToProperty()` helper for database mapping

- **Documents Repository:** Polymorphic document access (`server/repositories/documents.repository.ts`)
  - `listByEntity()` - Get documents for specific entity (contact, property, deal)
  - `listAll()` - Get all user documents
  - `findById()` - Get single document
  - `create()` - Create document link
  - `update()` - Update document metadata
  - `delete()` - Remove document

#### Business Logic Layer

- **Properties Service:** Business logic and validation (`server/services/properties.service.ts`)
  - **Core Operations:**
    - `list()` - List with filters
    - `getById()` - Get with 404 error handling
    - `create()` - Create with year built validation
    - `update()` - Update with year built validation
    - `delete()` - Delete with existence check
    - `search()` - Quick search wrapper
  - **Relationship Operations:**
    - `getPropertyContacts()` - Get contacts linked to property with roles
    - `linkToContact()` - Link property to contact with role validation
    - `unlinkFromContact()` - Unlink from contact
  - **Business Rules:**
    - Year built must be between 1800 and current year + 1
    - Price validation (positive, max $999,999,999)
    - Property existence verification
    - User ownership validation
    - Duplicate relationship prevention

- **Documents Service:** Document management (`server/services/documents.service.ts`)
  - `listByEntity()` - Get entity documents
  - `listAll()` - Get all user documents
  - `create()` - Create with file size validation (100MB limit)
  - `update()` - Update metadata
  - `delete()` - Delete document
  - URL format validation

- **Contacts Service Enhancement:**
  - `getContactProperties()` - Now fetches FULL property details (not just junction data)
  - Mirrors properties.getContacts pattern
  - Returns enriched property objects with role and linkedAt fields

#### API Layer

- **tRPC Properties Router:** Type-safe API endpoints (`server/routers/properties.ts`)
  - All endpoints protected by `subscribedProcedure`
  - **Query Endpoints:**
    - `properties.list` - List with advanced filtering
    - `properties.getById` - Get single property
    - `properties.search` - Quick search
    - `properties.getContacts` - Get linked contacts with roles
  - **Mutation Endpoints:**
    - `properties.create` - Create property
    - `properties.update` - Update property
    - `properties.delete` - Delete property
    - `properties.linkToContact` - Link to contact with role
    - `properties.unlinkFromContact` - Unlink from contact

- **tRPC Documents Router:** Type-safe API endpoints (`server/routers/documents.ts`)
  - `documents.listByEntity` - Get entity documents
  - `documents.listAll` - Get all documents
  - `documents.getById` - Get single document
  - `documents.create` - Create document
  - `documents.update` - Update document
  - `documents.delete` - Delete document

- **Integrated into main app router** (`server/routers/_app.ts`)

#### User Interface

- **Phone-Book Style Layout:** Matching Contacts pattern (`app/(dashboard)/properties/page.tsx`)
  - Left panel: Property list (w-96) with search and filters
  - Right panel: Selected property detail (flex-1)
  - State management for selected property, create/edit dialogs
  - tRPC queries with React Query caching
  - Optimistic updates for mutations
  - Toast notifications for all actions

- **Property List Component:** Left sidebar (`components/properties/property-list.tsx`)
  - Search bar with live filtering
  - "Add Property" button
  - Filter toggle (UI ready for implementation)
  - Scrollable property list
  - Property count footer
  - Empty state when no properties
  - Loading states

- **Property Card Component:** Compact card display (`components/properties/property-card.tsx`)
  - Property image with fallback Home icon
  - Title with status badge (Available, Pending, Sold, Rented)
  - Address with MapPin icon
  - Price (formatted with $)
  - Bed/bath/sqft details
  - Property type badge (Residential, Commercial, Land)
  - Selected state styling
  - Dark mode support

- **Property Detail Component:** Full detail view (`components/properties/property-detail.tsx`)
  - **Header:**
    - Property title and status badge
    - Full address with city, state, zip
    - Price and bed/bath/sqft summary
    - Edit and Delete action buttons
    - Tags display
  - **Tabbed Interface:**
    - **Property Info tab:** Description, details grid, listing date, virtual tour link
    - **Images tab:** Image gallery with thumbnail selection, main image viewer
    - **Contacts tab:** Linked contacts with roles (fully functional)
    - **Documents tab:** Document management (placeholder)
  - Responsive layout with ScrollArea
  - Dark mode throughout

- **Property Form Component:** Comprehensive form dialog (`components/properties/property-form.tsx`)
  - **Two Modes:** Create and Edit (pre-filled)
  - **Form Sections:**
    - Basic Info: Title*, description, property type, status
    - Address: Street*, city, state, zip, country
    - Property Details: Price, bedrooms, bathrooms, sqft, lot size, year built
    - Media: Virtual tour URL, image upload placeholder
  - **Validation:**
    - React Hook Form integration
    - Zod schema validation
    - Real-time error messages
    - Number field handling (integers and decimals)
  - Auto-reset on close
  - Loading states during submission

- **Property Contacts Tab:** Bidirectional linking (`components/properties/property-contacts-tab.tsx`)
  - Displays contacts linked to property
  - Contact cards with name, email, phone, company
  - Role badges with color coding (Owner: blue, Buyer: green, Seller: purple, Tenant: orange)
  - "Link Contact" button opens search dialog
  - Unlink button for each contact
  - Empty state with helpful message
  - Real-time updates via tRPC query invalidation

- **Link Contact Dialog:** Search and link (`components/properties/link-contact-dialog.tsx`)
  - Combobox with autocomplete search (Command component)
  - Real-time contact search by name, email, phone
  - Role selection dropdown (Owner/Buyer/Seller/Tenant)
  - Form validation with Zod
  - Server-side search (shouldFilter={false})
  - Success/error toast notifications

- **Contact Properties Tab:** Reverse linking (`components/crm/contact-properties-tab.tsx`)
  - Displays properties linked to contact
  - Property cards with image, title, address, price, details
  - Role and status badges
  - "Link Property" button opens search dialog
  - Unlink button for each property
  - Empty state with helpful message
  - Real-time updates

- **Link Property Dialog:** Search and link (`components/crm/link-property-dialog.tsx`)
  - Combobox with property search showing image thumbnails
  - Real-time property search by title, address
  - Image previews in search results
  - Role selection dropdown
  - Form validation with Zod
  - Server-side search (shouldFilter={false})

- **UI Components Added:**
  - Command component (shadcn/ui) - Autocomplete search
  - Popover component (shadcn/ui) - Dropdown positioning

#### Integration

- **Bidirectional Property-Contact Linking:**
  - Link from Properties page → Contacts tab
  - Link from CRM Contacts page → Properties tab
  - Same contact can have different roles for different properties
  - Real-time sync between both views
  - Query invalidation ensures consistency

### Changed

- ContactsService.getContactProperties: Now fetches full property details (not just junction data)
- ContactDetail component: Replaced properties tab placeholder with ContactPropertiesTab
- PropertyDetail component: Replaced contacts tab placeholder with PropertyContactsTab
- tRPC app router: Added properties and documents routers

### Fixed

- **Search Functionality:** Command component filtering interference (bec20fa)
  - Issue: Command component's built-in client-side filtering was hiding server search results
  - Solution: Added `shouldFilter={false}` to both LinkContactDialog and LinkPropertyDialog
  - Impact: Search now works properly when typing in autocomplete fields

- **Property Details Display:** Missing property data in contact properties tab (dfc03fc)
  - Issue: ContactPropertiesTab showed undefined price and "Invalid Date" for linkedAt
  - Root cause: getContactProperties only returned junction table data, not full property details
  - Solution: Updated ContactsService.getContactProperties to fetch full property data via PropertiesRepository
  - Impact: Price, images, address, and all property details now display correctly

- **Date Serialization:** tRPC date handling
  - Applied `as any` type casting pattern from Contacts implementation
  - Prevents type errors with date serialization over tRPC

### Technical Details

- **Architecture Pattern:** Clean layered architecture (Router → Service → Repository → Database)
- **Repository Pattern:** Consistent with Contacts implementation
- **Type Safety:** End-to-end TypeScript from database to UI
- **Full-Text Search:** PostgreSQL full-text search on title, address, city
- **Performance:** Indexed queries, pagination support, efficient relationship loading
- **Security:** RLS policies enforce user ownership, subscription checks on all endpoints
- **Error Handling:** Typed errors, user-friendly messages, toast notifications
- **Build:** ✅ Type check passed, ✅ Build successful (23 routes compiled)
- **Dependencies:** shadcn/ui Command and Popover components added

### Phase Status

**Phase 1: Foundation** - ✅ Complete
- ✅ Authentication + 7-day trial subscription system
- ✅ Stripe payment integration
- ✅ Dashboard MVP with action center
- ✅ Navigation sidebars

**Phase 2: Core CRM** - 🔄 In Progress (50% complete)
- ✅ **Contacts CRUD** - Full implementation with phone-book UI
- ✅ **Properties Management** - Complete with CRUD, search, filtering, image gallery
- ✅ **Documents System** - Backend ready, UI placeholder
- ✅ **Property-Contact Linking** - Bidirectional with role-based relationships
- ⏳ Deals pipeline - Types defined
- ⏳ Activities timeline - Types defined
- ⏳ Advanced search & filters - Basic search done, advanced pending
- ⏳ Dashboard stats - Placeholder data, awaiting real data integration

**Next Steps:**
- Deals pipeline implementation (kanban board UI)
- Activities timeline (auto-logging)
- Document upload UI with file management
- Advanced filtering UI for properties
- Dashboard integration with real CRM data

## [0.7.0] - 2025-01-16

### Added - CRM Contacts Module (Phase 2 - Core CRM Start)

#### Database Infrastructure

- **Contacts Table:** Complete contacts schema (`supabase/migrations/20250116_contacts.sql`)
  - **Core Fields:**
    - Identity: id (UUID), user_id (FK to users)
    - Personal: first_name, last_name, email, phone, profile_picture_url
    - Professional: company, job_title
    - Address: street, city, state, zip, country
  - **CRM Fields:**
    - status (lead, client, past_client)
    - source (referral, website, social_media, cold_call, other)
    - tags (text array for flexible categorization)
  - **Real Estate Specific:**
    - budget_min, budget_max (numeric with overflow protection)
  - **Extensibility:**
    - notes (text for freeform content)
    - custom_fields (JSONB for future custom field support)
  - **Audit:**
    - created_at, updated_at (with auto-update trigger)

- **Contact-Properties Junction Table:** Future-ready relationship management
  - Links contacts to properties (preparation for Phase 2 continuation)
  - role field (owner, buyer, seller, tenant)
  - Unique constraint on contact-property-role combination
  - Indexed for performance

- **Performance Indexes:**
  - Standard indexes: user_id, email, phone, status, created_at, updated_at
  - Full-text search index on name, email, phone, company fields
  - Junction table indexes for future property relationships

- **Row-Level Security (RLS) Policies:**
  - Agents can view/create/update/delete only their own contacts
  - Contact-property relationship policies implemented
  - Company admin policies prepared for future multi-user features

#### Type System & Validation

- **TypeScript Types:** Comprehensive type definitions (`types/crm.ts`)
  - Core: `Contact`, `ContactWithRelations`, `ContactProperty`
  - Input types: `CreateContactInput`, `UpdateContactInput`, `QuickCreateContactInput`
  - Filtering: `ContactsFilterParams` with full search/filter/sort capabilities
  - Enums: `ContactStatus`, `ContactSource`, `PropertyRole`
  - Helper functions:
    - `getContactFullName()` - Format full name
    - `getContactInitials()` - Generate avatar initials
    - `getContactDisplayInfo()` - Get display-ready contact info
    - `formatContactBudget()` - Format budget range
    - `getContactStatusColor()` - Status badge colors
    - `getContactStatusLabel()` - Status display labels
  - Future-ready types: Property, Deal, Activity (defined but not yet implemented)

- **Zod Validation Schemas:** Type-safe validation (`lib/validations.ts`)
  - `contactStatusSchema`, `contactSourceSchema`, `propertyRoleSchema`
  - `quickCreateContactSchema` - Minimal fields (first name, last name, email, phone)
  - `createContactSchema` - Full form with all fields and validations
  - `updateContactSchema` - Partial updates with required id
  - `contactsFilterSchema` - Comprehensive filtering/pagination
  - `createContactPropertySchema`, `deleteContactPropertySchema`
  - **Key Validations:**
    - Email format validation
    - Budget max validation (999,999,999 limit to prevent numeric overflow)
    - String length limits on all fields
    - Optional field handling with proper defaults

#### Data Access Layer

- **Contacts Repository:** Clean data access (`server/repositories/contacts.repository.ts`)
  - **CRUD Operations:**
    - `list()` - Advanced filtering, search, sorting, pagination
    - `findById()` - Get single contact with type safety
    - `findByEmail()` - Duplicate email check
    - `create()` - Create new contact
    - `update()` - Partial update support
    - `delete()` - Delete contact
  - **Relationship Management:**
    - `getContactProperties()` - Get linked properties (future-ready)
    - `addContactProperty()` - Link contact to property
    - `removeContactProperty()` - Unlink contact from property
  - **Advanced Features:**
    - Full-text search across name, email, phone, company
    - Multiple filter support (status, source, tags, budget range)
    - Flexible sorting (firstName, lastName, createdAt, updatedAt)
    - Pagination with configurable limit/offset
  - Private `mapToContact()` helper for database row mapping

#### Business Logic Layer

- **Contacts Service:** Business logic and validation (`server/services/contacts.service.ts`)
  - **Core Operations:**
    - `list()` - List contacts with filters
    - `getById()` - Get contact with 404 error handling
    - `create()` - Create with duplicate email check and budget validation
    - `quickCreate()` - Minimal fields with defaults (for quick add)
    - `update()` - Update with duplicate email check and budget validation
    - `delete()` - Delete with existence check
    - `search()` - Quick search wrapper
  - **Relationship Operations:**
    - `getContactProperties()` - Get linked properties
    - `linkToProperty()` - Link with duplicate relationship check
    - `unlinkFromProperty()` - Unlink from property
  - **Business Rules:**
    - Duplicate email prevention (with email normalization)
    - Budget range validation (min < max)
    - Budget numeric overflow prevention (max $999,999,999)
    - Contact existence verification
    - User ownership validation

#### API Layer

- **tRPC Contacts Router:** Type-safe API endpoints (`server/routers/contacts.ts`)
  - All endpoints protected by `subscribedProcedure` (requires active subscription)
  - **Query Endpoints:**
    - `contacts.list` - List contacts with optional filters
    - `contacts.getById` - Get single contact by ID
    - `contacts.search` - Quick search by name/email
    - `contacts.getProperties` - Get linked properties
  - **Mutation Endpoints:**
    - `contacts.create` - Full contact creation
    - `contacts.quickCreate` - Quick minimal contact creation
    - `contacts.update` - Update contact (partial)
    - `contacts.delete` - Delete contact
    - `contacts.linkToProperty` - Link to property with role
    - `contacts.unlinkFromProperty` - Unlink from property
  - Integrated into main app router (`server/routers/_app.ts`)

#### User Interface

- **Phone-Book Style Layout:** Inspired by iOS Contacts (`app/(dashboard)/crm/page.tsx`)
  - Left panel: Contact list with search and filters
  - Right panel: Selected contact detail
  - Responsive design with dark mode support
  - State management for selected contact, dialogs
  - tRPC queries with React Query caching
  - Optimistic updates for mutations
  - Toast notifications for all actions

- **Contact List Component:** Left sidebar (`components/crm/contact-list.tsx`)
  - **Features:**
    - Search bar with live filtering
    - Quick Add button (minimal form)
    - New Contact button (full form)
    - Filter toggle (UI ready for implementation)
    - Scrollable contact list with virtual scrolling support
    - Contact count footer
    - Empty state when no contacts
  - Performance optimized for large contact lists
  - Loading states with skeleton UI

- **Contact Card Component:** Compact card display (`components/crm/contact-card.tsx`)
  - Avatar with initials fallback
  - Full name with status badge (colored: lead/client/past client)
  - Company, email, phone with icons
  - Tags display (first 3 + "and X more" badge)
  - Selected state styling (purple accent)
  - Dark mode support
  - Hover states

- **Contact Detail Component:** Full detail view (`components/crm/contact-detail.tsx`)
  - **Header:**
    - Large avatar with profile picture support
    - Full name and status
    - Edit and Delete action buttons
    - Tag display (all tags with wrapping)
  - **Tabbed Interface:**
    - Activity tab (placeholder for timeline)
    - Contact Info tab (all contact details organized in sections)
    - Properties tab (placeholder for linked properties)
    - Email tab (placeholder for email integration)
    - WhatsApp tab (placeholder for WhatsApp integration)
    - Documents tab (placeholder for document management)
  - **Contact Info Organization:**
    - Personal section (email, phone)
    - Professional section (company, job title)
    - Address section (formatted address display)
    - CRM Details section (status, source)
    - Budget section (formatted budget range)
    - Notes section (full notes display)
  - Empty states for missing information
  - Responsive layout

- **Contact Form Component:** Comprehensive form dialog (`components/crm/contact-form.tsx`)
  - **Three Modes:**
    - Quick Create: First name, last name, email, phone (minimal friction)
    - Full Create: All fields organized in sections
    - Edit Mode: Pre-filled with existing data
  - **Form Sections:**
    - Basic Info: First name*, last name*, profile picture URL
    - Contact: Email, phone
    - Professional: Company, job title
    - Address: Street, city, state, zip, country
    - CRM Details: Status dropdown, source dropdown, tags input
    - Budget: Min/max budget with validation
    - Notes: Freeform text area
  - **Validation:**
    - React Hook Form integration
    - Zod schema validation
    - Real-time error messages
    - Async validation for duplicate emails
  - **UX Features:**
    - Auto-reset on close
    - Loading states during submission
    - Success/error toast notifications
    - Keyboard shortcuts (Escape to close)

### Changed

- **tRPC Router:** Added `contacts` router to main app router
- **Database Migrations:** Added contacts schema (20250116_contacts.sql)
- **Navigation:** CRM page now functional (was placeholder)
- **Type Exports:** Added CRM types to main types index

### Fixed

- **Budget Validation:** Added max budget validation to prevent numeric overflow (7cb5a67)
  - Issue: Budget fields could accept values larger than PostgreSQL numeric type limit
  - Solution: Added 999,999,999 validation in Zod schema and service layer
  - Impact: Prevents database errors during contact creation/update

- **RLS Policy Recursion:** Removed recursive company admin policy causing infinite recursion (2f583d6)
  - Issue: Company admin policy had recursive reference causing stack overflow
  - Solution: Simplified RLS policy to non-recursive check
  - Impact: Fixed 500 errors when querying contacts

- **RLS Policy Column Names:** Corrected table and column names in contacts RLS policy (b0fc60b)
  - Issue: Policy referenced incorrect column names from old schema
  - Solution: Updated to match actual contacts table schema
  - Impact: RLS policies now enforce correctly

- **Foreign Key Constraint:** Removed properties FK constraint from contacts migration (9762df2)
  - Issue: contact_properties table referenced non-existent properties table
  - Solution: Removed FK constraint, will add later when properties table exists
  - Impact: Migration runs successfully

### Technical Details

- **Architecture Pattern:** Clean layered architecture (Router → Service → Repository → Database)
- **Repository Pattern:** Data access abstraction ready for adapter swapping
- **Type Safety:** End-to-end type safety from database to UI
- **Full-Text Search:** PostgreSQL full-text search on name, email, phone, company
- **Performance:** Indexed queries, pagination support, virtual scrolling ready
- **Security:** RLS policies enforce user ownership, subscription checks on all endpoints
- **Error Handling:** Typed errors, user-friendly messages, toast notifications
- **Build:** ✅ Type check passed, ✅ Build successful
- **Dependencies:** React Query 5.90, React Hook Form 7.66, Zod 4.1

### Phase Status

**Phase 1: Foundation** - ✅ Complete
- ✅ Authentication + 7-day trial subscription system
- ✅ Stripe payment integration
- ✅ Dashboard MVP with action center
- ✅ Navigation sidebars

**Phase 2: Core CRM** - 🔄 In Progress (25% complete)
- ✅ **Contacts CRUD** - Full implementation with phone-book UI
- ⏳ Properties management - Types defined, database ready
- ⏳ Deals pipeline - Types defined
- ⏳ Activities timeline - Types defined
- ⏳ Search & filters - Basic contact search done, advanced pending
- ⏳ Dashboard stats - Placeholder data, awaiting real data integration

**Next Steps:**
- Properties CRUD implementation (database, API, UI)
- Deals pipeline (kanban board UI)
- Activities timeline (auto-logging)
- Contact-Property relationship UI
- Advanced filtering for contacts
- Dashboard integration with real CRM data

## [0.6.0] - 2025-11-14

### Added - Stripe Payment Integration (Phase D)

#### Payment Infrastructure
- **Stripe SDK Integration:** Installed stripe and @stripe/stripe-js packages
  - Server-side Stripe SDK for backend operations
  - Client-side Stripe.js for secure checkout
  - Type-safe payment processing throughout

- **Pricing Configuration:** Centralized pricing plans (`lib/config/pricing.ts`)
  - Two tiers: Standard and Professional
  - Three billing cycles: Monthly, Quarterly (3-month), Yearly
  - Standard: $99/mo, $270/3mo (9% savings), $999.98/yr (16% savings)
  - Professional: $199/mo, $540/3mo (10% savings), $1,999/yr (17% savings)
  - Helper functions: `getPlansByTier()`, `getPlanByPriceId()`, `formatBillingCycle()`

- **Payment Adapter Pattern:** Swappable payment provider (`lib/adapters/payment/`)
  - Interface definition with checkout, portal, webhook methods
  - Stripe implementation: `StripePaymentAdapter`
  - Service provider integration: `ServiceProvider.payment`
  - Ready to swap Stripe for other providers (PayPal, Square, etc.)

- **Payment Service Layer:** Business logic (`server/services/payment.service.ts`)
  - `createCheckoutSession()` - Generate Stripe Checkout URL
  - `createCustomerPortal()` - Access Stripe Customer Portal
  - `handleWebhookEvent()` - Process Stripe webhooks
  - Automatic subscription activation on successful payment
  - Webhook handlers for all subscription lifecycle events:
    - checkout.session.completed
    - customer.subscription.updated
    - customer.subscription.deleted
    - invoice.payment_succeeded
    - invoice.payment_failed

- **API Endpoints:** tRPC payment router (`server/routers/payment.ts`)
  - `payment.createCheckoutSession` - Start payment flow
  - `payment.createCustomerPortal` - Manage subscription
  - Integrated into main app router

- **Stripe Webhook Handler:** Next.js API route (`app/api/webhooks/stripe/route.ts`)
  - Secure webhook signature verification
  - Raw body parsing for Stripe verification
  - Automatic subscription status updates

#### User Interface

- **Enhanced Subscribe Page:** Two-tier pricing display (`app/(auth)/subscribe/page.tsx`)
  - Side-by-side Standard and Professional plan cards
  - Billing cycle toggle: Monthly, 3 Months, Yearly
  - Real-time price updates based on selection
  - Savings badges (12-17% off)
  - Feature lists for each tier
  - "Get Started" buttons redirect to Stripe Checkout
  - Loading states during checkout session creation
  - Dark mode compatible, fully responsive

- **Success Page:** Post-payment confirmation (`app/(auth)/subscribe/success/page.tsx`)
  - Checkout session verification
  - Success message with next steps
  - Auto-redirect to dashboard (5 second countdown)
  - Quick access to subscription management
  - Welcome message for new subscribers

- **Cancel Page:** Checkout cancellation (`app/(auth)/subscribe/cancel/page.tsx`)
  - Friendly cancellation message
  - "Try Again" button to restart checkout
  - Return to dashboard option
  - Help contact information

- **Subscription Management:** Full-featured settings page (`app/(dashboard)/settings/subscription/page.tsx`)
  - Current plan display with tier, price, billing cycle
  - Subscription status badges (Trial, Active, Expired, Cancelled)
  - Trial countdown (days remaining)
  - Subscription dates (start, renewal/end)
  - "Manage Subscription" button → Opens Stripe Customer Portal
  - Portal allows: Update payment method, change plan, cancel subscription
  - "Upgrade to Pro" button for trial/expired users
  - Billing info section with trust badges
  - Loading states for portal access

- **Badge Component:** New UI component (`components/ui/badge.tsx`)
  - Supports outline, default, secondary, destructive variants
  - Used for subscription status indicators
  - Consistent with shadcn/ui design system

#### API Protection & Security

- **tRPC Subscription Procedure:** New middleware (`lib/trpc/server.ts`)
  - `subscribedProcedure` - Requires auth AND active subscription
  - Checks subscription status on every API call
  - Prevents cached API access after subscription expiry
  - Throws FORBIDDEN error if subscription expired
  - Ready for use in feature routers (CRM, properties, etc.)
  - Payment/subscription routers use `protectedProcedure` (auth only)

- **Server tRPC Exports:** Convenient import path (`server/trpc.ts`)
  - Re-exports all tRPC utilities for server-side code
  - Shorter import: `@/server/trpc` instead of `@/lib/trpc/server`

#### Configuration & Documentation

- **Environment Variables:** Updated `.env.example`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Client-side Stripe key
  - `STRIPE_SECRET_KEY` - Server-side Stripe key
  - `STRIPE_WEBHOOK_SECRET` - Webhook signature verification

- **Pricing Plans:** All 6 plans configured in Stripe
  - Standard Monthly, Quarterly, Yearly
  - Professional Monthly, Quarterly, Yearly
  - Price IDs mapped in `pricing.ts`

### Changed
- Subscribe page: Single plan → Two-tier pricing with 3 billing cycles
- Settings subscription page: Placeholder → Full management UI
- tRPC procedures: Added `subscribedProcedure` for API-level subscription checks
- Middleware: Now complemented by API-level subscription validation

### Fixed
- **Subscription Bypass Issue:** Users could access dashboard via API calls even after trial expiration
  - Root cause: Middleware only checked on page navigation
  - Solution: Added `subscribedProcedure` to validate subscription on every tRPC call
  - Impact: Complete subscription enforcement at both middleware and API layers

### Technical Details
- **Architecture:** Adapter pattern allows swapping Stripe for other payment providers
- **Type Safety:** End-to-end TypeScript from Stripe events to UI
- **Security:** Webhook signature verification, secure API routes
- **Performance:** Efficient database queries for subscription checks
- **Error Handling:** Fail-open strategy for middleware, explicit errors for API
- **Testing:** Ready for test mode transactions with Stripe test keys

### Deployment Notes

**Required Environment Variables:**
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... # Get this after deploying webhook endpoint
```

**Webhook Setup (After Deployment):**
1. Deploy application to production
2. In Stripe Dashboard → Developers → Webhooks
3. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
4. Select events:
   - checkout.session.completed
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_succeeded
   - invoice.payment_failed
5. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

**Stripe Product Setup:**
- Products created in Stripe Dashboard (Test mode)
- Price IDs configured in `pricing.ts`
- Prebuilt Checkout Page selected for fast, secure payments

### Phase Status
**Phase 1: Foundation** - ✅ Complete
- ✅ Authentication with 7-day free trials
- ✅ Subscription system with database backend
- ✅ Subscription enforcement at middleware level
- ✅ **Stripe payment integration (Phase D)**
- ✅ **Two-tier pricing (Standard & Professional)**
- ✅ **Stripe Checkout flow**
- ✅ **Webhook handling for automatic subscription updates**
- ✅ **Stripe Customer Portal for subscription management**
- ✅ **API-level subscription validation**

**Next: Phase 2** - Core CRM Features
- Contacts CRUD with subscribed procedure protection
- Properties management
- Deals pipeline
- All feature endpoints will use `subscribedProcedure`

## [0.5.0] - 2025-11-13

### Added - Subscription Enforcement Middleware (Phase C)

#### Subscription Access Control
- **Middleware Enhancement:** Updated proxy middleware to enforce subscription status (`lib/supabase/middleware.ts`)
  - Checks subscription status for all protected routes
  - Redirects to /subscribe if trial expired or no active subscription
  - Public paths: /login, /signup, /subscribe, /verify-email, /auth/callback, /
  - API paths bypassed: /api/*, /_next/*, /favicon.ico
  - Fail-open strategy: On error, allow access to prevent lockout

- **Subscribe Page:** Beautiful pricing page (`app/(auth)/subscribe/page.tsx`)
  - Monthly ($29/mo) and Yearly ($290/yr, 17% savings) plans
  - Billing cycle toggle with visual feedback
  - Feature list: Unlimited contacts, AI prioritization, unified messaging, etc.
  - "Subscribe Now" button (Phase D: Stripe integration)
  - Purple accent for subscription UI
  - Trust badges and security messaging
  - Responsive design with dark mode support

- **Settings Hub:** Improved settings page (`app/(dashboard)/settings/page.tsx`)
  - Card-based layout for different settings sections
  - Profile, Subscription, Notifications, Integrations, Security
  - "Manage" button for Subscription (available)
  - "Coming Soon" badges for other sections
  - Consistent black/white styling

#### Access Control Flow
1. User authenticated → Check subscription status
2. Trial active (< 7 days) → Allow access
3. Paid subscription active → Allow access
4. Trial expired or no subscription → Redirect to /subscribe
5. User can only access /subscribe, /login, /signup when expired

### Changed
- Middleware now enforces subscription-based access control
- All dashboard routes require active subscription or trial
- Settings page redesigned with card layout

### Technical Details
- Type-safe subscription checking in middleware
- Database query optimization for subscription lookups
- Error handling with fail-open strategy
- Build: ✅ Type check passed (7.3s), ✅ Build successful (24s)
- 20 routes compiled (added /subscribe)

### Phase Status
**Phase 1: Foundation** - ✅ Complete
- ✅ Subscription system with 7-day trials
- ✅ Subscription enforcement via middleware
- ✅ Pricing page ready for Stripe
- ✅ Access control fully functional

**Next: Phase D** - Stripe Payment Integration
- Stripe checkout flow
- Webhook handling for payment events
- Customer portal for subscription management
- Payment success/failure pages

## [0.4.0] - 2025-11-13

### Added - Subscription System & Navigation Sidebars (Phase A + B)

#### Phase A: Subscription Backend - 7-Day Free Trial System
- **Database:** New `subscriptions` table with full subscription lifecycle management
  - Auto-created 7-day trial on user signup
  - Tracks trial/active/expired/cancelled states
  - Stripe integration fields (customer_id, subscription_id, plan details)
  - RLS policies for secure user-only access
  - Migration: `supabase/migrations/20250113_subscriptions.sql`

- **Type System:** Complete TypeScript definitions (`types/subscription.ts`)
  - `SubscriptionStatus`, `PlanType`, `Subscription` interface
  - Helper functions: `hasActiveAccess()`, `getDaysRemaining()`, `isTrialExpired()`
  - Full type safety from database to UI

- **Repository Layer:** Data access for subscriptions (`server/repositories/subscription.repository.ts`)
  - CRUD operations with admin client for RLS bypass
  - Lookup by user ID or Stripe customer ID

- **Service Layer:** Business logic (`server/services/subscription.service.ts`)
  - Trial creation, status checking, activation, cancellation, renewal

- **API Layer:** tRPC subscription router (`server/routers/subscription.ts`)
  - Type-safe endpoints: getSubscription, checkStatus, createTrial, etc.
  - Integrated into main app router

- **Auth Integration:** Trial auto-creation on signup
  - Both agent and company signups now create 7-day trial automatically
  - Non-blocking: signup succeeds even if subscription fails

#### Phase B: Navigation Sidebars - Complete UI Navigation
- **Left Sidebar:** Main navigation (`components/layout/left-sidebar.tsx`)
  - Dashboard, CRM, Properties, Compliance, Social, Client Portal
  - Active state highlighting, hover descriptions
  - Sticky positioning, dark mode compatible

- **Right Sidebar:** User profile & subscription (`components/layout/right-sidebar.tsx`)
  - User avatar with initials
  - Real-time subscription status (trial days remaining/active plan/expired)
  - Navigation: Settings, Subscription, Contact Us
  - Sign out functionality

- **Layout Update:** Three-column layout (`app/(dashboard)/layout.tsx`)
  - Left sidebar (256px) + Main content (flex) + Right sidebar (256px)
  - Responsive scrolling

- **Placeholder Pages:** All MVP sections created
  - `/crm`, `/properties`, `/compliance`, `/social`, `/client-portal`
  - `/contact`, `/settings/subscription`
  - Consistent "Coming Soon" styling

### Changed
- Dashboard layout: Single column → Three-column with sidebars
- User navigation: No nav → Full MVP section navigation
- Types index: Now exports subscription types

### Technical Details
- Backend: Service-Repository pattern, admin clients for RLS bypass
- Frontend: React hooks + tRPC for real-time subscription status
- Styling: Black/white minimalist design throughout
- Build: ✅ Type check passed, ✅ Build successful (18.6s)
- 19 routes compiled successfully

### Phase Status
**Phase 1: Foundation** - ✅ Complete
- ✅ Authentication + 7-day trial subscription system
- ✅ Left & right sidebars with full navigation
- ✅ All MVP placeholder pages
- ✅ Subscription backend ready for Stripe (Phase C+D)

**Next: Phase C+D** - Subscription Enforcement & Stripe Integration

## [0.3.0] - 2025-11-13

### Added - MVP Dashboard Implementation
- **Dashboard Page:** Complete MVP dashboard with all core features (`app/(dashboard)/dashboard/page.tsx`)
  - Clean, minimalist black/white design matching auth pages
  - Fully responsive layout with mobile support
  - Dark mode compatible styling throughout
- **Action Center:** AI-prioritized task list
  - Interactive task list with priority indicators (high/medium/low)
  - Color-coded tasks with visual priority badges
  - Task completion toggle functionality
  - Due time display for time-sensitive tasks
  - Empty state when no tasks exist
  - "Add Task" button (placeholder for future implementation)
  - Task counter in quick stats
- **Talk to Kairo Command Bar:** Natural language interface
  - Search-style input with icon
  - Placeholder for AI command processing
  - Submit functionality with alerts for future implementation
  - Purple accent color for AI features
  - Example prompts in placeholder text
- **Agent Notepad:** Note-taking with AI task extraction
  - Large textarea for freeform notes
  - Character counter
  - "Extract Tasks" button (placeholder for AI processing)
  - Placeholder text with examples
  - Visual indicator for AI capabilities
- **Real-time Sync Indicator:** Status display in header
  - Green checkmark when synced
  - Spinning icon when syncing
  - Last sync timestamp display
  - Positioned in top-right of dashboard
- **Quick Stats Cards:** Overview metrics
  - Tasks Completed Today (dynamic count)
  - High Priority tasks count
  - Contacts count (placeholder for Phase 2)
  - Active Deals count (placeholder for Phase 2)
- **UI Components:**
  - Added `Textarea` component (`components/ui/textarea.tsx`)
  - Consistent with shadcn/ui design system
  - Full accessibility and focus states

### Changed
- Dashboard page completely redesigned from basic placeholder
- Improved layout structure with responsive grid system
- Enhanced visual hierarchy with cards and sections

### Technical Details
- State management with React hooks for tasks, notepad, and command input
- TypeScript interfaces for type-safe task objects
- Priority-based styling system with helper functions
- Lucide React icons throughout (CheckCircle2, Circle, Search, Sparkles, RefreshCw, Plus, Clock, AlertCircle)
- Tailwind CSS for responsive design and dark mode

### Phase Status
**Phase 1: Foundation** - ✅ Complete (Dashboard MVP)
- ✅ Authentication fully implemented
- ✅ Protected routes configured
- ✅ **MVP Dashboard with all core features**
- ✅ **Action Center with task management**
- ✅ **Talk to Kairo command interface**
- ✅ **Agent Notepad with AI extraction placeholder**
- ✅ **Real-time sync status indicator**

**Ready for Phase 2: Core CRM** (Contacts, Properties, Deals)

## [0.2.0] - 2025-11-12

### Added - Authentication Implementation
- **Supabase Authentication:** Complete Supabase Auth integration with JWT-based sessions
  - Browser client (`lib/supabase/client.ts`) for client-side operations
  - Server client (`lib/supabase/server.ts`) for Server Components and API routes
  - Middleware helper (`lib/supabase/middleware.ts`) for session management
- **Auth Service:** Business logic layer for authentication (`server/services/auth.service.ts`)
  - `signUpAgent()` - Agent signup with profile creation
  - `signUpCompany()` - Company signup with profile creation
  - `signIn()` - Email/password authentication
  - `signOut()` - Session termination
  - `getSession()` - Current user session retrieval
- **tRPC Auth Router:** Type-safe API endpoints (`server/routers/auth.ts`)
  - `auth.signUpAgent` - Agent registration endpoint
  - `auth.signUpCompany` - Company registration endpoint
  - `auth.signIn` - Login endpoint
  - `auth.signOut` - Logout endpoint
  - `auth.getSession` - Session retrieval endpoint
- **RLS Policies:** Row-Level Security for agent and company tables
  - Agents can view/update their own profile
  - Agents can view their company info
  - Agents can view other agents in their company
  - Companies can view/update their profile
  - Companies can view and manage their agents
  - Migration file: `supabase/migrations/20250112_rls_policies.sql`
- **Authentication UI:** Minimalist black/white design
  - Login page with email/password form (`app/(auth)/login/page.tsx`)
  - Signup page with agent/company selection (`app/(auth)/signup/page.tsx`)
  - Form validation with React Hook Form + Zod
  - Error handling and loading states
  - Dark mode support
- **Protected Routes:** Proxy middleware integration
  - Automatic session refresh
  - Redirect to /login for unauthenticated users
  - Redirect to /dashboard for authenticated users on auth pages
- **tRPC Context:** User session in tRPC context (`lib/trpc/context.ts`)
  - Includes authenticated user from Supabase
  - Available in all tRPC procedures
- **tRPC Provider:** React Query integration (`lib/trpc/Provider.tsx`)
  - Wraps app with tRPC and React Query providers
  - Configured in root layout

### Changed
- Updated `proxy.ts` to use Supabase authentication middleware
- Enhanced tRPC server with protected procedure middleware
- Updated tRPC context to include user session
- Auth pages migrated from placeholders to full implementations

### Fixed
- tRPC client configuration (was missing proper setup)
- TypeScript errors in auth pages (implicit any types)
- Build errors from missing tRPC provider

### Database
- Agent and company tables now protected by RLS policies
- Indexes added for performance optimization
- Foreign key relationships properly configured

### Security
- Row-Level Security enforced on all tables
- JWT-based authentication with Supabase
- Secure session management with HTTP-only cookies
- Password validation (minimum 8 characters)
- Email validation on signup

### Documentation
- `supabase/README.md` - Guide for applying RLS policies and migrations
- Updated project documentation with authentication flow

### Phase Status
**Phase 1: Foundation** - ✅ Complete
- ✅ Directory structure established
- ✅ Next.js + TypeScript + Tailwind configured
- ✅ tRPC type-safe API framework ready
- ✅ Adapter interfaces defined
- ✅ Basic UI components from shadcn/ui
- ✅ **Authentication fully implemented (login/signup/session management)**
- ✅ **Protected route middleware with Supabase**
- ✅ **RLS policies configured**
- ✅ **Agent and company profile creation**
- ✅ CI/CD pipeline operational
- ✅ Production deployment successful

**Ready for Phase 2: Core CRM**

## [0.1.0] - 2025-11-11

### Added
- Initial project structure with monorepo architecture
- Next.js 16 with App Router and React Server Components
- TypeScript 5+ configuration with strict mode
- Tailwind CSS + shadcn/ui component library
- tRPC setup for type-safe APIs with context and routers
- Supabase integration placeholders (database, auth, storage)
- Adapter pattern for swappable external services
- Basic authentication pages (login, signup) - UI only
- Dashboard layout with protected routes
- Proxy-based authentication middleware (Next.js 16 convention)
- Complete CI/CD pipeline with GitHub Actions
- Vercel deployment configuration for monorepo
- Turborepo for monorepo build orchestration
- Comprehensive documentation:
  - `CLAUDE.md` - Development guide for AI assistants
  - `PROJECT_STRUCTURE.md` - Full architecture documentation
  - `DEPLOYMENT.md` - Deployment and CI/CD guide
- Environment variable configuration with examples
- Root `.gitignore` for monorepo
- pnpm workspace configuration
- tRPC routers:
  - Auth router with session, signIn, signUp, signOut endpoints (placeholders)
  - Main app router combining all feature routers
- API routes:
  - `/api/trpc/[trpc]` - tRPC handler
  - `/api/upload` - File upload placeholder
  - `/api/webhooks` - Webhooks placeholder

### Changed
- Migrated from `middleware.ts` to `proxy.ts` (Next.js 16 convention)
- Updated `next.config.js` to use `images.remotePatterns` instead of deprecated `images.domains`
- Removed deprecated `swcMinify` option from Next.js config
- Configured Turbopack root directory for monorepo detection

### Fixed
- Next.js 16 configuration warnings (deprecated options)
- Workspace root detection issues with Vercel
- pnpm version mismatch between CI and local environment
- Empty configuration files causing build failures:
  - `turbo.json` - Added proper Turborepo configuration
  - `pnpm-workspace.yaml` - Added workspace package definitions
  - API route files - Added implementations for tRPC, upload, and webhooks
  - tRPC setup files - Added context, server, routers, and app router
- TypeScript compilation errors from missing exports
- Monorepo dependency installation in CI/CD pipeline

### Deployment
- Successfully deployed to Vercel with monorepo support
- CI pipeline running on GitHub Actions
- Automatic preview deployments for pull requests
- Production deployments on main branch merge

### Phase Status
**Phase 1: Foundation** -  Complete (Infrastructure & Architecture)
-  Directory structure established
-  Next.js + TypeScript + Tailwind configured
-  tRPC type-safe API framework ready
-  Adapter interfaces defined (implementations pending)
-  Basic UI components from shadcn/ui
-  Authentication pages created (backend pending)
-  Protected route structure in place
-  CI/CD pipeline operational
-  Production deployment successful

**Next Steps (Phase 1 Continuation):**
- [ ] Implement Supabase project setup
- [ ] Add Supabase authentication logic
- [ ] Connect database with Drizzle ORM
- [ ] Implement auth router endpoints
- [ ] Add session management to proxy middleware
- [ ] Create user profile management

## [Unreleased]

### Planned Features

#### Phase 2: Core CRM (Weeks 5-10)
- Contacts CRUD operations
- Properties management
- Deals pipeline
- Activities timeline
- Search and filters
- Dashboard with statistics

#### Phase 3: Documents (Weeks 11-13)
- File upload to Supabase Storage
- Document viewer (PDF, images)
- Link documents to contacts/properties
- Search by filename
- Organize by folders/tags

#### Phase 4: Unified Messaging (Weeks 14-17)
- Email integration (Gmail/Outlook sync)
- WhatsApp Business API integration
- Unified conversation view (all channels per contact)
- Message composer with channel selector
- Message templates for all channels
- Real-time message status updates

#### Phase 5: Intelligence (Weeks 18-22)
- OpenAI integration
- Generate embeddings for all content
- Semantic search across CRM
- AI chat assistant
- AI-powered suggestions
- Email draft generation

#### Phase 6: Polish & Launch (Weeks 23-26)
- Mobile responsive design
- PWA setup (installable)
- Performance optimization
- Error handling & logging
- E2E tests
- Documentation
- Beta launch

---

**Repository:** https://github.com/albiol2004/kairo
**Deployment:** https://vercel.com/albiol2004/kairo
