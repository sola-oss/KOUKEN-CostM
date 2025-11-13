# Cost Management Software (原価管理ソフト)

## Overview

This is a comprehensive cost management software designed for Japanese manufacturing businesses. The application provides detailed tracking and analysis of project costs, including materials, labor, equipment, and indirect expenses. Built with a modern full-stack architecture, it features bilingual support (Japanese/English) and Material Design principles for professional, data-dense interfaces.

The system enables businesses to track costs across multiple projects, manage worker hours and rates, monitor material usage, and generate detailed analytics for informed decision-making. Key features include project-based cost tracking, real-time budget monitoring, profitability analysis, and comprehensive reporting capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### November 13, 2025 - Order Management CRUD Form Implementation (Stage 2)
- **Feature**: Implemented comprehensive 19-field CRUD form dialog for order management with professional UI/UX
- **Implementation Details**:
  - Dialog-based form design with 4 logical sections: 基本情報 (Basic Info), スケジュール (Schedule), 金額情報 (Amount Info), 管理メモ・ステータス (Management Notes & Status)
  - 2-column desktop layout with responsive single-column mobile layout
  - React Hook Form with Zod validation for type-safe form handling
  - Required fields: client_name (客先名), project_title (件名), due_date (納期)
  - Boolean status fields rendered as checkboxes: is_delivered, has_shipping_fee, is_amount_confirmed, is_invoiced
  - String→Number/Null conversions for numeric fields (invoiced_amount, processing_hours)
  - Pre-population support for edit mode with proper type handling
- **CRUD Operations**:
  - Create: POST /api/production/orders with form validation and auto-generated order_id
  - Update: PATCH /api/production/orders/${id} with partial update support (order_id excluded from updates)
  - Delete: DELETE /api/production/orders/${id} with confirmation dialog
  - All mutations use TanStack Query with proper cache invalidation by queryKey
  - Toast notifications for success/error feedback
- **API Architecture**:
  - Unified all endpoints to /api/production/orders/* pattern for consistency
  - Fixed endpoint mismatch between frontend and backend (was /api/orders)
  - Proper Response.json() parsing for mutation responses
  - JST/UTC timezone conversion for date fields
- **Testing**: End-to-end testing verified:
  - Order creation with POST 201 response
  - Form validation and required field enforcement
  - Success toast notifications and table updates
  - Search functionality with client name filter
  - Amount display formatting (¥200,000)
- **Technical Stack**:
  - Frontend: React Hook Form + Zod validation, Shadcn/ui Dialog and Form components
  - Backend: SQLite with proper null-safe handling, Zod validation schema
  - State Management: TanStack Query v5 with cache invalidation
- **UX Notes**: Optional string fields require empty strings instead of nulls for server validation

### November 7, 2025 - Order ID Edit Restriction Implementation
- **Feature**: Implemented order_id field edit restriction to prevent modification after registration
- **Implementation Details**:
  - Modified handleEdit function to populate order_id field with existing value (was previously blanked)
  - Added `disabled={!!editingOrder}` attribute to order_id input field in edit mode
  - Displayed warning message "※案件番号は登録後変更できません" only in edit mode
  - Preserved order_id visibility while disabling edits for better UX
- **User Experience**:
  - Create mode: order_id field is enabled with placeholder "空欄で自動採番"
  - Edit mode: order_id field displays existing value but is disabled (greyed out)
  - Warning message guides users that order_id cannot be changed after registration
- **Technical Stack**:
  - Frontend: React form control with conditional disabled state
  - Validation: Backend ALLOWED_ORDER_UPDATE_COLUMNS already excluded order_id
  - File modified: client/src/pages/production/projects.tsx
- **Testing**: End-to-end testing verified create/edit flows with order_id restriction
- **Security**: Backend already prevented order_id updates; frontend now matches backend behavior

### November 4, 2025 - Material Management Unit Field Implementation Complete
- **Feature**: Added unit field to material (procurement) management for detailed material tracking with flexible units
- **Implementation Details**:
  - Extended procurements table schema with `unit` TEXT column (単位：個、本、kg、m、L、枚、箱、セット)
  - Updated migration file (002_production_mvp.sql) to include unit column definition
  - Modified DAO layer (ProductionDAO) to support unit in create/update operations
  - Fixed SQL ambiguity bug by adding table prefixes (p.order_id, p.kind) in getProcurements query
  - Updated seed data to include unit values for sample procurements (kg for purchase items)
- **Frontend Implementation**:
  - Material Management UI (material-management.tsx) fully supports unit field
  - Unit selection dropdown with 8 common unit options (個、本、kg、m、L、枚、箱、セット)
  - Table display shows unit column with fallback to "個" for null values
  - Form validation enforces unit as required field
  - Edit dialog pre-populates unit value for existing materials
- **Technical Stack**:
  - Backend: SQLite with Drizzle ORM, Zod validation (insertProcurementSchema)
  - Frontend: React Hook Form with Zod validation (materialSchema)
  - API: RESTful endpoints with unit field in CRUD operations
- **Testing**: API E2E testing completed successfully (all CRUD operations verified with unit field)
- **Database Migration**: Successfully applied schema changes with unit column to procurements table
- **Data Integrity**: Unit field consistently handled across schema, migration, DAO, validation, and UI layers

### October 10, 2025 - Work Results Input (PC) Screen Implementation Complete
- **Feature**: Implemented comprehensive work results entry screen with full CRUD functionality
- **Implementation Details**:
  - 2-column layout form with all required fields (date, order_id, task_name, worker, start_time, end_time, quantity, memo)
  - Required field validation enforced on both frontend and backend (order, task, worker, start/end times)
  - Automatic duration calculation from start/end times with overnight correction (+24h when end < start)
  - Direct duration input mode toggle ("実績時間を手動調整")
  - Work logs saved to SQLite work_logs table with complete audit trail
  - Today's results table with inline edit/delete functionality
  - "Keep order/task" toggle for continuous entry workflow
  - Toast notifications for save/update/delete operations
  - Time overlap warning system for same worker/date conflicts
- **Technical Stack**:
  - Frontend: React Hook Form with Zod validation (workLogSchema with required start_time/end_time)
  - Backend: SQLite work_logs table with Drizzle ORM and unified insertWorkLogSchema validation
  - API: RESTful CRUD endpoints (POST/GET/PATCH/DELETE /api/production/work-logs)
- **Testing**: End-to-end testing completed and verified all CRUD operations, validation, duration calculation, and UI interactions
- **Data Integrity**: Frontend and backend validation schemas synchronized to ensure start_time/end_time are always required

### October 10, 2025 - Gantt Chart Bug Fix: Order Grouping Correction
- **Bug Fixed**: Tasks were appearing under incorrect orders due to order_id type inconsistency
- **Root Cause**: Mixed string/number handling of order_id caused incorrect order lookups and grouping
- **Solution Implemented**:
  - Unified all order_id handling to string type throughout the component
  - Created ordersMap (Map<string, Order>) for safe order name lookups with fallback "(名称不明)"
  - Applied sidebar filter (selectedOrderIds) BEFORE hierarchy creation instead of after
  - Explicit categoryarray ordering using numeric sort on string keys
  - Added order_id to tooltips ("案件{id}：{name}") and work item labels ("（#{id}）")
- **Technical Changes**:
  - TimelineItem.order_id: string (was number)
  - HierarchicalRow.order_id: string (was number)
  - selectedOrderIds: Set<string> (was Set<number>)
  - String conversion applied at all data fetch/transform points
- **Testing**: E2E testing verified correct order grouping, filtering, tooltips, and hierarchy display
- **Impact**: All tasks and procurements now correctly appear under their assigned orders

### October 10, 2025 - Hierarchical Gantt Chart Implementation
- **Feature**: Redesigned Gantt chart with hierarchical project-based grouping
- **Implementation Details**:
  - Added `HierarchicalRow` interface with `isHeader` flag, `row_label`, and `row_order` fields
  - Tasks and procurements now grouped by project (order) with visual hierarchy
  - Project headers display as "案件{id}：{name}" format
  - Work items (tasks/procurements) indented with "　└ {name}" format using 全角スペース
  - Transparent header bars (opacity=0.01) for Y-axis positioning without visual display
  - Horizontal separator lines between projects for visual clarity
  - Maintained all existing filter functionality (date range, assignee, display mode, order selection)
- **Technical Stack**: Plotly.js with categoryorder='array' for Y-axis control
- **Testing**: End-to-end testing completed for hierarchy display, filters, and edge cases
- **Known Limitation**: Display mode filter test skipped due to Radix UI Select + Playwright interaction issues (functionality verified manually)

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript in a Vite-powered development environment
- **Routing**: Wouter for lightweight client-side routing
- **UI Framework**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Design System**: Material Design approach with custom theme supporting light/dark modes
- **Form Handling**: React Hook Form with Zod validation for type-safe form management
- **Data Visualization**: Recharts for cost analysis charts and graphs

### Backend Architecture
- **Runtime**: Node.js with Express.js REST API
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configured for Neon serverless)
- **API Design**: RESTful endpoints following conventional patterns
- **Validation**: Zod schemas shared between client and server for consistent data validation
- **Session Management**: Connect-pg-simple for PostgreSQL-backed sessions

### Data Storage Solutions
- **Primary Database**: PostgreSQL with the following core entities:
  - Projects: Project management with status tracking, budgets, and timelines
  - Workers: Employee management with roles, departments, and hourly rates
  - Work Hours: Time tracking linked to projects and workers with task categorization
  - Materials: Material usage tracking with quantities, costs, and supplier information
  - Expenses: General expense tracking with categorization and project assignment
- **Database Schema**: Drizzle schema with UUID primary keys, decimal precision for financial data, and proper foreign key relationships
- **Migrations**: Automated database migrations through Drizzle Kit

### Authentication and Authorization
- **Session-based Authentication**: Traditional session management using PostgreSQL storage
- **Security**: CORS configuration and input validation through Zod schemas
- **Access Control**: Currently implements basic session checking (expandable for role-based access)

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL driver for Neon database connections
- **drizzle-orm**: TypeScript ORM for database operations with PostgreSQL dialect
- **drizzle-zod**: Integration between Drizzle schemas and Zod validation

### UI and Design
- **@radix-ui/***: Comprehensive set of unstyled UI primitives for accessibility
- **tailwindcss**: Utility-first CSS framework with custom design tokens
- **class-variance-authority**: Type-safe variant styling for component systems
- **recharts**: Chart library for data visualization and analytics
- **lucide-react**: Modern icon library with React components

### Development and Build Tools
- **vite**: Fast build tool and development server with HMR support
- **typescript**: Static type checking across the entire codebase
- **@replit/vite-plugin-runtime-error-modal**: Replit-specific development enhancements
- **tsx**: TypeScript execution for Node.js development

### Form and Data Management
- **react-hook-form**: Performant form library with minimal re-renders
- **@hookform/resolvers**: Validation resolvers for Zod integration
- **@tanstack/react-query**: Server state management with caching and synchronization
- **date-fns**: Date manipulation library with Japanese locale support

### Additional Features
- **wouter**: Minimalist routing library for single-page application navigation
- **embla-carousel-react**: Carousel component for UI interactions
- **cmdk**: Command palette component for enhanced user experience