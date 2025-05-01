import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Camera from '../components/Camera';
import { loadModels, getFaceDescriptor, areModelsLoaded } from '../lib/faceRecognition';

export default function Register() {
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [student, setStudent] = useState({
    name: '',
    rollNo: '',
    course: '',
    email: ''
  });
  const [capturedImage, setCapturedImage] = useState(null);
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  const imageRef = useRef(null);
  const loadingTimeoutRef = useRef(null);

  // Load face-api.js models on component mount
  useEffect(() => {
    const initModels = async () => {
      setStatus('Loading face recognition models...');
      
      // Set a timeout to check model loading status
      loadingTimeoutRef.current = setTimeout(() => {
        if (!areModelsLoaded()) {
          setDebugInfo(prev => ({ 
            ...prev, 
            modelLoadTimeout: true,
            modelLoadTimeoutMessage: 'Models taking longer than expected to load. Please be patient.'
          }));
          setStatus('Models taking longer than expected to load. Please be patient.');
        }
      }, 10000); // Check after 10 seconds
      
      try {
        // Check if we're running in a browser environment
        if (typeof window === 'undefined') {
          throw new Error('Cannot load models in server-side rendering');
        }
        
        // Log model loading attempt
        setDebugInfo(prev => ({ ...prev, modelLoadAttempt: new Date().toISOString() }));
        
        // Try loading models with a timeout
        const success = await Promise.race([
          loadModels(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Model loading timed out after 60 seconds')), 60000)
          )
        ]);
        
        if (success) {
          setStatus('Face models loaded successfully');
          setDebugInfo(prev => ({ ...prev, modelsLoaded: true }));
        } else {
          setError('Failed to load face models');
          setStatus('Failed to load face models');
          setDebugInfo(prev => ({ ...prev, modelsLoaded: false }));
        }
      } catch (error) {
        console.error('Error initializing face models:', error);
        setError(`Error loading face models: ${error.message}`);
        setStatus('Error loading face models');
        setDebugInfo(prev => ({ 
          ...prev, 
          modelLoadError: error.message,
          modelLoadStack: error.stack 
        }));
      } finally {
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
        setIsModelLoading(false);
      }
    };

    initModels();
    
    // Cleanup function
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setStudent(prev => ({ ...prev, [name]: value }));
  };

  // Handle image capture from camera
  const handleCapture = async (imageDataURL) => {
    setCapturedImage(imageDataURL);
    setStatus('Processing face...');
    setError(null);
    
    try {
      // Check if models are loaded first
      if (!areModelsLoaded()) {
        setStatus('Face models still loading. Please wait and try again...');
        setDebugInfo(prev => ({ ...prev, captureWhileLoading: true }));
        
        // Wait for models to load
        await loadModels();
      }
      
      // Create an image element from the data URL for face-api.js processing
      const img = new Image();
      img.src = imageDataURL;
      
      // Set debug info
      setDebugInfo(prev => ({ 
        ...prev, 
        captureAttempt: new Date().toISOString(),
        imageReceived: !!imageDataURL,
        imageSize: imageDataURL ? Math.round(imageDataURL.length / 1024) + 'KB' : 'N/A'
      }));
      
      // Wait for image to load
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Failed to load captured image'));
        // Set a timeout in case the image never loads
        setTimeout(() => reject(new Error('Image load timeout')), 3000);
      });
      
      setDebugInfo(prev => ({ ...prev, imageLoaded: true, imageWidth: img.width, imageHeight: img.height }));
      
      // Get face descriptor
      setStatus('Detecting face...');
      const descriptor = await getFaceDescriptor(img);
      
      if (descriptor) {
        setDebugInfo(prev => ({ 
          ...prev, 
          faceDetected: true,
          descriptorLength: descriptor.length
        }));
        
        setFaceDescriptor(Array.from(descriptor));
        setStatus('Face detected successfully');
      } else {
        setDebugInfo(prev => ({ ...prev, faceDetected: false }));
        setError('No face detected in the image');
        setStatus('No face detected. Please try again.');
      }
    } catch (error) {
      console.error('Error processing face:', error);
      setError(`Error detecting face: ${error.message}`);
      setStatus('Error detecting face. Please try again.');
      setDebugInfo(prev => ({ 
        ...prev, 
        faceProcessError: error.message,
        faceProcessStack: error.stack
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!faceDescriptor) {
      setStatus('Please capture your face first');
      setError('Face capture required');
      return;
    }
    
    setIsSubmitting(true);
    setStatus('Registering student...');
    setError(null);
    
    try {
      // Prepare data for submission
      const studentData = {
        ...student,
        faceDescriptor: JSON.stringify(faceDescriptor)
      };
      
      setDebugInfo(prev => ({ 
        ...prev, 
        submissionAttempt: new Date().toISOString(),
        dataSize: JSON.stringify(studentData).length
      }));
      
      // Submit to API
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(studentData)
      });
      
      const responseData = await response.json();
      
      setDebugInfo(prev => ({ 
        ...prev, 
        apiResponse: response.status,
        responseData: responseData
      }));
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${responseData.message || 'Unknown error'}`);
      }
      
      // Reset form
      setStudent({
        name: '',
        rollNo: '',
        course: '',
        email: ''
      });
      setCapturedImage(null);
      setFaceDescriptor(null);
      
      setStatus('Student registered successfully');
    } catch (error) {
      console.error('Error registering student:', error);
      setError(`Registration error: ${error.message}`);
      setStatus('Error registering student: ' + error.message);
      setDebugInfo(prev => ({ 
        ...prev, 
        submissionError: error.message,
        submissionStack: error.stack
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Head>
        <title>Register Student - Attendance System</title>
      </Head>
      
      <h1 className="text-3xl font-bold mb-8 text-center">Register New Student</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-2">Status: {status}</p>
          {error && (
            <p className="text-sm text-red-500 mb-2">Error: {error}</p>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Student Information</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={student.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="rollNo" className="block text-sm font-medium text-gray-700 mb-1">
                  Roll Number *
                </label>
                <input
                  type="text"
                  id="rollNo"
                  name="rollNo"
                  value={student.rollNo}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="course" className="block text-sm font-medium text-gray-700 mb-1">
                  Course
                </label>
                <input
                  type="text"
                  id="course"
                  name="course"
                  value={student.course}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={student.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting || !faceDescriptor}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md disabled:opacity-50 mt-4"
              >
                {isSubmitting ? 'Registering...' : 'Register Student'}
              </button>
            </form>
          </div>
          
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
                      ref={imageRef}
                      src={capturedImage}
                      alt="Captured face"
                      className="max-w-full h-auto rounded-lg mx-auto"
                    />
                    <button
                      onClick={() => {
                        setCapturedImage(null);
                        setFaceDescriptor(null);
                        setError(null);
                      }}
                      className="mt-2 bg-gray-200 hover:bg-gray-300 text-gray-800 py-1 px-3 rounded-md text-sm"
                    >
                      Retake
                    </button>
                  </div>
                ) : (
                  <Camera onCapture={handleCapture} />
                )}
                
                {faceDescriptor && (
                  <div className="mt-2 text-sm text-green-600">
                    ✓ Face detected successfully
                  </div>
                )}
              </>
            )}
            
            {/* Debug information section (collapsible) */}
            <div className="mt-8 border-t pt-4">
              <details className="text-xs text-gray-500">
                <summary className="cursor-pointer font-medium">Debug Information</summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded-md overflow-auto">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 