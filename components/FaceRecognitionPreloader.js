import { useEffect, useState } from 'react';
import { loadModels, areModelsLoaded } from '../lib/faceRecognition';

// Component to preload face recognition models on app startup
export default function FaceRecognitionPreloader() {
  const [loadingStatus, setLoadingStatus] = useState('idle');
  
  useEffect(() => {
    // Skip if already loaded or in server-side rendering
    if (typeof window === 'undefined' || areModelsLoaded()) {
      return;
    }
    
    // Load models in the background
    const preloadModels = async () => {
      try {
        setLoadingStatus('loading');
        console.log('Preloading face-api.js models in the background...');
        
        await loadModels();
        setLoadingStatus('success');
        console.log('Face-api.js models preloaded successfully');
      } catch (error) {
        setLoadingStatus('error');
        console.error('Error preloading face-api.js models:', error);
      }
    };
    
    preloadModels();
  }, []);
  
  // This component doesn't render anything visible
  return null;
} 