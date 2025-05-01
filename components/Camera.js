import { useRef, useState, useEffect } from 'react';

export default function Camera({ onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [cameraStatus, setCameraStatus] = useState('initializing');
  const [cameraInfo, setCameraInfo] = useState(null);

  // Start camera
  const startCamera = async () => {
    try {
      setCameraStatus('requesting_access');
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support camera access');
      }
      
      // List available devices to diagnose potential issues
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setCameraInfo({
        hasVideoDevices: videoDevices.length > 0,
        deviceCount: videoDevices.length,
        devices: videoDevices.map(d => ({ deviceId: d.deviceId, label: d.label || 'Unnamed camera' }))
      });
      
      if (videoDevices.length === 0) {
        throw new Error('No camera detected on your device');
      }
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        setError(null);
        setCameraStatus('streaming');
        
        // Add event listener for when video is actually playing
        videoRef.current.onplaying = () => {
          setCameraStatus('playing');
          setCameraInfo(prev => ({
            ...prev,
            videoWidth: videoRef.current.videoWidth,
            videoHeight: videoRef.current.videoHeight
          }));
        };
      } else {
        throw new Error('Video element not available');
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError(`Camera error: ${err.message}`);
      setCameraStatus('error');
      setCameraInfo(prev => ({
        ...prev,
        errorType: err.name,
        errorMessage: err.message
      }));
      
      // Provide helpful messages for common errors
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('Camera not found. Please check if your camera is connected and not in use by another application.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera is in use by another application. Please close other applications that might be using the camera.');
      }
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
      setCameraStatus('stopped');
    }
  };

  // Capture photo
  const capturePhoto = () => {
    if (!isStreaming) {
      setError('Cannot capture: camera is not streaming');
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) {
      setError('Cannot capture: video or canvas element is missing');
      return;
    }
    
    try {
      setCameraStatus('capturing');
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get image data URL
      const imageDataURL = canvas.toDataURL('image/png');
      
      if (!imageDataURL || imageDataURL === 'data:,') {
        throw new Error('Failed to capture image from canvas');
      }
      
      setCameraStatus('captured');
      setCameraInfo(prev => ({
        ...prev,
        captureTime: new Date().toISOString(),
        imageSize: Math.round(imageDataURL.length / 1024) + 'KB'
      }));
      
      // Call the onCapture callback with the image
      if (onCapture) {
        onCapture(imageDataURL);
      }
    } catch (err) {
      console.error('Error capturing photo:', err);
      setError(`Capture error: ${err.message}`);
      setCameraStatus('error');
    }
  };

  // Start camera on mount, stop on unmount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  return (
    <div className="camera-container">
      {error && (
        <div className="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
          {cameraStatus === 'error' && (
            <button 
              onClick={startCamera}
              className="mt-2 bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-2 rounded"
            >
              Try Again
            </button>
          )}
        </div>
      )}
      
      <div className="video-container relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="camera-video w-full rounded-lg"
          style={{ maxHeight: '400px', objectFit: 'cover' }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        {cameraStatus === 'requesting_access' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white">
            <p>Requesting camera access...</p>
          </div>
        )}
      </div>
      
      <div className="camera-controls mt-4">
        <button
          onClick={capturePhoto}
          disabled={!isStreaming}
          className="capture-button bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg disabled:opacity-50"
        >
          Capture
        </button>
        
        <div className="mt-2 text-xs text-gray-500">
          {cameraStatus === 'playing' && 'Camera ready. Position your face in the center.'}
          {cameraStatus === 'initializing' && 'Initializing camera...'}
          {cameraStatus === 'streaming' && 'Camera streaming...'}
          {cameraStatus === 'capturing' && 'Capturing...'}
        </div>
        
        {/* Debug information */}
        <details className="mt-4 text-xs text-gray-500">
          <summary className="cursor-pointer">Camera Debug Info</summary>
          <div className="mt-1 p-2 bg-gray-100 rounded">
            <p>Status: {cameraStatus}</p>
            <p>Streaming: {isStreaming ? 'Yes' : 'No'}</p>
            {cameraInfo && (
              <pre className="mt-1 overflow-x-auto">
                {JSON.stringify(cameraInfo, null, 2)}
              </pre>
            )}
          </div>
        </details>
      </div>
    </div>
  );
} 