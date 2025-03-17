# Refactoring Guide: Server Code Restructuring

## Overview

This document outlines the approach taken to refactor the server code from a monolithic structure into a more maintainable, modular architecture. The refactoring focuses on improving code organization, separation of concerns, and maintainability without changing the core functionality.

## Motivation

The original codebase had several issues:

1. **Monolithic Structure**: All routes and business logic were in a single file (server/routes.ts)
2. **Mixed Concerns**: Authentication, business logic, and error handling were intermingled
3. **Limited Separation of Concerns**: Route handlers contained both request processing and business logic
4. **Hard-to-Test Code**: Complex functions with multiple responsibilities made unit testing difficult

## Refactoring Approach

### 1. Folder Structure Reorganization

Created a clear, modular folder structure:

```
server/
├── controllers/  # Request handling
├── middlewares/  # Middleware functions
├── routes/       # Route definitions
├── services/     # Business logic
└── utils/        # Utility functions
```

### 2. Separation of Concerns

- **Routes**: Define API endpoints and use controllers to handle requests
- **Controllers**: Process HTTP requests and responses
- **Services**: Contain business logic and data access
- **Middlewares**: Handle cross-cutting concerns like authentication

### 3. Improved Error Handling

- Created a consistent error handling approach with custom error classes
- Used async middleware to catch and process errors uniformly

### 4. Better Authentication

- Moved authentication logic to dedicated middleware
- Applied authentication consistently across routes that require it

## Specific Improvements

### Booking Functionality

- Created `BookingService` to handle all booking-related business logic
- Implemented `BookingController` to process booking requests
- Defined booking routes in a dedicated router
- Separated blocked slots functionality into its own service and controller

### Error Handling

- Implemented `AppError` class for consistent error creation
- Used the `asyncHandler` utility to avoid try/catch blocks in route handlers
- Standardized error responses

### Request Lifecycle

Before:

```
request → routes.ts → (business logic) → response
```

After:

```
request → router → controller → service → response
```

## Migration Steps

The refactoring was completed in these steps:

1. Create new folder structure
2. Extract business logic to service classes
3. Create controller classes for HTTP handling
4. Define modular route files
5. Update main application entry point
6. Test to ensure all functionality works as before

## Benefits

- **Maintainability**: Smaller, focused files are easier to understand and maintain
- **Testability**: Isolated business logic can be tested independently
- **Scalability**: New features can be added without changing existing code
- **Onboarding**: New developers can understand the codebase more quickly

## Future Improvements

- Add comprehensive unit tests for services and controllers
- Implement input validation with Zod or similar
- Add API documentation with Swagger/OpenAPI
- Consider adding a dependency injection system for better testability
