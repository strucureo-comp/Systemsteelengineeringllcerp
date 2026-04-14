# BridgeBreak ERP - Complete Module Documentation

## Overview
This document provides a detailed breakdown of all modules, their responsibilities, internal components, and connections to other modules.

---

## TABLE OF CONTENTS
1. [System Architecture](#system-architecture)
2. [Module Breakdown](#module-breakdown)
3. [Data Flow Between Modules](#data-flow-between-modules)
4. [API Layer](#api-layer)
5. [Authentication & Authorization](#authentication--authorization)
6. [Module Access Control](#module-access-control)

---

## SYSTEM ARCHITECTURE

### Frontend Stack
- **Framework**: Next.js 13.5.1 (App Router)
- **Language**: TypeScript + React 18
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + 45+ custom components
- **State Management**: React Context (Auth, Tenant)
- **HTTP Client**: Fetch API with custom wrapper

### Backend Stack
- **Framework**: Express.js
- **Language**: Node.js (JavaScript)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (7-day expiry)
- **Password Hashing**: bcryptjs (12 rounds)

### Entry Points
- **Frontend Root**: `app/page.tsx` → redirects to `/admin/dashboard`
- **Root Layout**: `app/layout.tsx` → wraps with `AuthProvider` + `TenantProvider`
- **Backend Server**: `backend/server.js` → Express app with 20 route files

---

## MODULE BREAKDOWN

