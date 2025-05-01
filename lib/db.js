import mysql from 'mysql2/promise';

// Database connection configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Set your MySQL password here
  database: 'attendance_system'
};

// Create a connection pool
const pool = mysql.createPool(dbConfig);

// Helper function to execute queries
export async function executeQuery(query, params = []) {
  try {
    const [results] = await pool.execute(query, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Initialize database (create tables if they don't exist)
export async function initializeDatabase() {
  try {
    // Create students table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS students (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        rollNo VARCHAR(50),
        course VARCHAR(100),
        email VARCHAR(255),
        faceDescriptor TEXT,
        registeredAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create attendance_sessions table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS attendance_sessions (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        course VARCHAR(100),
        date DATE NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create attendance_records table (for many-to-many relationship)
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sessionId VARCHAR(36) NOT NULL,
        studentId VARCHAR(36) NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sessionId) REFERENCES attendance_sessions(id),
        FOREIGN KEY (studentId) REFERENCES students(id)
      )
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
} 