import { executeQuery } from '../../../lib/db.js';

export default async function handler(req, res) {
  const { id } = req.query;
  
  try {
    // Find the attendance session by ID
    const session = await executeQuery('SELECT * FROM attendance_sessions WHERE id = ?', [id]);
    
    if (session.length === 0) {
      return res.status(404).json({ message: 'Attendance session not found' });
    }
    
    switch (req.method) {
      case 'GET':
        // Get the session data
        const attendees = await executeQuery(`
          SELECT s.id, s.name, ar.timestamp 
          FROM attendance_records ar
          JOIN students s ON ar.studentId = s.id
          WHERE ar.sessionId = ?
        `, [id]);
        
        session[0].students = attendees;
        
        // Return the attendance session
        return res.status(200).json(session[0]);
      
      case 'PUT':
        // Update the attendance session
        const updateData = req.body;
        
        await executeQuery(
          'UPDATE attendance_sessions SET title = ?, course = ?, date = ? WHERE id = ?',
          [
            updateData.title || session[0].title,
            updateData.course || session[0].course,
            updateData.date || session[0].date,
            id
          ]
        );
        
        // Get the updated session
        const updatedSession = await executeQuery('SELECT * FROM attendance_sessions WHERE id = ?', [id]);
        
        // Get the updated attendees
        const updatedAttendees = await executeQuery(`
          SELECT s.id, s.name, ar.timestamp 
          FROM attendance_records ar
          JOIN students s ON ar.studentId = s.id
          WHERE ar.sessionId = ?
        `, [id]);
        
        updatedSession[0].students = updatedAttendees;
        
        return res.status(200).json(updatedSession[0]);
      
      case 'DELETE':
        // First delete the attendance records associated with this session
        await executeQuery('DELETE FROM attendance_records WHERE sessionId = ?', [id]);
        
        // Then delete the session itself
        await executeQuery('DELETE FROM attendance_sessions WHERE id = ?', [id]);
        
        return res.status(200).json({ message: 'Attendance session deleted successfully', id });
      
      default:
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error handling attendance session request:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
} 