import { initializeDatabase } from '../../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  try {
    await initializeDatabase();
    return res.status(200).json({ message: 'Database initialized successfully', success: true });
  } catch (error) {
    console.error('Error initializing database:', error);
    return res.status(500).json({ message: 'Error initializing database: ' + error.message, success: false });
  }
} 