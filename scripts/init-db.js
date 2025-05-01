import mysql from 'mysql2/promise';
import { initializeDatabase } from '../lib/db.js';

async function createDatabase() {
  // Connect to MySQL without specifying database
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '' // Set your MySQL password here
  });

  try {
    // Create database if it doesn't exist
    await connection.execute('CREATE DATABASE IF NOT EXISTS attendance_system');
    console.log('Database "attendance_system" created or already exists');
    
    // Close connection
    await connection.end();
    
    // Initialize tables
    await initializeDatabase();
    
    console.log('Database setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

createDatabase(); 