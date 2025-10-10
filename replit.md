# Cost Management Software (原価管理ソフト)

## Overview

This is a comprehensive cost management software designed for Japanese manufacturing businesses. The application provides detailed tracking and analysis of project costs, including materials, labor, equipment, and indirect expenses. Built with a modern full-stack architecture, it features bilingual support (Japanese/English) and Material Design principles for professional, data-dense interfaces.

The system enables businesses to track costs across multiple projects, manage worker hours and rates, monitor material usage, and generate detailed analytics for informed decision-making. Key features include project-based cost tracking, real-time budget monitoring, profitability analysis, and comprehensive reporting capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

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