# HR Module - Priority 2.1: Leave Types Configuration

## Implementation Summary

**Date**: January 2025  
**Scope**: Leave Types and Holidays Configuration UI  
**Status**: ✅ Completed

---

## Overview

This document covers the implementation of Leave Types Configuration and Holiday Calendar management in the HR module setup section. These features allow HR administrators to define and manage leave categories and company holidays.

---

## Features Implemented

### 1. Leave Types Configuration

#### Purpose
Provides HR administrators with the ability to:
- Define custom leave categories (Casual, Earned, Sick, Unpaid, etc.)
- Set annual day limits per leave type
- Mark leave types as paid or unpaid
- Configure approval requirements

#### UI Components
- **Input Form**: Create new leave types with:
  - Name (e.g., "Casual Leave")
  - Code (e.g., "CL")
  - Days per year (default: 5)
  - Paid/Unpaid status
  
- **Leave Types List**: Display all configured leave types with:
  - Icon badge with leave code
  - Days per year and paid status
  - Edit and delete actions (on hover)
  - Empty state with guidance

#### Backend Integration
- **Model**: LeaveType schema in `backend/models/HRMS.js`
- **Endpoints**:
  - `GET /api/hrms/leave-types` - Fetch all leave types
  - `POST /api/hrms/leave-types` - Create new leave type
- **API Functions** (`lib/api.ts`):
  - `getLeaveTypes()` - Retrieve leave types
  - `createLeaveType(data)` - Create new leave type

---

### 2. Holiday Calendar

#### Purpose
Allows HR administrators to:
- Define official company holidays
- Specify holiday dates and names
- Manage recurring holidays
- Exclude holidays from leave calculations

#### UI Components
- **Input Form**: Add new holidays with:
  - Holiday name (e.g., "New Year's Day")
  - Date picker
  - Active/inactive toggle
  
- **Holidays List**: Display upcoming holidays with:
  - Formatted date display (weekday, month, day, year)
  - Calendar icon
  - Edit and delete actions (on hover)
  - Sorted by date (earliest first)
  - Empty state with guidance

#### Backend Integration
- **Model**: Holiday schema in `backend/models/HRMS.js`
- **Endpoints**:
  - `GET /api/hrms/holidays` - Fetch all holidays
  - `POST /api/hrms/holidays` - Create new holiday
- **API Functions** (`lib/api.ts`):
  - `getHolidays()` - Retrieve holidays
  - `createHoliday(data)` - Create new holiday

---

## Files Modified

### Frontend Components

#### 1. `/app/(admin)/admin/hr/_components/hrms-settings.tsx`
**Changes**:
- Added `Plane` and `CalendarDays` icons from lucide-react
- Imported `createLeaveType` and `createHoliday` API functions
- Updated `ConfigMode` type to include `'leave-types' | 'holidays'`
- Updated `HRMSSettingsProps` interface with `leaveTypes` and `holidays` props
- Added "Leave Types" navigation item with Plane icon
- Added "Holiday Calendar" navigation item with CalendarDays icon
- Implemented Leave Types configuration section with:
  - Info banner explaining purpose
  - Create form (name, code, days inputs)
  - Add button with toast notifications
  - List view with edit/delete actions
  - Empty state
- Implemented Holiday Calendar section with:
  - Info banner explaining purpose
  - Create form (name, date inputs)
  - Add button with toast notifications
  - List view filtered to upcoming holidays
  - Formatted date display
  - Empty state

#### 2. `/app/(admin)/admin/hr/page.tsx`
**Changes**:
- Updated `<HRMSSettings>` component to pass `leaveTypes` and `holidays` props
- Props are already fetched via `Promise.all` in `fetchAll()` function
- Data flows from state to HRMSSettings component

---

## Technical Implementation Details

### Leave Types Schema
```javascript
{
  name: String,           // "Casual Leave"
  code: String,           // "CL"
  days_per_year: Number,  // 5
  is_paid: Boolean,       // true
  requires_approval: Boolean // true
}
```

### Holiday Schema
```javascript
{
  name: String,     // "New Year's Day"
  date: Date,       // "2025-01-01"
  is_active: Boolean // true
}
```

### Data Flow
1. **Main HR Page** (`page.tsx`):
   - Fetches `leaveTypes` via `getLeaveTypes()`
   - Fetches `holidays` via `getHolidays()`
   - Stores in React state
   - Passes to `<HRMSSettings>` component

2. **HRMSSettings Component**:
   - Receives `leaveTypes` and `holidays` as props
   - Renders configuration UI based on selected mode
   - Calls `createLeaveType()` or `createHoliday()` on form submission
   - Triggers `onRefresh()` callback to reload data

3. **API Layer** (`lib/api.ts`):
   - Makes fetch requests to backend routes
   - Handles errors with console warnings
   - Returns parsed JSON or empty arrays

4. **Backend Routes** (`backend/routes/hrms.js`):
   - Validates authentication via middleware
   - Interacts with Mongoose models
   - Returns JSON responses

---

## UI Design Patterns

### Common Card Structure
Both leave types and holidays follow a consistent pattern:
1. **Card Header**: Title + Badge
2. **Info Banner**: Colored banner explaining purpose
3. **Create Section**: Input fields + Add button
4. **List Section**: Border-separated list of items

### Item Display Pattern
- Icon in colored circle (left)
- Name and metadata (center)
- Edit/delete buttons on hover (right)
- Empty state with icon and guidance text

### Color Coding
- **Leave Types**: Blue theme (`bg-blue-100`, `text-blue-700`)
- **Holidays**: Green theme (`bg-green-100`, `text-green-700`)

---

## Testing Checklist

### Leave Types
- [ ] Navigate to HR → Setup → Leave Types
- [ ] Verify empty state displays when no leave types exist
- [ ] Create a new leave type with name "Casual Leave", code "CL", 5 days
- [ ] Verify success toast appears
- [ ] Verify new leave type appears in list
- [ ] Verify leave type shows correct badge, days, and paid status
- [ ] Hover over leave type to see edit/delete buttons
- [ ] Verify error toast for missing name or code
- [ ] Create multiple leave types (Earned, Sick, Unpaid)
- [ ] Verify all appear in list

### Holidays
- [ ] Navigate to HR → Setup → Holiday Calendar
- [ ] Verify empty state displays when no holidays exist
- [ ] Create a new holiday with name "New Year's Day" and date "2025-01-01"
- [ ] Verify success toast appears
- [ ] Verify holiday appears in list with formatted date
- [ ] Verify only upcoming holidays are shown (past dates filtered)
- [ ] Hover over holiday to see edit/delete buttons
- [ ] Verify error toast for missing name or date
- [ ] Create multiple holidays
- [ ] Verify holidays are sorted by date (earliest first)

### Integration Testing
- [ ] Verify data persists after page refresh
- [ ] Verify leave types are available in leave application flow
- [ ] Verify holidays are excluded from working days calculations
- [ ] Test with different date formats and locales

---

## Known Limitations & Future Enhancements

### Current Limitations
1. **Edit Functionality**: Edit buttons exist but not yet implemented
2. **Delete Functionality**: Delete buttons exist but not yet implemented
3. **Validation**: No duplicate code validation for leave types
4. **Recurring Holidays**: No UI for marking holidays as recurring

### Planned Enhancements (Priority 3+)
1. Implement edit modal for leave types and holidays
2. Implement delete confirmation dialog
3. Add import/export functionality for holidays (CSV)
4. Add copy holiday calendar from previous year
5. Add visual calendar view for holidays
6. Add leave type usage analytics
7. Add custom fields for leave types (e.g., carry-forward rules)

---

## Dependencies

### UI Components
- Card, CardHeader, CardTitle, CardContent from `@/components/ui/card`
- Button from `@/components/ui/button`
- Input from `@/components/ui/input`
- Label from `@/components/ui/label`
- Badge from `@/components/ui/badge`
- toast from `@/components/ui/use-toast`
- Plane, CalendarDays, Plus, Pencil, Trash2 icons from `lucide-react`

### API Functions
- `getLeaveTypes()` - lib/api.ts
- `createLeaveType(data)` - lib/api.ts
- `getHolidays()` - lib/api.ts
- `createHoliday(data)` - lib/api.ts

### Backend
- Express routes: `/api/hrms/leave-types`, `/api/hrms/holidays`
- Mongoose models: LeaveType, Holiday
- Auth middleware for protected routes

---

## Security Considerations

### Access Control
- All endpoints protected by `auth` middleware
- Only authenticated users can create/modify leave types and holidays
- **TODO**: Add role-based restrictions (only HR admin should access)

### Input Validation
- Frontend: Required field validation with toast messages
- Backend: Mongoose schema validation
- **TODO**: Add XSS protection for text inputs
- **TODO**: Add date range validation for holidays

---

## Success Metrics

### Implementation Goals ✅
- [x] Create Leave Types configuration UI
- [x] Create Holiday Calendar UI
- [x] Integrate with existing backend endpoints
- [x] Follow established design patterns
- [x] Provide user feedback (toasts)
- [x] Handle empty states gracefully
- [x] Ensure responsive design

### User Experience Goals
- Intuitive navigation to configuration sections
- Clear visual hierarchy with color coding
- Helpful empty states with guidance
- Immediate feedback on actions
- Consistent with existing HR setup sections

---

## Related Documentation

- [Priority 1 Implementation](./HR_MODULE_PRIORITY_1_IMPLEMENTATION.md) - Payroll Approval Workflow
- [HR Module Overview](./MODULE_04_HRMS.md) - Complete HRMS documentation
- [Integration Guide](./INTEGRATION_GUIDE.md) - Cross-module integration patterns

---

## Changelog

### v1.0 - January 2025
- Initial implementation of Leave Types configuration UI
- Initial implementation of Holiday Calendar UI
- Integration with main HR setup page
- Documentation created

---

**Implementation Completed**: Priority 2.1 ✅  
**Next Priority**: 2.2 - Attendance Tracking System
