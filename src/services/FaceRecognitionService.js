
import { NativeModules, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

class FaceRecognitionService {
  constructor() {
    this.isInitialized = false;
    this.faceDatabase = new Map(); // Map of filename -> face descriptor
    this.faceDbPath = Platform.OS === 'web' 
      ? '/FaceDB' 
      : `${FileSystem.documentDirectory}FaceDB`;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      if (Platform.OS === 'web') {
        console.log('Web environment detected - running in demo mode');
        console.log('TensorFlow.js and face-api.js would be loaded here in production');
      } else if (Platform.OS !== 'android') {
        throw new Error('This service only supports Android and web demo');
      }

      console.log('Initializing Face Recognition Service for', Platform.OS);

      // Create FaceDB directory if it doesn't exist
      if (Platform.OS !== 'web') {
        const dirInfo = await FileSystem.getInfoAsync(this.faceDbPath);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(this.faceDbPath, { intermediates: true });
          console.log('Created FaceDB directory:', this.faceDbPath);
        }
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
      if (Platform.OS === 'web') {
        console.log('Running in web environment - simulating face database');
        // Simulate loading faces for web demo
        this.faceDatabase.clear();
        this.faceDatabase.set('demo_face_1.jpg', new Float32Array(128).fill(0.1));
        this.faceDatabase.set('demo_face_2.jpg', new Float32Array(128).fill(0.2));
        this.faceDatabase.set('demo_face_3.jpg', new Float32Array(128).fill(0.3));
        console.log('Simulated face database with 3 faces');
        return 3;
      }

      // Check if FaceDB directory exists
      const dirInfo = await FileSystem.getInfoAsync(this.faceDbPath);
      if (!dirInfo.exists) {
        console.log('Creating FaceDB directory:', this.faceDbPath);
        await FileSystem.makeDirectoryAsync(this.faceDbPath, { intermediates: true });
        return 0;
      }

      // Read all image files from the directory
      const files = await FileSystem.readDirectoryAsync(this.faceDbPath);
      const imageFiles = files.filter(file => 
        /\.(jpg|jpeg|png|bmp)$/i.test(file)
      );

      console.log(`Found ${imageFiles.length} image files in FaceDB`);

      // Clear existing database
      this.faceDatabase.clear();

      // Process each image file
      for (const file of imageFiles) {
        try {
          const filePath = `${this.faceDbPath}/${file}`;
          const descriptor = await this.extractFaceDescriptor(filePath);
          if (descriptor) {
            this.faceDatabase.set(file, descriptor);
            console.log(`Loaded face descriptor for: ${file}`);
          }
        } catch (error) {
          console.error(`Failed to process ${file}:`, error);
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

      if (Platform.OS === 'web') {
        // Generate a simple descriptor for web demo
        const descriptor = new Float32Array(128);
        let hash = imagePath.length;
        
        for (let i = 0; i < 128; i++) {
          hash = ((hash * 1103515245) + 12345) & 0x7fffffff;
          descriptor[i] = (hash / 0x7fffffff) * 2 - 1;
        }
        
        return descriptor;
      }

      // For Android, use a simplified approach
      // In production, integrate with face-api.js or ML Kit
      const fileInfo = await FileSystem.getInfoAsync(imagePath);
      if (!fileInfo.exists) {
        console.error('Image file does not exist:', imagePath);
        return null;
      }

      // Read file as base64 for processing
      const imageData = await FileSystem.readAsStringAsync(imagePath, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Create a simple descriptor based on image characteristics
      const descriptor = new Float32Array(128);
      let hash = 0;

      // Simple hash from file size and base64 data
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

      if (Platform.OS === 'web') {
        // Simulate face matching for web demo
        const matches = Array.from(this.faceDatabase.keys());
        if (matches.length > 0) {
          const randomMatch = matches[Math.floor(Math.random() * matches.length)];
          const confidence = (0.7 + Math.random() * 0.2).toFixed(3);
          return {
            match: 'yes',
            filename: randomMatch,
            confidence: confidence
          };
        } else {
          return { match: 'no' };
        }
      }

      // Check if image file exists
      const fileInfo = await FileSystem.getInfoAsync(imagePath);
      if (!fileInfo.exists) {
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
