import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Student Attendance System
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            A simple, efficient way to manage student attendance using facial recognition technology
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-8">
              <div className="text-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-center mb-4">Register Students</h2>
              <p className="text-gray-600 mb-6 text-center">
                Register new students with facial recognition for quick identification
              </p>
              <div className="text-center">
                <Link href="/register" className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-md transition-colors">
                  Register
                </Link>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-8">
              <div className="text-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-center mb-4">Take Attendance</h2>
              <p className="text-gray-600 mb-6 text-center">
                Mark attendance using facial recognition - quick, accurate and efficient
              </p>
              <div className="text-center">
                <Link href="/take-attendance" className="inline-block bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-6 rounded-md transition-colors">
                  Take Attendance
                </Link>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-8">
              <div className="text-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-center mb-4">Setup Database</h2>
              <p className="text-gray-600 mb-6 text-center">
                Initialize the database for storing students and attendance records
              </p>
              <div className="text-center">
                <button 
                  onClick={async () => {
                    try {
                      if (confirm('Initialize the database? This will create all required tables.')) {
                        const res = await fetch('/api/setup-db', { method: 'POST' });
                        const data = await res.json();
                        alert(data.message || 'Database setup complete!');
                      }
                    } catch (error) {
                      console.error('Error setting up database:', error);
                      alert('Error setting up database: ' + error.message);
                    }
                  }}
                  className="inline-block bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-6 rounded-md transition-colors"
                >
                  Setup Database
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 