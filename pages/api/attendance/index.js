import { executeQuery } from '../../../lib/db.js';

export default async function handler(req, res) {
  try {
    switch (req.method) {
      case 'GET':
        // Get all attendance sessions with optional filters
        let query = 'SELECT * FROM attendance_sessions';
        const queryParams = [];
        const conditions = [];
        
        if (req.query.date) {
          conditions.push('date = ?');
          queryParams.push(req.query.date);
        }
        
        if (req.query.course) {
          conditions.push('course = ?');
          queryParams.push(req.query.course);
        }
        
        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ');
        }
        
        const sessions = await executeQuery(query, queryParams);
        
        // For each session, get the students who attended
        for (const session of sessions) {
          const attendees = await executeQuery(`
            SELECT s.id, s.name, ar.timestamp 
            FROM attendance_records ar
            JOIN students s ON ar.studentId = s.id
            WHERE ar.sessionId = ?
          `, [session.id]);
          
          session.students = attendees;
        }
        
        return res.status(200).json(sessions);
      
      case 'POST':
        // Create a new attendance session
        const newSession = {
          id: Date.now().toString(),
          title: req.body.title,
          course: req.body.course || null,
          date: req.body.date || new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString()
        };
        
        await executeQuery(
          'INSERT INTO attendance_sessions (id, title, course, date, createdAt) VALUES (?, ?, ?, ?, ?)',
          [newSession.id, newSession.title, newSession.course, newSession.date, newSession.createdAt]
        );
        
        // Include empty students array
        newSession.students = [];
        
        return res.status(201).json(newSession);
      
      default:
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error handling attendance sessions request:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
} 