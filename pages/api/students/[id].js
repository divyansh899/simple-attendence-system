import { executeQuery } from '../../../lib/db.js';

export default async function handler(req, res) {
  const { id } = req.query;
  
  try {
    // Find the student by ID
    const student = await executeQuery('SELECT * FROM students WHERE id = ?', [id]);
    
    if (student.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    switch (req.method) {
      case 'GET':
        // Return the student details
        return res.status(200).json(student[0]);
      
      case 'PUT':
        // Update student details
        const updateData = req.body;
        
        await executeQuery(
          'UPDATE students SET name = ?, rollNo = ?, course = ?, email = ?, faceDescriptor = ? WHERE id = ?',
          [
            updateData.name || student[0].name,
            updateData.rollNo || student[0].rollNo,
            updateData.course || student[0].course,
            updateData.email || student[0].email,
            updateData.faceDescriptor || student[0].faceDescriptor,
            id
          ]
        );
        
        // Get the updated student
        const updatedStudent = await executeQuery('SELECT * FROM students WHERE id = ?', [id]);
        return res.status(200).json(updatedStudent[0]);
      
      case 'DELETE':
        // Remove the student
        await executeQuery('DELETE FROM students WHERE id = ?', [id]);
        return res.status(200).json({ message: 'Student deleted successfully', id });
      
      default:
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error handling student request:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
} 