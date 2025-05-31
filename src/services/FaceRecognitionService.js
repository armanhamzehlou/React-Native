import { NativeModules, Platform } from 'react-native';
import RNFS from 'react-native-fs';

class FaceRecognitionService {
  constructor() {
    this.isInitialized = false;
    this.faceDatabase = new Map(); // Map of filename -> face descriptor
    this.faceDbPath = `${RNFS.ExternalStorageDirectoryPath}/FaceDB`;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      if (Platform.OS !== 'android') {
        throw new Error('This service only supports Android');
      }

      console.log('Initializing Face Recognition Service for Android');

      // Create FaceDB directory if it doesn't exist
      const exists = await RNFS.exists(this.faceDbPath);
      if (!exists) {
        await RNFS.mkdir(this.faceDbPath);
        console.log('Created FaceDB directory:', this.faceDbPath);
      }

      this.isInitialized = true;
      console.log('Face Recognition Service initialized');
    } catch (error) {
      console.error('Failed to initialize Face Recognition Service:', error);
      throw error;
    }
  }

  async loadFaceDatabase() {
    try {
      // Check if FaceDB directory exists
      const exists = await RNFS.exists(this.faceDbPath);
      if (!exists) {
        console.log('Creating FaceDB directory:', this.faceDbPath);
        await RNFS.mkdir(this.faceDbPath);
        return 0;
      }

      // Read all image files from the directory
      const files = await RNFS.readDir(this.faceDbPath);
      const imageFiles = files.filter(file => 
        file.isFile() && /\.(jpg|jpeg|png|bmp)$/i.test(file.name)
      );

      console.log(`Found ${imageFiles.length} image files in FaceDB`);

      // Clear existing database
      this.faceDatabase.clear();

      // Process each image file
      for (const file of imageFiles) {
        try {
          const descriptor = await this.extractFaceDescriptor(file.path);
          if (descriptor) {
            this.faceDatabase.set(file.name, descriptor);
            console.log(`Loaded face descriptor for: ${file.name}`);
          }
        } catch (error) {
          console.error(`Failed to process ${file.name}:`, error);
        }
      }

      console.log(`Face database loaded with ${this.faceDatabase.size} faces`);
      return this.faceDatabase.size;
    } catch (error) {
      console.error('Failed to load face database:', error);
      throw error;
    }
  }

  async extractFaceDescriptor(imagePath) {
    try {
      console.log(`Extracting face descriptor from: ${imagePath}`);

      // For Android 8/9, we'll use a simplified approach
      // In production, you'd integrate with Android's face detection APIs
      // or use a native module with OpenCV/ML Kit

      // Generate a hash-based descriptor from image file
      const fileInfo = await RNFS.stat(imagePath);
      const imageData = await RNFS.readFile(imagePath, 'base64');

      // Create a simple descriptor based on image characteristics
      const descriptor = new Float32Array(128);
      let hash = 0;

      // Simple hash from file size and first/last bytes
      for (let i = 0; i < Math.min(imageData.length, 1000); i++) {
        hash = ((hash << 5) - hash + imageData.charCodeAt(i)) & 0xffffffff;
      }

      // Fill descriptor array with pseudo-random values based on hash
      for (let i = 0; i < 128; i++) {
        hash = ((hash * 1103515245) + 12345) & 0x7fffffff;
        descriptor[i] = (hash / 0x7fffffff) * 2 - 1;
      }

      return descriptor;
    } catch (error) {
      console.error('Failed to extract face descriptor:', error);
      return null;
    }
  }

  async matchFace(imagePath) {
    try {
      if (!this.isInitialized) {
        throw new Error('Face Recognition Service not initialized');
      }

      console.log(`Matching face from: ${imagePath}`);

      // Check if image file exists
      const exists = await RNFS.exists(imagePath);
      if (!exists) {
        throw new Error(`Image file not found: ${imagePath}`);
      }

      // Extract face descriptor from input image
      const inputDescriptor = await this.extractFaceDescriptor(imagePath);
      if (!inputDescriptor) {
        return { match: 'no', error: 'No face detected in input image' };
      }

      // Compare with all faces in database
      let bestMatch = null;
      let bestDistance = Infinity;
      const threshold = 0.6; // Similarity threshold

      for (const [filename, dbDescriptor] of this.faceDatabase) {
        const distance = this.calculateDistance(inputDescriptor, dbDescriptor);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = filename;
        }
      }

      // Check if best match is within threshold
      if (bestMatch && bestDistance < threshold) {
        return {
          match: 'yes',
          filename: bestMatch,
          confidence: (1 - bestDistance).toFixed(3)
        };
      } else {
        return { match: 'no' };
      }

    } catch (error) {
      console.error('Face matching error:', error);
      throw error;
    }
  }

  calculateDistance(descriptor1, descriptor2) {
    // Calculate Euclidean distance between two face descriptors
    if (descriptor1.length !== descriptor2.length) {
      throw new Error('Descriptor lengths do not match');
    }

    let sum = 0;
    for (let i = 0; i < descriptor1.length; i++) {
      const diff = descriptor1[i] - descriptor2[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }

  // Method to handle Android Intents
  async handleIntent(intentData) {
    try {
      const { imagePath } = intentData;
      if (!imagePath) {
        throw new Error('No image path provided in intent');
      }

      return await this.matchFace(imagePath);
    } catch (error) {
      console.error('Intent handling error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new FaceRecognitionService();