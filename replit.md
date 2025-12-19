# Cost Management Software (原価管理ソフト)

## Overview

This is a comprehensive cost management software for Japanese manufacturing businesses. It tracks and analyzes project costs (materials, labor, equipment, indirect expenses) with bilingual support (Japanese/English) and Material Design principles. The system enables multi-project cost tracking, worker hour management, material usage monitoring, and generates analytics for informed decision-making, including real-time budget monitoring and profitability analysis.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite
- **Routing**: Wouter
- **UI Framework**: Shadcn/ui (Radix UI + Tailwind CSS)
- **State Management**: TanStack Query for server state
- **Design System**: Material Design with light/dark modes
- **Form Handling**: React Hook Form with Zod validation
- **Data Visualization**: Recharts

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ES modules)
- **Database ORM**: Drizzle ORM
- **Database**: PostgreSQL (Neon serverless)
- **API Design**: RESTful endpoints
- **Validation**: Zod schemas (shared client/server)
- **Session Management**: Connect-pg-simple (PostgreSQL-backed)

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Drizzle schema
  - Core entities: Projects, Workers, Work Hours, Materials, Expenses
  - Features: UUID primary keys, decimal precision for financial data, foreign key relationships
- **Migrations**: Automated via Drizzle Kit

### Authentication and Authorization
- **Authentication**: Session-based using PostgreSQL storage
- **Security**: CORS, Zod input validation
- **Access Control**: Basic session checking (expandable for RBAC)

### UI/UX Decisions
- **Bilingual Support**: Japanese/English
- **Design Principles**: Material Design for professional, data-dense interfaces
- **Layouts**: Responsive 2-column (desktop) / single-column (mobile) for forms
- **Components**: Dialog-based forms, conditional menu rendering, mode toggles (Production/Cost Management)
- **Data Display**: Hierarchical Gantt charts with project grouping, detailed tables with inline editing
- **Notifications**: Toast notifications for CRUD operations

### Technical Implementations
- **Cost Management Features**: Mode toggle (Production/Cost), Cost Summary (`/cost-summary`), Budget vs. Actual Comparison (`/cost-comparison`), Unit Price Master (`/unit-prices`).
- **Order Management**: 19-field CRUD form with React Hook Form + Zod, TanStack Query for mutations, API at `/api/production/orders/*`. Order ID is restricted from editing after creation.
- **Material Management**: `unit` field for procurement tracking, Drizzle ORM schema updates, Zod validation.
- **Work Results Input**: Comprehensive CRUD screen, automatic duration calculation, time overlap warnings, persistent order/task toggle.
- **Gantt Chart**: Hierarchical project-based grouping, correct order_id handling (unified to string type) for accurate task grouping and filtering.

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Neon database connections
- **drizzle-orm**: TypeScript ORM for PostgreSQL
- **drizzle-zod**: Drizzle schema and Zod validation integration

### UI and Design
- **@radix-ui/***: Unstyled UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe variant styling
- **recharts**: Chart library
- **lucide-react**: Icon library

### Development and Build Tools
- **vite**: Build tool and development server
- **typescript**: Static type checking
- **@replit/vite-plugin-runtime-error-modal**: Replit-specific enhancements
- **tsx**: TypeScript execution for Node.js

### Form and Data Management
- **react-hook-form**: Form library
- **@hookform/resolvers**: Zod validation integration for forms
- **@tanstack/react-query**: Server state management
- **date-fns**: Date manipulation

### Additional Features
- **wouter**: Minimalist routing
- **embla-carousel-react**: Carousel component
- **cmdk**: Command palette component