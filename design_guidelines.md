# Cost Management Software Design Guidelines

## Design Approach
**Selected Approach:** Design System Approach using Material Design
**Justification:** Cost management software is utility-focused, information-dense, and requires stability over time. Material Design provides excellent data visualization components and professional aesthetics suitable for business applications.

## Core Design Elements

### Color Palette
**Primary Colors:**
- Light mode: 25 70% 45% (deep blue-green for trust and professionalism)
- Dark mode: 25 60% 55% (lighter variant for better contrast)

**Supporting Colors:**
- Success: 120 45% 50% (financial gains)
- Warning: 35 85% 55% (budget alerts)
- Error: 0 70% 50% (overages)
- Neutral grays: 220 10% range from 15% to 95%

### Typography
**Font Family:** Google Fonts - Inter (primary), Noto Sans JP (Japanese support)
**Hierarchy:**
- Headers: 600 weight, sizes from text-2xl to text-4xl
- Body text: 400 weight, text-base and text-sm
- Data/numbers: 500 weight for emphasis
- Labels: 500 weight, text-sm

### Layout System
**Spacing Units:** Tailwind units of 2, 4, 6, and 8 (p-4, m-6, h-8, etc.)
**Grid:** 12-column grid with consistent 6-unit gaps
**Containers:** Max-width containers with 4-unit padding on mobile, 8-unit on desktop

### Component Library

**Navigation:**
- Sidebar navigation with collapsible sections
- Breadcrumb navigation for deep pages
- Tab navigation for related views (monthly/quarterly reports)

**Data Display:**
- Clean data tables with zebra striping
- Card-based cost summaries with subtle shadows
- Progress bars for budget tracking
- Donut charts for cost category breakdowns
- Line charts for trend analysis

**Forms:**
- Grouped input fields with clear labels
- Dropdown selectors for categories
- Date range pickers for reporting periods
- File upload areas with drag-and-drop styling

**Core UI Elements:**
- Floating action button for quick expense entry
- Toast notifications for successful submissions
- Modal dialogs for detailed cost analysis
- Badge components for status indicators (over budget, on track)

## Key Design Principles

1. **Data Clarity:** Use consistent spacing and typography to make financial data easily scannable
2. **Professional Aesthetic:** Clean, minimal design that builds trust with business users
3. **Japanese Localization:** Proper font support and layout considerations for Japanese text
4. **Responsive Design:** Ensure tables and charts work well on both desktop and mobile
5. **Visual Hierarchy:** Use color and typography to guide users through complex financial information

## Images
**Dashboard Charts:** Use clean, minimalist chart visualizations with the primary color palette
**Icons:** Material Design icons for categories (materials, labor, equipment, overhead)
**No Hero Image:** This is a utility application - focus on functional layouts over marketing imagery