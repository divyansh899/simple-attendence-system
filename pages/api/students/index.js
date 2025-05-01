import { executeQuery } from '../../../lib/db.js';

export default async function handler(req, res) {
  try {
    switch (req.method) {
      case 'GET':
        // Return all students
        const students = await executeQuery('SELECT * FROM students');
        return res.status(200).json(students);
      
      case 'POST':
        // Create a new student
        const student = {
          id: Date.now().toString(),
          ...req.body,
          registeredAt: new Date().toISOString()
        };
        
        // Insert the student into the database
        await executeQuery(
          'INSERT INTO students (id, name, rollNo, course, email, faceDescriptor, registeredAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            student.id, 
            student.name, 
            student.rollNo || null, 
            student.course || null, 
            student.email || null, 
            student.faceDescriptor || null, 
            student.registeredAt
          ]
        );
        
        return res.status(201).json(student);
      
      default:
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error handling students request:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
} 