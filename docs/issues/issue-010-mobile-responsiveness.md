# Issue: Implement Mobile & Desktop Responsive Design

## Summary
The RPD Invoice Dashboard is currently desktop-optimized with a fixed 288px sidebar layout that breaks on mobile devices. Users cannot effectively access invoices, dashboard metrics, or navigation on screens < 768px. The application requires architectural refactoring to support mobile, tablet, and desktop breakpoints with appropriate UX patterns for each device class.

## Scope
- Refactor dashboard layout to use collapsible sidebar with mobile drawer pattern
- Implement card-based mobile view for invoice table (alternative to 10-column table)
- Optimize dashboard grids, charts, and stats cards for tablet/mobile breakpoints
- Add responsive navigation with hamburger menu for mobile
- Ensure touch-friendly interactions (44x44px minimum hit targets)
- Optimize charts for mobile viewing (simplified data, vertical layouts)
- Implement responsive hooks (`useMediaQuery`, `useBreakpoint`) for component logic
- Comprehensive mobile testing on iOS Safari and Android Chrome

## Acceptance Criteria
### Layout & Navigation
- [ ] Sidebar collapses to drawer on mobile (< 768px) with hamburger toggle
- [ ] Main content adjusts padding/margin responsively when sidebar state changes
- [ ] Header shows user context on all devices (condensed on mobile)
- [ ] Navigation accessible via touch and keyboard on all device sizes
- [ ] Skip-to-content link works correctly on mobile

### Invoice Table
- [ ] Table displays as card-based list on mobile (< 768px)
- [ ] Cards show: Invoice #, Amount, Status, Vendor, Due Date (priority data)
- [ ] Expandable card details reveal full invoice information
- [ ] Tablet view (768-1024px) uses column visibility controls
- [ ] Desktop view (> 1024px) shows full table (current behavior maintained)
- [ ] Pagination controls are touch-friendly with adequate spacing
- [ ] Filter drawer UX optimized for mobile interaction

### Dashboard & Charts
- [ ] Stats cards use responsive grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5`
- [ ] Charts render at appropriate heights for mobile (300px) vs desktop (350px)
- [ ] Chart labels readable without horizontal scroll (vertical layout or truncation)
- [ ] Touch-friendly tooltips don't extend beyond viewport
- [ ] Loading skeletons adapt to mobile layout

### Touch & Interactions
- [ ] All interactive elements meet 44x44px minimum touch target size
- [ ] Kanban drag-and-drop works on touch devices or shows alternative UX
- [ ] Buttons have adequate spacing (12px minimum) on mobile
- [ ] No unintended zoom on input focus (iOS Safari)
- [ ] Gestures feel natural (no lag, proper feedback)

### Performance & Accessibility
- [ ] Lighthouse mobile score > 90
- [ ] Page load < 3s on 3G connection
- [ ] No horizontal scroll on any viewport size
- [ ] Screen reader announces mobile drawer open/close
- [ ] Keyboard navigation works on mobile browsers
- [ ] Focus trap implemented in mobile drawer
- [ ] WCAG AA compliance maintained across all breakpoints

### Testing
- [ ] E2E tests pass on mobile viewports (375px, 414px, 768px)
- [ ] Manual testing on iOS Safari (iPhone 12, 13, 14)
- [ ] Manual testing on Android Chrome (Samsung, Pixel)
- [ ] Tablet testing on iPad Safari (portrait and landscape)
- [ ] Desktop experience unchanged (no regressions)

## References
- **Findings Report**: `docs/findings/mobile-responsiveness-assessment.md`
- **Layout System**: `src/app/(dashboard)/layout.tsx:43,50`
- **Sidebar Component**: `src/components/layout/sidebar.tsx`
- **Invoice Table**: `src/app/(dashboard)/invoices/page.tsx:428-565`
- **Dashboard Grids**: `src/app/(dashboard)/dashboard/page.tsx:278`
- **Charts**: `src/components/charts/*.tsx`
- **Tailwind Config**: `tailwind.config.js`

## Technical Notes
### Current Breakpoints (Tailwind Default)
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1400px

### Recommended Responsive Patterns
1. **Sidebar**: Hamburger menu → Slide-in drawer (< 768px), Fixed sidebar (≥ 768px)
2. **Tables**: Card list (< 768px), Column hiding (768-1024px), Full table (≥ 1024px)
3. **Grids**: Single column (< 640px), 2 columns (640-1024px), 4-5 columns (≥ 1024px)
4. **Charts**: Vertical layout (< 640px), Horizontal simplified (640-1024px), Full horizontal (≥ 1024px)

### Priority Components (Critical Path)
1. Dashboard layout wrapper (blocks all mobile usage)
2. Invoice table mobile view (primary user need)
3. Dashboard grid responsiveness (metrics visibility)
4. Charts mobile optimization (data insights)
5. Touch interactions polish (UX quality)

## Estimated Effort
**15-25 days** (3-5 weeks) broken down as:
- Layout system: 4-6 days
- Invoice table redesign: 5-7 days
- Dashboard/charts optimization: 4-6 days
- Touch/accessibility polish: 2-3 days
- Testing and bug fixes: 3-5 days

## Priority
**P1** - High priority. Mobile accessibility is essential for field workers and executives who need invoice data on-the-go.

## Risk Class
**Medium** - Requires architectural changes to core layout and data tables, but has solid Tailwind foundation and no backend changes needed.

## Labels
`frontend`, `ux`, `mobile`, `responsive`, `accessibility`, `enhancement`
