# Manufacturing Work Hour Management System Design Guidelines

## Design Approach
**Selected Approach:** Design System Approach using Material Design
**Justification:** Manufacturing work hour management is utility-focused, information-dense, and stability-valued. Material Design provides excellent data visualization components and professional aesthetics suitable for industrial business applications.

## Core Design Elements

### Color Palette
**Primary Colors:**
- Light mode: 215 70% 45% (professional blue for trust and reliability)
- Dark mode: 215 60% 55% (lighter variant for contrast)

**Supporting Colors:**
- Success/Complete: 120 50% 45% (order completion, inventory adequate)
- Warning/Pending: 45 85% 55% (schedule delays, low inventory)
- Error/Critical: 0 70% 50% (production issues, stock out)
- Neutral grays: 220 8% range from 15% to 95%

**Status Indicators:**
- Blue: In progress, scheduled
- Green: Completed, adequate stock
- Yellow: Attention needed, low stock
- Red: Critical issues, urgent action required

### Typography
**Font Family:** Google Fonts - Inter (primary), Noto Sans JP (Japanese manufacturing terms)
**Hierarchy:**
- Headers: 600 weight, text-xl to text-3xl
- Body text: 400 weight, text-base and text-sm
- Data/numbers: 500 weight for production metrics
- Labels: 500 weight, text-sm
- Manufacturing codes: 400 weight, monospace font for part numbers

### Layout System
**Spacing Units:** Tailwind units of 2, 4, 6, and 8
**Grid:** 12-column responsive grid with 6-unit gaps
**Containers:** Max-width with 4-unit mobile, 8-unit desktop padding

### Component Library

**Navigation:**
- Sidebar with collapsible manufacturing modules (受注管理、製番管理、工数入力、在庫管理、出荷管理)
- Breadcrumb navigation for production workflows
- Tab navigation for daily/weekly/monthly views

**Data Display:**
- Production tables with sortable columns and row selection
- Dashboard cards for KPIs (生産効率、納期達成率、在庫回転率)
- Gantt-style charts for production scheduling
- Progress bars for order completion status
- Real-time status badges for equipment and orders

**Forms:**
- Time entry forms with dropdown work categories
- Batch input forms for multiple work hours
- Order entry with product selection and quantity
- Inventory adjustment forms with reason codes

**Manufacturing-Specific Components:**
- Production line status indicators
- Work order cards with priority levels
- Parts inventory grid with stock level colors
- Shipping status timeline
- Quality control checkboxes

## Key Design Principles

1. **Industrial Clarity:** Clean layouts optimized for fast data entry during production shifts
2. **Status Visibility:** Clear color coding for production states and inventory levels
3. **Japanese Manufacturing:** Support for manufacturing terminology and workflow patterns
4. **Mobile Responsiveness:** Floor-friendly mobile views for production data entry
5. **Data Density:** Efficiently display complex production metrics without clutter
6. **Professional Reliability:** Conservative design that builds confidence in mission-critical operations

## Images
**Dashboard Visualizations:** Clean production charts and KPI graphs using the blue/gray color scheme
**Icons:** Material Design icons for manufacturing functions (工場、在庫、出荷、品質管理)
**No Hero Image:** Pure utility application focused on production efficiency over marketing appeal
**Status Indicators:** Color-coded visual elements for equipment status and production progress