const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// Base directory to download models
const MODELS_DIR = path.join(__dirname, '..', 'public', 'models');

// Clean directory first
if (fs.existsSync(MODELS_DIR)) {
  console.log(`Cleaning models directory: ${MODELS_DIR}`);
  const files = fs.readdirSync(MODELS_DIR);
  for (const file of files) {
    fs.unlinkSync(path.join(MODELS_DIR, file));
  }
}

// Ensure models directory exists
if (!fs.existsSync(MODELS_DIR)) {
  console.log(`Creating directory: ${MODELS_DIR}`);
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

// URLs for face-api.js models
const MODEL_URLS = [
  // SSD MobileNet
  'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-weights_manifest.json',
  'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-shard1',
  
  // Face Landmark Model
  'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json',
  'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1',
  
  // Face Recognition Model
  'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json',
  'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1',
  'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard2'
];

// Function to download a file
function downloadFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${path.basename(filePath)}`);
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(filePath, () => {}); // Delete the file if error
        reject(err);
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {}); // Delete the file if error
      reject(err);
    });
  });
}

// Download all models
async function downloadAllModels() {
  console.log(`Downloading face-api.js models to ${MODELS_DIR}`);
  
  try {
    // Download each model file
    for (const url of MODEL_URLS) {
      const fileName = path.basename(url);
      const filePath = path.join(MODELS_DIR, fileName);
      
      await downloadFile(url, filePath);
    }
    
    console.log('All models downloaded successfully!');
    console.log(`Models are in: ${MODELS_DIR}`);
    
    // List files in models directory
    console.log('\nVerifying downloaded files:');
    const files = fs.readdirSync(MODELS_DIR);
    for (const file of files) {
      const filePath = path.join(MODELS_DIR, file);
      const stats = fs.statSync(filePath);
      console.log(`- ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    }
    
    return true;
  } catch (error) {
    console.error('Error downloading models:', error);
    return false;
  }
}

// Execute the download
downloadAllModels()
  .then((success) => {
    if (success) {
      console.log('\nModels are ready for use!');
      process.exit(0);
    } else {
      console.error('\nFailed to download all models.');
      process.exit(1);
    }
  }); 