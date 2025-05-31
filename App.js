
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Alert, 
  TouchableOpacity, 
  ScrollView,
  Linking,
  AppState,
  Platform,
  PermissionsAndroid
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import FaceRecognitionService from './src/services/FaceRecognitionService';

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [faceDbCount, setFaceDbCount] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android') {
      requestPermissions().then(() => {
        initializeApp();
        setupDeepLinkHandler();
      });
    } else {
      Alert.alert('Platform Not Supported', 'This app only works on Android devices.');
    }

    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        handleDeepLink();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  const requestPermissions = async () => {
    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      ];

      const granted = await PermissionsAndroid.requestMultiple(permissions);
      
      const allGranted = Object.values(granted).every(
        permission => permission === PermissionsAndroid.RESULTS.GRANTED
      );

      if (!allGranted) {
        Alert.alert(
          'Permissions Required',
          'This app needs storage permissions to access face images.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Permission request error:', error);
    }
  };

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
    Linking.addEventListener('url', handleDeepLinkEvent);
    handleDeepLink(); // Handle initial URL if app was opened via deep link
  };

  const handleDeepLinkEvent = (event) => {
    if (event && event.url) {
      processDeepLink(event.url);
    }
  };

  const handleDeepLink = async () => {
    try {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        processDeepLink(initialUrl);
      }
    } catch (error) {
      console.error('Error handling initial URL:', error);
    }
  };

  const processDeepLink = async (url) => {
    try {
      console.log('Processing deep link:', url);
      
      if (url.startsWith('faceapp://match')) {
        const urlParams = new URL(url);
        const imagePath = urlParams.searchParams.get('path');
        
        if (imagePath) {
          setIsProcessing(true);
          const result = await FaceRecognitionService.matchFace(imagePath);
          setLastResult(result);
          setIsProcessing(false);
          
          Alert.alert(
            'Face Match Result',
            result.match === 'yes' 
              ? `Match found: ${result.filename} (${result.confidence})`
              : 'No match found',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      setIsProcessing(false);
      console.error('Deep link processing error:', error);
      Alert.alert('Error', 'Failed to process face recognition request');
    }
  };

  const reloadDatabase = async () => {
    try {
      const count = await FaceRecognitionService.loadFaceDatabase();
      setFaceDbCount(count);
      Alert.alert('Database Reloaded', `Loaded ${count} face images`);
    } catch (error) {
      Alert.alert('Error', 'Failed to reload database');
    }
  };

  const testFaceMatch = async () => {
    try {
      setIsProcessing(true);
      // Test with a simulated path for demo
      const testPath = '/storage/emulated/0/FaceDB/test.jpg';
      const result = await FaceRecognitionService.matchFace(testPath);
      setLastResult(result);
      setIsProcessing(false);
      
      Alert.alert(
        'Test Result',
        result.match === 'yes' 
          ? `Match: ${result.filename} (${result.confidence})`
          : result.error || 'No match found'
      );
    } catch (error) {
      setIsProcessing(false);
      Alert.alert('Test Error', error.message);
    }
  };

  if (Platform.OS !== 'android') {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Android Only</Text>
        <Text style={styles.info}>This app only works on Android devices.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Face Recognition Service</Text>
        <Text style={styles.subtitle}>
          {isInitialized ? '✅ Ready for Android' : '⏳ Initializing...'}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Database Status</Text>
          <Text style={styles.info}>
            Face Images Loaded: {faceDbCount}
          </Text>
          <Text style={styles.info}>
            Path: /storage/emulated/0/FaceDB/
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
            <Text style={styles.result}>
              {JSON.stringify(lastResult, null, 2)}
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Setup Instructions</Text>
          <Text style={styles.info}>
            1. Create folder: /storage/emulated/0/FaceDB/
          </Text>
          <Text style={styles.info}>
            2. Add face images (jpg, png, etc.)
          </Text>
          <Text style={styles.info}>
            3. Tap "Reload Database"
          </Text>
          <Text style={styles.info}>
            4. Test with other apps using deep links
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  info: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 6,
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  processing: {
    fontSize: 16,
    color: '#FF9800',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  result: {
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 4,
  },
  errorText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f44336',
    marginBottom: 10,
  },
});
