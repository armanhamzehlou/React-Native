
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Alert, 
  TouchableOpacity, 
  ScrollView,
  Linking,
  AppState
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import FaceRecognitionService from './src/services/FaceRecognitionService';

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [faceDbCount, setFaceDbCount] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    initializeApp();
    setupDeepLinkHandler();

    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        handleDeepLink();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  const initializeApp = async () => {
    try {
      await FaceRecognitionService.initialize();
      const count = await FaceRecognitionService.loadFaceDatabase();
      setFaceDbCount(count);
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      Alert.alert('Initialization Error', error.message);
    }
  };

  const setupDeepLinkHandler = () => {
    // Handle deep links when app is already open
    Linking.addEventListener('url', handleDeepLinkEvent);
    
    // Handle deep links when app is opened from closed state
    Linking.getInitialURL().then((url) => {
      if (url) {
        processDeepLink(url);
      }
    });
  };

  const handleDeepLinkEvent = (event) => {
    processDeepLink(event.url);
  };

  const handleDeepLink = async () => {
    const url = await Linking.getInitialURL();
    if (url) {
      processDeepLink(url);
    }
  };

  const processDeepLink = async (url) => {
    if (!url || !isInitialized) return;

    try {
      // Parse deep link: faceapp://match?path=/storage/emulated/0/DCIM/photo.jpg
      const urlObj = new URL(url);
      if (urlObj.protocol === 'faceapp:' && urlObj.pathname === '//match') {
        const imagePath = urlObj.searchParams.get('path');
        if (imagePath) {
          await performFaceMatch(imagePath);
        }
      }
    } catch (error) {
      console.error('Error processing deep link:', error);
    }
  };

  const performFaceMatch = async (imagePath) => {
    setIsProcessing(true);
    try {
      const result = await FaceRecognitionService.matchFace(imagePath);
      setLastResult(result);
      
      // Send result back to calling app (simplified)
      console.log('Face match result:', result);
      
    } catch (error) {
      console.error('Face matching error:', error);
      setLastResult({ match: 'no', error: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const testFaceMatch = async () => {
    // For testing purposes - you would replace this with actual image path
    const testImagePath = '/storage/emulated/0/DCIM/test_image.jpg';
    await performFaceMatch(testImagePath);
  };

  const reloadDatabase = async () => {
    try {
      const count = await FaceRecognitionService.loadFaceDatabase();
      setFaceDbCount(count);
      Alert.alert('Success', `Loaded ${count} face images from database`);
    } catch (error) {
      Alert.alert('Error', `Failed to reload database: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Face Recognition Service</Text>
        <Text style={styles.subtitle}>
          {isInitialized ? '✅ Ready' : '⏳ Initializing...'}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Database Status</Text>
          <Text style={styles.info}>
            Face Images Loaded: {faceDbCount}
          </Text>
          <TouchableOpacity style={styles.button} onPress={reloadDatabase}>
            <Text style={styles.buttonText}>Reload Database</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deep Link Support</Text>
          <Text style={styles.info}>
            Listening for: faceapp://match?path=...
          </Text>
          <TouchableOpacity style={styles.button} onPress={testFaceMatch}>
            <Text style={styles.buttonText}>Test Face Match</Text>
          </TouchableOpacity>
        </View>

        {isProcessing && (
          <View style={styles.section}>
            <Text style={styles.processing}>🔄 Processing face match...</Text>
          </View>
        )}

        {lastResult && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Last Result</Text>
            <View style={styles.resultBox}>
              <Text style={styles.resultText}>
                {JSON.stringify(lastResult, null, 2)}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Setup Instructions</Text>
          <Text style={styles.instructions}>
            1. Create folder: /storage/emulated/0/FaceDB/
            {'\n'}2. Add face images to the folder
            {'\n'}3. Restart app to load database
            {'\n'}4. Use deep link: faceapp://match?path=IMAGE_PATH
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  info: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  processing: {
    fontSize: 16,
    color: '#FF9800',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  resultBox: {
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  resultText: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#333',
  },
  instructions: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
