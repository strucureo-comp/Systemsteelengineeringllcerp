# Module 9: Operations

## Overview
Operations management including meetings, planning, support, and resource management.

## Frontend Pages
- **Location**: `app/(admin)/admin/operations/`
- **Sub-modules**:
  - `meetings/` - Meeting management
  - `planning/` - Planning tools
  - `plans/` - Plan management
  - `support/` - Support operations

## Backend Routes
- **Location**: `backend/routes/support-meetings.js`
- **Endpoints**:
  - `GET /api/support-meetings/meetings` - List meetings
  - `POST /api/support-meetings/meetings` - Create meeting
  - `PUT /api/support-meetings/meetings/:id` - Update meeting
  - `GET /api/support-meetings/support` - List support requests
  - `POST /api/support-meetings/support` - Create support request
  - `PUT /api/support-meetings/support/:id` - Update support request

## Backend Routes (Miscellaneous)
- **Location**: `backend/routes/misc.js`
- **Endpoints**:
  - `GET /api/misc/planning-notes` - List planning notes
  - `POST /api/misc/planning-notes` - Create planning note
  - `PUT /api/misc/planning-notes/:id` - Update planning note
  - `DELETE /api/misc/planning-notes/:id` - Delete planning note
  - `GET /api/misc/enquiries` - List enquiries
  - `POST /api/misc/enquiries` - Create enquiry
  - `PUT /api/misc/enquiries/:id` - Update enquiry

## Data Models

### Meeting
```javascript
Meeting {
  meeting_id: String (unique)
  title: String
  description: String
  date: Date
  time: String
  duration: Number (minutes)
  location: String
  attendees: [String] (user emails)
  organizer: String (user email)
  status: 'scheduled' | 'completed' | 'cancelled'
  notes: String
  createdAt, updatedAt: Date
}
```

### SupportRequest
```javascript
SupportRequest {
  request_id: String (unique)
  title: String
  description: String
  category: String
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  assigned_to: String (user email)
  created_by: String (user email)
  resolution_date: Date (optional)
  createdAt, updatedAt: Date
}
```

### PlanningNote
```javascript
PlanningNote {
  note_id: String (unique)
  title: String
  content: String
  category: String
  priority: 'low' | 'medium' | 'high'
  status: 'draft' | 'active' | 'archived'
  created_by: String (user email)
  createdAt, updatedAt: Date
}
```

### Enquiry
```javascript
Enquiry {
  enquiry_id: String (unique)
  name: String
  email: String
  phone: String
  subject: String
  message: String
  status: 'new' | 'in_progress' | 'responded' | 'closed'
  assigned_to: String (user email, optional)
  response: String (optional)
  createdAt, updatedAt: Date
}
```

## API Functions (lib/api.ts)
```typescript
// Meetings
getMeetings() → Meeting[]
getMeeting(id) → Meeting | null
createMeetingRequest(data) → Meeting | null
updateMeeting(id, data) → boolean

// Support Requests
getSupportRequests() → SupportRequest[]
getSupportRequest(id) → SupportRequest | null
createSupportRequest(data) → SupportRequest | null
updateSupportRequest(id, data) → boolean

// Planning Notes
getPlanningNotes() → PlanningNote[]
createPlanningNote(data) → PlanningNote | null
updatePlanningNote(id, data) → boolean
deletePlanningNote(id) → boolean

// Enquiries
getEnquiries() → Enquiry[]
createEnquiry(data) → Enquiry | null
updateEnquiry(id, data) → boolean
```

## Connections to Other Modules

### ↔ Projects Module
- **Trigger**: Resource planning
- **Action**: Provides resource availability and allocation
- **Data Flow**:
  - Resource booking created
  - Employee availability checked
  - Resource allocated to project
  - Availability updated

### ↔ HRMS Module
- **Trigger**: Employee availability
- **Action**: Checks leave calendar and allocation
- **Data Flow**:
  - Employee status checked
  - Leave calendar consulted
  - Resource booking created
  - Availability updated

## Key Workflows

### Meeting Management
1. Create meeting
2. Set date, time, location
3. Add attendees
4. Send invitations
5. Meeting occurs
6. Mark as completed
7. Add meeting notes

### Support Request
1. Support request created
2. Assigned to support team member
3. Status tracked (open → in_progress → resolved)
4. Resolution provided
5. Request closed

### Planning Notes
1. Create planning note
2. Add content and category
3. Set priority
4. Share with team
5. Update as needed
6. Archive when complete

### Enquiry Management
1. Customer enquiry received
2. Assigned to team member
3. Response prepared
4. Response sent
5. Enquiry closed

## Module Access
- **Default**: Enabled for all business types
- **Role**: Operations Manager, Support Staff
- **Setup**: No specific setup required

## Real-time Features
- Meeting scheduling
- Support ticket tracking
- Planning collaboration
- Enquiry management
- Resource availability tracking

## Integration Points
- Projects for resource planning
- HRMS for employee availability
- Sales for customer enquiries
