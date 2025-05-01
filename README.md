# Student Attendance System with Face Recognition

A simple web-based system for managing student attendance using facial recognition.

## Database Setup

This project uses MySQL as the database. Follow these steps to set up the database:

1. Make sure you have MySQL installed and running on your system.

2. Update your MySQL connection settings in these files:
   - `/lib/db.js` - Main database connection configuration
   - `/scripts/init-db.js` - Database initialization script

3. Run the database initialization script:
   ```bash
   npm run init-db
   ```

This will create the necessary database and tables:
- `students` - Stores student information and face descriptors
- `attendance_sessions` - Stores attendance sessions
- `attendance_records` - Stores attendance records linking students to sessions

## Running the Application

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- Student management with facial recognition
- Attendance tracking
- Reporting and analytics
- Face-based attendance marking

## API Endpoints

### Students
- `GET /api/students` - List all students
- `POST /api/students` - Create a new student
- `GET /api/students/[id]` - Get a specific student
- `PUT /api/students/[id]` - Update a student
- `DELETE /api/students/[id]` - Delete a student

### Attendance
- `GET /api/attendance` - List all attendance sessions
- `POST /api/attendance` - Create a new attendance session
- `GET /api/attendance/[id]` - Get a specific attendance session
- `PUT /api/attendance/[id]` - Update an attendance session
- `DELETE /api/attendance/[id]` - Delete an attendance session
- `POST /api/attendance/mark` - Mark a student as present 