# HR Module - Priority 2.2: Attendance Tracking System

## Implementation Summary

**Date**: March 2026  
**Scope**: Attendance Tracking with Calendar View and Bulk Upload  
**Status**: ✅ Completed

---

## Overview

This document covers the implementation of the Attendance Tracking System in the HR module's Field Operations section. The system provides a calendar/grid view for tracking daily employee attendance, bulk CSV upload capabilities, automatic leave integration, and attendance percentage calculations.

---

## Features Implemented

### 1. Attendance Calendar Grid

#### Purpose
Provides HR administrators with a comprehensive monthly view of employee attendance:
- Visual calendar grid showing all employees and dates
- Color-coded status indicators (Present, Absent, Half-Day, Leave, Holiday)
- Real-time attendance percentage per employee
- Month and year selection

#### UI Components
- **Month/Year Selector**: Navigate through different time periods
- **Attendance Grid**: 
  - Rows: Active employees with names and avatars
  - Columns: Days of the month (1-31)
  - Each cell shows attendance status with color coding
  - Sticky header and employee column for easy navigation
  - Attendance percentage column with color-coded badges

#### Status Indicators
- **P** (Present): Green background - `bg-emerald-100 text-emerald-700`
- **A** (Absent): Red background - `bg-red-100 text-red-700`
- **H** (Half Day): Yellow background - `bg-yellow-100 text-yellow-700`
- **L** (Leave): Blue background - `bg-blue-100 text-blue-700`
- **X** (Holiday): Purple background - `bg-purple-100 text-purple-700`
- **—** (Not Marked): Gray background - `bg-gray-100 text-gray-400`

---

### 2. Manual Attendance Marking

#### Purpose
Allows HR to record individual attendance entries:
- Select employee from dropdown
- Choose date
- Set status (Present, Absent, Half-Day, Leave, Holiday)
- Record check-in and check-out times

#### Workflow
1. Click "Mark Attendance" button
2. Select employee from active employees list
3. Choose date using date picker
4. Select attendance status
5. Enter check-in time (default: 09:00)
6. Enter check-out time (default: 17:00)
7. Submit to record attendance

---

### 3. Bulk CSV Upload

#### Purpose
Enables efficient mass attendance recording:
- Upload multiple attendance records at once
- Download CSV template for proper formatting
- Batch processing with upsert logic (update or insert)

#### CSV Format
```csv
employee_id,date,status,check_in,check_out
65f1234567890abcdef12345,2026-03-07,present,09:00,17:00
65f1234567890abcdef12346,2026-03-07,absent,,,
```

#### Workflow
1. Click "Bulk Upload" button
2. Download template (optional) to see format
3. Prepare CSV file with attendance data
4. Select CSV file
5. Upload - system processes all records
6. Success message shows inserted/modified counts

#### Validation
- Validates CSV structure
- Filters out records without employee_id or date
- Uses upsert logic (updates existing, inserts new)
- Reports success/failure counts

---

### 4. Leave Integration

#### Purpose
Automatically marks employees on approved leave:
- Checks approved leave applications
- Auto-displays "L" (Leave) status for dates within leave period
- Prevents double-entry of attendance and leave data

#### Implementation
- `isOnLeave()` function checks if employee has approved leave for specific date
- Compares date against `from_date` and `to_date` of approved leaves
- Takes precedence over manual attendance entries in display
- Shows blue "L" badge with leave icon

---

### 5. Attendance Percentage Calculation

#### Purpose
Provides quick attendance metrics per employee:
- Calculates percentage of days present
- Shows present days / total attending days
- Color-coded badges based on thresholds

#### Calculation Logic
```javascript
present_days = count of 'present' + 'half-day' statuses
total_days = total attendance records for the month
percentage = (present_days / total_days) * 100
```

#### Badge Colors
- **Green** (≥90%): Excellent attendance
- **Secondary** (75-89%): Good attendance  
- **Red** (<75%): Poor attendance - needs attention

---

## Files Modified/Created

### Backend

#### 1. `/backend/routes/hrms.js`
**Changes**:
- Added `POST /api/hrms/attendance/bulk` endpoint
- Accepts array of attendance records
- Uses MongoDB `bulkWrite()` for efficient batch operations
- Returns inserted/modified counts

**Endpoint Signature**:
```javascript
POST /api/hrms/attendance/bulk
Body: { records: Array<{ employee_id, date, status, check_in, check_out }> }
Response: { success: true, inserted: number, modified: number, total: number }
```

### Frontend

#### 2. `/lib/api.ts`
**Changes**:
- Added `bulkUploadAttendance(records)` function
- Makes POST request to bulk upload endpoint
- Handles errors with console warnings

**Function Signature**:
```typescript
export async function bulkUploadAttendance(records: any[]): Promise<any>
```

#### 3. `/app/(admin)/admin/hr/_components/attendance-tracking.tsx` (NEW)
**Purpose**: Main attendance tracking component with grid view

**Key Features**:
- Month/year selection state management
- Attendance grid rendering with dynamic days
- Status calculation and color coding
- Leave integration check
- Manual attendance marking dialog
- CSV bulk upload dialog with template download
- Attendance percentage calculation per employee
- Legend for status indicators

**Props Interface**:
```typescript
interface AttendanceTrackingProps {
  employees: Employee[];
  attendance: Attendance[];
  leaves: Leave[];
  onRefresh: () => void;
}
```

**Key Functions**:
- `getAttendanceStats(employeeId)` - Calculate attendance percentage
- `isOnLeave(employeeId, date)` - Check if employee on approved leave
- `getAttendanceStatus(employeeId, day)` - Get status for grid cell
- `handleMarkAttendance()` - Submit single attendance record
- `handleFileUpload()` - Process and upload CSV
- `downloadTemplate()` - Generate CSV template

#### 4. `/app/(admin)/admin/hr/page.tsx`
**Changes**:
- Imported `AttendanceTracking` component
- Updated "Field Ops" tab to include sub-tabs:
  - "Attendance Tracking" (new)
  - "Leave Management" (existing)
- Passes `employees`, `attendance`, `leaves` props to AttendanceTracking

---

## Technical Implementation Details

### Attendance Schema (Existing)
```javascript
{
  employee_id: ObjectId,        // Reference to Employee
  date: Date,                   // Attendance date
  status: String,               // 'present', 'absent', 'leave', 'holiday', 'half-day'
  check_in: String,             // "09:00"
  check_out: String,            // "17:00"
  overtime_hours: Number,       // Default: 0
  project_id: String,           // Optional project link
  notes: String                 // Optional notes
}
```

### Data Flow

1. **Page Load**:
   - Main HR page fetches all data via `Promise.all`
   - `getEmployees()`, `getAttendance()`, `getLeaves()` called
   - Data stored in React state
   - Passed to AttendanceTracking component

2. **Grid Rendering**:
   - Component calculates days in selected month
   - Maps over active employees
   - For each employee-date combination, calls `getAttendanceStatus()`
   - Status function checks: approved leave → attendance record → default
   - Renders color-coded badge with status

3. **Manual Marking**:
   - User fills form in dialog
   - Calls `markAttendance()` API function
   - Backend uses `findOneAndUpdate` with upsert
   - Triggers `onRefresh()` to reload data
   - Grid updates automatically

4. **Bulk Upload**:
   - User selects CSV file
   - Frontend reads file as text
   - Parses CSV into array of records
   - Calls `bulkUploadAttendance(records)` API function
   - Backend uses MongoDB `bulkWrite()` for efficiency
   - Returns success metrics
   - Triggers `onRefresh()` to reload data

5. **Leave Integration**:
   - `isOnLeave()` checks approved leaves array
   - Compares date against `from_date` and `to_date`
   - Returns true if date falls within any approved leave
   - Grid display prioritizes leave status over attendance record

---

## UI Design Patterns

### Grid Layout
- **Sticky Column**: Employee name column remains visible on horizontal scroll
- **Sticky Header**: Day numbers remain visible on vertical scroll
- **Compact Cells**: 40px min-width for date columns, 7px height cells
- **Hover Effects**: Row highlights on hover for better visibility
- **Responsive**: Grid scrolls horizontally on mobile

### Color Coding
Consistent color system across the application:
- **Success/Present**: Emerald green
- **Danger/Absent**: Red
- **Warning/Half-Day**: Yellow
- **Info/Leave**: Blue
- **Holiday**: Purple
- **Neutral/Not Marked**: Gray

### Dialog Components
- **Mark Attendance**: Single record entry with form validation
- **Bulk Upload**: CSV upload with template download link
- Both dialogs use consistent styling and validation patterns

---

## Testing Checklist

### Manual Attendance Marking
- [ ] Navigate to HR → Field Ops → Attendance Tracking
- [ ] Click "Mark Attendance" button
- [ ] Select an active employee
- [ ] Choose today's date
- [ ] Set status to "Present" with check-in 09:00, check-out 17:00
- [ ] Submit and verify success toast
- [ ] Check grid updates with "P" in today's column for that employee
- [ ] Mark same employee for another date
- [ ] Try marking with different statuses (Absent, Half-Day, etc.)

### Bulk CSV Upload
- [ ] Click "Bulk Upload" button
- [ ] Click "Download Template" and verify CSV format
- [ ] Create CSV with 5 attendance records for different employees
- [ ] Upload CSV file
- [ ] Verify success message with correct counts
- [ ] Check grid updates with all uploaded records
- [ ] Try uploading duplicate dates (should update existing records)
- [ ] Try uploading invalid CSV and verify error handling

### Leave Integration
- [ ] Go to Leave Management sub-tab
- [ ] Approve a leave request for an employee (e.g., 3 days)
- [ ] Go back to Attendance Tracking
- [ ] Verify employee shows "L" (blue) for all leave dates automatically
- [ ] Verify leave days don't require manual attendance marking
- [ ] Try to manually mark attendance for a leave day
- [ ] Verify leave status takes precedence in display

### Attendance Percentage
- [ ] Mark attendance for an employee for 20 days (18 present, 2 absent)
- [ ] Verify attendance % shows 90% (18/20)
- [ ] Verify badge is green (≥90%)
- [ ] Mark 5 more days absent (total 18/25 = 72%)
- [ ] Verify badge turns red (<75%)
- [ ] Check that half-day counts as present
- [ ] Verify leave days are included in total count

### Grid Functionality
- [ ] Select different months using month selector
- [ ] Verify grid updates with correct days for each month
- [ ] Test February (28/29 days), March (31 days)
- [ ] Scroll grid horizontally and verify sticky employee column
- [ ] Scroll vertically and verify sticky header row
- [ ] Test with 0 employees (verify empty state)
- [ ] Test with 50+ employees (verify performance)

### Integration Testing
- [ ] Mark attendance for today
- [ ] Check HR Dashboard shows updated attendance count
- [ ] Apply and approve a leave
- [ ] Verify attendance grid auto-shows leave status
- [ ] Generate payroll and verify attendance data used
- [ ] Test with employees in different departments

---

## Known Limitations & Future Enhancements

### Current Limitations
1. **No Edit Mode**: Cannot edit existing attendance records from grid (must re-mark)
2. **No Notes**: Notes field not exposed in UI
3. **No Overtime Display**: Overtime hours not visible in grid
4. **No Filters**: Cannot filter by department or status
5. **Fixed Time Format**: Check-in/out times in 24-hour format only
6. **No Mobile Optimization**: Grid requires horizontal scroll on mobile

### Planned Enhancements (Priority 3+)
1. Click cells to edit attendance directly
2. Add notes popup when hovering over cells
3. Show overtime hours indicator in cells
4. Add department filter dropdown
5. Add search/filter for employees
6. Export attendance report to Excel
7. Add geolocation tracking for check-in/out
8. Mobile app integration for real-time marking
9. Biometric integration (fingerprint, face recognition)
10. Shift management (multiple shifts, night shift support)
11. Weekly view toggle
12. Comparison view (month-to-month)
13. Anomaly detection (unusual patterns)

---

## Dependencies

### UI Components
- Card, CardHeader, CardTitle, CardContent
- Button, Badge, Dialog, Input, Label, Select
- Tabs, TabsList, TabsTrigger, TabsContent
- toast (sonner)
- lucide-react icons: Calendar, Upload, Download, CheckCircle2, XCircle, Clock, Plane, AlertCircle

### Backend
- Express routes: `/api/hrms/attendance`, `/api/hrms/attendance/bulk`
- Mongoose models: Attendance, Leave
- MongoDB bulkWrite for efficient batch operations

### API Functions
- `getAttendance(date?)` - Fetch attendance records
- `markAttendance(data)` - Create/update single record
- `bulkUploadAttendance(records)` - Batch upload
- `getLeaves()` - Fetch leave data for integration

---

## Security Considerations

### Access Control
- All endpoints protected by `auth` middleware
- Only authenticated users can mark/upload attendance
- **TODO**: Add role-based restrictions (only HR admin/manager should access)

### Data Validation
- Frontend validates required fields (employee_id, date)
- Backend validates date format and employee existence
- CSV parser filters invalid records
- **TODO**: Add date range restrictions (no future dates beyond 1 day)
- **TODO**: Add duplicate detection alerts

### Performance
- Uses MongoDB indexes on `employee_id` and `date`
- Unique compound index prevents duplicate entries
- BulkWrite operations optimized for large uploads
- **TODO**: Add pagination for large employee lists (100+)
- **TODO**: Add caching for frequently accessed months

---

## Success Metrics

### Implementation Goals ✅
- [x] Create monthly calendar grid view
- [x] Implement color-coded status indicators
- [x] Add manual attendance marking with time fields
- [x] Implement CSV bulk upload with template
- [x] Integrate approved leaves automatically
- [x] Calculate and display attendance percentages
- [x] Add legend for status codes
- [x] Ensure responsive and scrollable grid
- [x] Handle empty states gracefully

### User Experience Goals ✅
- Intuitive navigation between Attendance and Leave Management
- Clear visual hierarchy with color coding
- Real-time feedback with toast notifications
- Easy bulk operations via CSV
- Automatic leave integration reduces manual work
- Quick identification of attendance issues via percentage badges

---

## Performance Metrics

### Expected Load
- **Employees**: 50-200 active employees
- **Days per month**: 28-31 days
- **Grid cells**: ~1,500-6,200 cells rendered
- **Records per month**: ~1,000-4,000 attendance records

### Optimization Strategies
- **React useMemo**: Memoize expensive calculations (stats, filters)
- **Sticky positioning**: CSS-only, no JS scroll listeners
- **Lazy loading**: Only render visible employees (TODO for 200+ employees)
- **MongoDB indexes**: Fast lookups on employee_id + date composite key

---

## Related Documentation

- [Priority 2.1 Implementation](./HR_MODULE_PRIORITY_2.1_LEAVE_TYPES_IMPLEMENTATION.md) - Leave Types Configuration
- [Priority 1 Implementation](./HR_MODULE_PRIORITY_1_IMPLEMENTATION.md) - Payroll Approval Workflow
- [HR Module Overview](./MODULE_04_HRMS.md) - Complete HRMS documentation

---

## Changelog

### v1.0 - March 2026
- Initial implementation of Attendance Tracking System
- Monthly calendar grid view with color-coded statuses
- Manual attendance marking dialog
- Bulk CSV upload with template download
- Automatic approved leave integration
- Attendance percentage calculations with color-coded badges
- Sub-tabs in Field Ops: Attendance Tracking + Leave Management
- Documentation created

---

**Implementation Completed**: Priority 2.2 ✅  
**Next Steps**: Priority 3 - Employee Registry Fields, Configuration Preview, Holiday Calendar Enhancements
