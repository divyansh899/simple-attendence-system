import { executeQuery } from '../../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  
  const { attendanceId, studentId } = req.body;
  
  if (!attendanceId || !studentId) {
    return res.status(400).json({ message: 'Missing required fields: attendanceId or studentId' });
  }
  
  try {
    // Check if the attendance session exists
    const session = await executeQuery('SELECT * FROM attendance_sessions WHERE id = ?', [attendanceId]);
    
    if (session.length === 0) {
      return res.status(404).json({ message: 'Attendance session not found' });
    }
    
    // Check if the student exists
    const student = await executeQuery('SELECT * FROM students WHERE id = ?', [studentId]);
    
    if (student.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Check if student is already marked present
    const existingRecord = await executeQuery(
      'SELECT * FROM attendance_records WHERE sessionId = ? AND studentId = ?',
      [attendanceId, studentId]
    );
    
    if (existingRecord.length > 0) {
      return res.status(400).json({ message: 'Student already marked present' });
    }
    
    // Mark the student as present in the attendance record
    const timestamp = new Date().toISOString();
    
    await executeQuery(
      'INSERT INTO attendance_records (sessionId, studentId, timestamp) VALUES (?, ?, ?)',
      [attendanceId, studentId, timestamp]
    );
    
    // Return the attendance record
    const studentAttendance = {
      id: studentId,
      name: student[0].name,
      timestamp
    };
    
    return res.status(200).json(studentAttendance);
  } catch (error) {
    console.error('Error marking attendance:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
} 