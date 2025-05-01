import * as faceapi from 'face-api.js';

// Track loading state
let modelsLoaded = false;
let loadingAttempted = false;
let loadError = null;
let loadingPromise = null;

// Initialize face detection
export async function loadModels() {
  // Return existing promise if already loading
  if (loadingPromise) {
    console.log('Models are already loading, waiting for completion');
    return loadingPromise;
  }
  
  // Only attempt to load once if already loaded
  if (loadingAttempted && modelsLoaded) {
    console.log('Models already loaded, returning cached result');
    return true;
  }
  
  loadingAttempted = true;
  const MODEL_URL = '/models';
  
  // Create a promise that we'll cache and return
  loadingPromise = (async () => {
    try {
      console.log('Loading face-api.js models from:', MODEL_URL);
      
      // Configuration for model loading - use uncompressed models and be more forgiving
      const modelOptions = {
        scoreThreshold: 0.5, // Lower threshold for detection
        inputSize: 320,      // Smaller input size for faster processing
        maxResults: 1        // We only need one face
      };
      
      // Time the model loading for diagnostics
      const startTime = performance.now();
      
      // Load models directly without checking for files first
      console.log('Loading SSD MobileNet model...');
      try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        console.log('SSD MobileNet model loaded successfully');
      } catch (e) {
        console.error('Failed to load SSD MobileNet model:', e);
        throw new Error(`SSD MobileNet model failed to load: ${e.message}`);
      }
      
      console.log('Loading Face Landmark model...');
      try {
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        console.log('Face Landmark model loaded successfully');
      } catch (e) {
        console.error('Failed to load Face Landmark model:', e);
        throw new Error(`Face Landmark model failed to load: ${e.message}`);
      }
      
      console.log('Loading Face Recognition model...');
      try {
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        console.log('Face Recognition model loaded successfully');
      } catch (e) {
        console.error('Failed to load Face Recognition model:', e);
        throw new Error(`Face Recognition model failed to load: ${e.message}`);
      }
      
      const loadTime = performance.now() - startTime;
      console.log(`All face-api.js models loaded successfully in ${loadTime.toFixed(0)}ms`);
      
      // Validate model loading
      const isModelReady = 
        faceapi.nets.ssdMobilenetv1.isLoaded && 
        faceapi.nets.faceLandmark68Net.isLoaded && 
        faceapi.nets.faceRecognitionNet.isLoaded;
        
      if (!isModelReady) {
        throw new Error('Model loading completed but models are not ready');
      }
      
      modelsLoaded = true;
      loadError = null;
      return true;
    } catch (error) {
      console.error('Error loading face-api models:', error);
      loadError = error;
      modelsLoaded = false;
      return false;
    } finally {
      // Clear the promise to allow retrying if necessary
      loadingPromise = null;
    }
  })();
  
  return loadingPromise;
}

// Manually check if models are loaded directly from face-api
export function areModelsLoaded() {
  // Check directly with face-api too
  const apiModelsLoaded = 
    faceapi.nets.ssdMobilenetv1.isLoaded && 
    faceapi.nets.faceLandmark68Net.isLoaded && 
    faceapi.nets.faceRecognitionNet.isLoaded;
    
  // Update our tracking variable if face-api says models are loaded
  if (apiModelsLoaded && !modelsLoaded) {
    console.log('Models are loaded according to face-api but not tracked in our state');
    modelsLoaded = true;
  }
  
  return modelsLoaded;
}

// Get loading errors
export function getLoadingError() {
  return loadError;
}

// Get face descriptor from image - with auto-loading of models if needed
export async function getFaceDescriptor(imageElement) {
  try {
    // Double-check model loading status directly with face-api
    const apiModelsLoaded = 
      faceapi.nets.ssdMobilenetv1.isLoaded && 
      faceapi.nets.faceLandmark68Net.isLoaded && 
      faceapi.nets.faceRecognitionNet.isLoaded;
      
    if (!apiModelsLoaded) {
      console.log('Models not loaded according to face-api, attempting to load them now');
      const loaded = await loadModels();
      if (!loaded) {
        throw new Error('Failed to load face models');
      }
    }
    
    if (!imageElement) {
      throw new Error('No image element provided');
    }
    
    // Check if the image is valid
    if (!imageElement.complete || imageElement.naturalWidth === 0) {
      throw new Error('Image not fully loaded or invalid');
    }
    
    // Log image dimensions for debugging
    console.log(`Processing image: ${imageElement.width}x${imageElement.height}px`);
    
    // Use a more direct approach with error handling for each step
    try {
      // First try to detect any faces
      const detectOptions = {
        scoreThreshold: 0.3 // Lower threshold to be more forgiving
      };
      
      const allFaces = await faceapi.detectAllFaces(imageElement, detectOptions);
      console.log(`Detected ${allFaces.length} faces in the image`);
      
      if (allFaces.length === 0) {
        console.log('No faces detected in the image');
        return null;
      }
      
      if (allFaces.length > 1) {
        console.log('Multiple faces detected, using the most prominent face');
      }
      
      // Now proceed with the full detection pipeline
      const startTime = performance.now();
      
      // Get the highest-confidence face detection
      const bestDetection = allFaces.reduce((best, current) => 
        (current.score > best.score) ? current : best, allFaces[0]);
        
      // Get landmarks for that face
      const withLandmarks = await faceapi.detectSingleFace(imageElement)
        .withFaceLandmarks();
        
      if (!withLandmarks) {
        console.log('Could not detect landmarks');
        return null;
      }
      
      // Get face descriptor
      const fullDetection = await withLandmarks.withFaceDescriptor();
      
      if (!fullDetection) {
        console.log('Could not generate face descriptor');
        return null;
      }
      
      const processTime = performance.now() - startTime;
      console.log(`Face processing completed in ${processTime.toFixed(0)}ms`);
      
      console.log('Face descriptor generated successfully');
      return fullDetection.descriptor;
    } catch (detectionError) {
      console.error('Detection error:', detectionError);
      throw new Error(`Face detection error: ${detectionError.message}`);
    }
  } catch (error) {
    console.error('Error getting face descriptor:', error);
    throw error;
  }
}

// Compare face descriptors
export function compareFaces(descriptor1, descriptor2, threshold = 0.6) {
  if (!descriptor1 || !descriptor2) {
    console.log('Cannot compare faces: at least one descriptor is missing');
    return 0;
  }
  
  try {
    // Convert string descriptor to Float32Array if needed
    const desc1 = typeof descriptor1 === 'string' 
      ? new Float32Array(JSON.parse(descriptor1)) 
      : descriptor1;
    
    const desc2 = typeof descriptor2 === 'string' 
      ? new Float32Array(JSON.parse(descriptor2)) 
      : descriptor2;
    
    // Check descriptor dimensions
    if (desc1.length !== 128 || desc2.length !== 128) {
      console.warn('Descriptor has incorrect dimensions, should be 128:', 
        { desc1Length: desc1.length, desc2Length: desc2.length });
    }
    
    // Calculate Euclidean distance
    const distance = faceapi.euclideanDistance(desc1, desc2);
    
    // Return similarity (1 - distance), with values below threshold returning 0
    const similarity = distance < threshold ? (1 - distance) : 0;
    
    console.log(`Face comparison result: distance=${distance.toFixed(3)}, similarity=${similarity.toFixed(3)}`);
    return similarity;
  } catch (error) {
    console.error('Error comparing face descriptors:', error);
    return 0;
  }
}

// Find best match from array of students
export function findBestMatch(faceDescriptor, students) {
  if (!faceDescriptor) {
    console.log('Cannot find match: face descriptor is missing');
    return null;
  }
  
  if (!students || students.length === 0) {
    console.log('Cannot find match: no students to compare with');
    return null;
  }
  
  try {
    console.log(`Searching for best match among ${students.length} students`);
    
    let bestMatch = null;
    let highestSimilarity = 0;
    let studentsWithFace = 0;
    
    students.forEach(student => {
      if (student.faceDescriptor) {
        studentsWithFace++;
        const similarity = compareFaces(faceDescriptor, student.faceDescriptor);
        
        if (similarity > highestSimilarity) {
          highestSimilarity = similarity;
          bestMatch = {
            student,
            similarity
          };
        }
      }
    });
    
    console.log(`Compared with ${studentsWithFace} students who have face descriptors`);
    
    if (bestMatch) {
      console.log(`Best match found: ${bestMatch.student.name} (${bestMatch.similarity.toFixed(3)})`);
    } else {
      console.log('No matching student found');
    }
    
    return bestMatch;
  } catch (error) {
    console.error('Error finding best match:', error);
    return null;
  }
} 