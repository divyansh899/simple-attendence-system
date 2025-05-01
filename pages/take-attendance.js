import { useState, useEffect } from 'react';
import Head from 'next/head';
import Camera from '../components/Camera';
import { loadModels, getFaceDescriptor, findBestMatch, areModelsLoaded } from '../lib/faceRecognition';

export default function TakeAttendance() {
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [recognizedStudent, setRecognizedStudent] = useState(null);
  const [attendanceMarked, setAttendanceMarked] = useState([]);
  const [debugInfo, setDebugInfo] = useState({});
  
  // Load face-api.js models and data on component mount
  useEffect(() => {
    const initialize = async () => {
      setStatus('Initializing system...');
      setError(null);
      
      try {
        // Check if we're in browser environment
        if (typeof window === 'undefined') {
          throw new Error('Cannot initialize in server-side rendering');
        }
        
        setDebugInfo(prev => ({ ...prev, initializeAttempt: new Date().toISOString() }));
        
        // Load face recognition models with timeout
        setStatus('Loading face recognition models...');
        
        const modelsLoaded = await Promise.race([
          loadModels(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Model loading timed out after 60 seconds')), 60000)
          )
        ]);
        
        if (!modelsLoaded) {
          throw new Error('Failed to load face recognition models');
        }
        
        setDebugInfo(prev => ({ ...prev, modelsLoaded: true }));
        
        // Fetch data in parallel for efficiency
        setStatus('Fetching data...');
        
        const [sessionsResponse, studentsResponse] = await Promise.all([
          fetch('/api/attendance'),
          fetch('/api/students')
        ]);
        
        // Check each response individually for better error handling
        if (!sessionsResponse.ok) {
          throw new Error(`Failed to fetch attendance sessions: ${sessionsResponse.status} ${sessionsResponse.statusText}`);
        }
        
        if (!studentsResponse.ok) {
          throw new Error(`Failed to fetch students: ${studentsResponse.status} ${studentsResponse.statusText}`);
        }
        
        // Parse the responses
        const sessionsData = await sessionsResponse.json();
        const studentsData = await studentsResponse.json();
        
        setSessions(sessionsData);
        setStudents(studentsData);
        
        setDebugInfo(prev => ({ 
          ...prev, 
          sessionsLoaded: sessionsData.length,
          studentsLoaded: studentsData.length,
          studentsWithFace: studentsData.filter(s => s.faceDescriptor).length
        }));
        
        // Check if we have enough data to operate
        if (studentsData.length === 0) {
          setStatus('No students registered. Please register students first.');
        } else if (studentsData.filter(s => s.faceDescriptor).length === 0) {
          setStatus('No students have face data. Please register students with faces.');
        } else if (sessionsData.length === 0) {
          setStatus('No attendance sessions. Create a new session to begin.');
        } else {
          setStatus('System ready. Select a session to begin.');
        }
      } catch (error) {
        console.error('Initialization error:', error);
        setError(`Setup error: ${error.message}`);
        setStatus('Error during initialization');
        setDebugInfo(prev => ({ 
          ...prev, 
          initError: error.message,
          initStack: error.stack
        }));
      } finally {
        setIsModelLoading(false);
      }
    };
    
    initialize();
  }, []);
  
  // Load attendance records when a session is selected
  useEffect(() => {
    if (selectedSession) {
      fetchAttendanceMarked(selectedSession);
    }
  }, [selectedSession]);
  
  // Fetch students who have been marked present in the selected session
  const fetchAttendanceMarked = async (sessionId) => {
    try {
      setStatus('Fetching attendance data...');
      setError(null);
      
      const response = await fetch(`/api/attendance/${sessionId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch attendance data: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setAttendanceMarked(data.students || []);
      
      setDebugInfo(prev => ({ 
        ...prev, 
        attendanceLoaded: (data.students || []).length,
        sessionTitle: data.title,
        sessionDate: data.date
      }));
      
      setStatus(`Session "${data.title}" loaded with ${data.students?.length || 0} students`);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      setError(`Error fetching attendance: ${error.message}`);
      setStatus('Error fetching attendance records');
      setDebugInfo(prev => ({ 
        ...prev, 
        attendanceError: error.message
      }));
    }
  };
  
  // Handle session selection
  const handleSessionChange = (e) => {
    setSelectedSession(e.target.value);
    setRecognizedStudent(null);
    setCapturedImage(null);
  };
  
  // Handle image capture from camera
  const handleCapture = async (imageDataURL) => {
    if (!selectedSession) {
      setStatus('Please select an attendance session first');
      setError('No session selected');
      return;
    }
    
    setCapturedImage(imageDataURL);
    setStatus('Recognizing face...');
    setError(null);
    
    try {
      setDebugInfo(prev => ({ 
        ...prev, 
        captureAttempt: new Date().toISOString(),
        imageSize: imageDataURL ? Math.round(imageDataURL.length / 1024) + 'KB' : 'N/A'
      }));
      
      // Check if models are loaded first
      if (!areModelsLoaded()) {
        setStatus('Face models still loading. Please wait...');
        setDebugInfo(prev => ({ ...prev, captureWhileLoading: true }));
        
        try {
          // Wait for models to load with a timeout
          const loaded = await Promise.race([
            loadModels(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Model loading timed out')), 30000)
            )
          ]);
          
          if (!loaded) {
            throw new Error('Failed to load models');
          }
        } catch (modelError) {
          throw new Error(`Face model loading failed: ${modelError.message}`);
        }
      }
      
      // Create an image element from the data URL
      const img = new Image();
      img.src = imageDataURL;
      
      // Wait for image to load
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Failed to load captured image'));
        // Set a timeout in case the image never loads
        setTimeout(() => reject(new Error('Image load timeout')), 3000);
      });
      
      setDebugInfo(prev => ({ 
        ...prev, 
        imageLoaded: true,
        imageWidth: img.width,
        imageHeight: img.height
      }));
      
      // Get face descriptor
      setStatus('Detecting face features...');
      const descriptor = await getFaceDescriptor(img);
      
      if (!descriptor) {
        setError('No face detected in image');
        setStatus('No face detected. Please try again with a clearer photo.');
        setDebugInfo(prev => ({ ...prev, faceDetected: false }));
        return;
      }
      
      setDebugInfo(prev => ({ 
        ...prev, 
        faceDetected: true,
        descriptorLength: descriptor.length
      }));
      
      // Find matching student
      setStatus('Searching for matching student...');
      const match = findBestMatch(descriptor, students);
      
      if (match && match.similarity > 0.6) {
        setRecognizedStudent({
          ...match.student,
          similarity: match.similarity
        });
        
        setDebugInfo(prev => ({ 
          ...prev, 
          matchFound: true,
          matchName: match.student.name,
          matchScore: match.similarity,
          matchThreshold: 0.6
        }));
        
        // Check if student is already marked present
        const alreadyMarked = attendanceMarked.some(
          s => s.id === match.student.id
        );
        
        if (alreadyMarked) {
          setStatus(`Recognized ${match.student.name}, already marked present`);
        } else {
          setStatus(`Recognized student: ${match.student.name}`);
        }
      } else {
        setRecognizedStudent(null);
        setStatus('No matching student found. Please try again or register this student.');
        setError('No matching student found');
        
        setDebugInfo(prev => ({ 
          ...prev, 
          matchFound: false,
          bestSimilarity: match?.similarity || 0,
          matchThreshold: 0.6
        }));
      }
    } catch (error) {
      console.error('Error processing face:', error);
      setError(`Face recognition error: ${error.message}`);
      setStatus('Error recognizing face. Please try again.');
      setDebugInfo(prev => ({ 
        ...prev, 
        faceProcessError: error.message,
        faceProcessStack: error.stack
      }));
    }
  };
  
  // Mark attendance for the recognized student
  const markAttendance = async () => {
    if (!recognizedStudent || !selectedSession) {
      setError('Cannot mark attendance: no recognized student or no session selected');
      return;
    }
    
    // Check if already marked
    const alreadyMarked = attendanceMarked.some(
      s => s.id === recognizedStudent.id
    );
    
    if (alreadyMarked) {
      setStatus(`${recognizedStudent.name} is already marked present`);
      return;
    }
    
    setStatus('Marking attendance...');
    setError(null);
    
    try {
      const response = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          attendanceId: selectedSession,
          studentId: recognizedStudent.id
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to mark attendance: ${errorData.message || response.statusText}`);
      }
      
      // Update attendance records
      await fetchAttendanceMarked(selectedSession);
      
      setStatus(`${recognizedStudent.name} marked present successfully`);
      
      // Reset for next student
      setTimeout(() => {
        setCapturedImage(null);
        setRecognizedStudent(null);
      }, 3000);
    } catch (error) {
      console.error('Error marking attendance:', error);
      setError(`Attendance error: ${error.message}`);
      setStatus('Error marking attendance. Please try again.');
      setDebugInfo(prev => ({ 
        ...prev, 
        markAttendanceError: error.message
      }));
    }
  };
  
  // Create a new attendance session
  const createNewSession = async () => {
    try {
      setError(null);
      const title = prompt('Enter a title for the new attendance session:');
      if (!title) return;
      
      const course = prompt('Enter course name (optional):');
      
      setStatus('Creating new session...');
      
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          course,
          date: new Date().toISOString().split('T')[0]
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to create session: ${errorData.message || response.statusText}`);
      }
      
      const newSession = await response.json();
      
      // Update sessions list
      setSessions(prev => [...prev, newSession]);
      setSelectedSession(newSession.id);
      setStatus(`New attendance session "${title}" created`);
    } catch (error) {
      console.error('Error creating attendance session:', error);
      setError(`Session creation error: ${error.message}`);
      setStatus('Error creating attendance session. Please try again.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Head>
        <title>Take Attendance - Attendance System</title>
      </Head>
      
      <h1 className="text-3xl font-bold mb-8 text-center">Take Attendance</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-1">Status: {status}</p>
          {error && (
            <p className="text-sm text-red-500 mb-2">Error: {error}</p>
          )}
        </div>
        
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-grow">
              <label htmlFor="session" className="block text-sm font-medium text-gray-700 mb-1">
                Select Attendance Session
              </label>
              <select
                id="session"
                value={selectedSession}
                onChange={handleSessionChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={isModelLoading}
              >
                <option value="">-- Select Session --</option>
                {sessions.map(session => (
                  <option key={session.id} value={session.id}>
                    {session.title} - {session.date} ({session.course || 'No course'})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mt-6">
              <button
                onClick={createNewSession}
                className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md"
                disabled={isModelLoading}
              >
                New Session
              </button>
            </div>
          </div>
        </div>
        
        {selectedSession && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">Face Recognition</h2>
              
              {isModelLoading ? (
                <div className="text-center py-8">
                  <p>Loading face recognition models...</p>
                </div>
              ) : (
                <>
                  {capturedImage ? (
                    <div className="mb-4">
                      <img
                        src={capturedImage}
                        alt="Captured face"
                        className="max-w-full h-auto rounded-lg mx-auto"
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setCapturedImage(null);
                            setRecognizedStudent(null);
                            setError(null);
                          }}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-1 px-3 rounded-md text-sm"
                        >
                          Try Again
                        </button>
                        
                        {recognizedStudent && (
                          <button
                            onClick={markAttendance}
                            className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded-md text-sm"
                            disabled={attendanceMarked.some(s => s.id === recognizedStudent.id)}
                          >
                            Mark Present
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <Camera onCapture={handleCapture} />
                  )}
                  
                  {recognizedStudent && (
                    <div className="mt-4 p-4 border border-gray-200 rounded-lg">
                      <h3 className="font-semibold text-lg">Recognized Student</h3>
                      <p><strong>Name:</strong> {recognizedStudent.name}</p>
                      <p><strong>Roll No:</strong> {recognizedStudent.rollNo}</p>
                      <p><strong>Course:</strong> {recognizedStudent.course || 'N/A'}</p>
                      <p><strong>Match Confidence:</strong> {Math.round(recognizedStudent.similarity * 100)}%</p>
                      
                      {attendanceMarked.some(s => s.id === recognizedStudent.id) && (
                        <p className="mt-2 text-green-600">
                          ✓ Already marked present
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Debug information */}
                  <div className="mt-8 border-t pt-4">
                    <details className="text-xs text-gray-500">
                      <summary className="cursor-pointer font-medium">Debug Information</summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded-md overflow-auto">
                        {JSON.stringify(debugInfo, null, 2)}
                      </pre>
                    </details>
                  </div>
                </>
              )}
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-4">Attendance Record</h2>
              
              {attendanceMarked.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Roll No
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendanceMarked.map(student => (
                        <tr key={student.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {student.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {students.find(s => s.id === student.id)?.rollNo || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {new Date(student.timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">No students marked present yet.</p>
              )}
              
              <div className="mt-4">
                <p className="text-sm text-gray-500">
                  Total Present: {attendanceMarked.length} / {students.length}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 