
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
  PermissionsAndroid,
  Image,
  Modal,
  FlatList,
  TextInput,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import FaceRecognitionService from './src/services/FaceRecognitionService';

const { width } = Dimensions.get('window');

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [faceDbCount, setFaceDbCount] = useState(0);
  const [faceDbImages, setFaceDbImages] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFaceDbModal, setShowFaceDbModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testImage, setTestImage] = useState(null);
  const [newFaceName, setNewFaceName] = useState('');

  useEffect(() => {
    const setupApp = async () => {
      if (Platform.OS === 'android' || Platform.OS === 'web') {
        if (Platform.OS === 'android') {
          await requestPermissions();
        }
        
        // Add timeout to prevent infinite initialization
        const initTimeout = setTimeout(() => {
          console.error('Initialization timeout - forcing completion');
          setIsInitialized(true);
        }, 10000); // 10 second timeout
        
        try {
          await initializeApp();
          clearTimeout(initTimeout);
        } catch (error) {
          clearTimeout(initTimeout);
          console.error('Setup error:', error);
        }
        
        setupDeepLinkHandler();
      } else {
        Alert.alert('Platform Not Supported', 'This app works on Android devices and web demo.');
      }
    };

    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        handleDeepLink();
      }
    };

    setupApp();

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [initializeApp, setupDeepLinkHandler, handleDeepLink]);

  const requestPermissions = async () => {
    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.CAMERA,
      ];

      const granted = await PermissionsAndroid.requestMultiple(permissions);
      
      const allGranted = Object.values(granted).every(
        permission => permission === PermissionsAndroid.RESULTS.GRANTED
      );

      if (!allGranted) {
        Alert.alert(
          'Permissions Required',
          'This app needs storage and camera permissions to work properly.',
          [{ text: 'OK' }]
        );
      }

      // Request media library permissions for Expo
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Media library permission is required to select images');
        }
      }
    } catch (error) {
      console.error('Permission request error:', error);
    }
  };

  const initializeApp = async () => {
    try {
      console.log('Starting app initialization...');
      await FaceRecognitionService.initialize();
      console.log('Face Recognition Service initialized, loading database...');
      const count = await FaceRecognitionService.loadFaceDatabase();
      console.log('Database loaded with', count, 'faces');
      setFaceDbCount(count);
      console.log('Loading face database images...');
      await loadFaceDbImages();
      console.log('App initialization complete, setting isInitialized to true');
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setIsInitialized(false); // Ensure we set this to false on error
      Alert.alert('Initialization Error', error.message);
    }
  };

  const loadFaceDbImages = async () => {
    try {
      console.log('Loading face database images...');
      const images = await FaceRecognitionService.getFaceDbImages();
      console.log('Loaded images:', images.length, images.map(img => img.filename));
      setFaceDbImages(images);
    } catch (error) {
      console.error('Failed to load face database images:', error);
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
      console.log('Reloading face database...');
      const count = await FaceRecognitionService.loadFaceDatabase();
      console.log('Database loaded with', count, 'faces');
      setFaceDbCount(count);
      
      await loadFaceDbImages();
      
      Alert.alert('Database Reloaded', `Loaded ${count} face images`);
    } catch (error) {
      console.error('Error reloading database:', error);
      Alert.alert('Error', `Failed to reload database: ${error.message}`);
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        console.log('Image selected:', result.assets[0].uri);
        return result.assets[0].uri;
      }
      console.log('No image selected or selection was canceled');
      return null;
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', `Failed to pick image from gallery: ${error.message}`);
      return null;
    }
  };

  const addFaceToDatabase = async () => {
    try {
      console.log('Starting image picker...');
      const imageUri = await pickImageFromGallery();
      if (!imageUri) {
        console.log('No image selected');
        return;
      }

      console.log('Selected image URI:', imageUri);

      // Use a more robust approach with default name and confirmation
      console.log('Showing name prompt for image:', imageUri);
      
      Alert.prompt(
        'Add Face to Database',
        'Enter a name for this face:',
        [
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => {
              console.log('User cancelled adding face to database');
            }
          },
          {
            text: 'Add',
            onPress: async (name) => {
              console.log('User entered name:', name);
              
              // Use default name if none provided
              const faceName = (name && name.trim()) ? name.trim() : `Face_${Date.now()}`;
              console.log('Using face name:', faceName);
              
              try {
                // Always ensure service is properly initialized
                console.log('Ensuring service is initialized...');
                await FaceRecognitionService.initialize();
                
                const filename = `${faceName.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
                console.log('Adding face to database:', filename, 'from', imageUri);
                
                const actualFilename = await FaceRecognitionService.addImageToFaceDb(imageUri, filename);
                console.log('Face added successfully with filename:', actualFilename);
                
                // Wait a moment for file system to sync
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Reload the database and update state
                console.log('Reloading database...');
                const count = await FaceRecognitionService.loadFaceDatabase();
                console.log('Database loaded with', count, 'faces');
                setFaceDbCount(count);
                
                await loadFaceDbImages();
                
                Alert.alert('Success', `Face added to database as ${actualFilename}. Database now has ${count} faces.`);
              } catch (error) {
                console.error('Error adding face to database:', error);
                Alert.alert('Error', `Failed to add face to database: ${error.message}`);
              }
            }
          }
        ],
        'plain-text',
        `Face_${Date.now()}` // Default value
      );
    } catch (error) {
      console.error('Error in addFaceToDatabase:', error);
      Alert.alert('Error', `Failed to add face to database: ${error.message}`);
    }
  };

  const removeFaceFromDatabase = async (filename) => {
    Alert.alert(
      'Remove Face',
      `Are you sure you want to remove ${filename} from the database?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await FaceRecognitionService.removeImageFromFaceDb(filename);
              Alert.alert('Success', 'Face removed from database');
              await reloadDatabase();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove face from database');
            }
          }
        }
      ]
    );
  };

  const testCustomImage = async () => {
    try {
      const imageUri = await pickImageFromGallery();
      if (!imageUri) return;

      setTestImage(imageUri);
      setIsProcessing(true);
      
      const result = await FaceRecognitionService.matchFace(imageUri);
      setLastResult(result);
      setIsProcessing(false);
      setShowTestModal(true);
    } catch (error) {
      setIsProcessing(false);
      Alert.alert('Test Error', error.message);
    }
  };

  const renderFaceDbItem = ({ item }) => (
    <View style={styles.faceItem}>
      {item.uri ? (
        <Image 
          source={{ uri: item.uri }} 
          style={styles.faceImage}
          onError={(error) => console.log('Image load error for', item.filename, ':', error)}
          onLoad={() => console.log('Successfully loaded image:', item.filename)}
        />
      ) : (
        <View style={[styles.faceImage, styles.placeholderImage]}>
          <Text style={styles.placeholderText}>📷</Text>
          <Text style={styles.placeholderText}>No Preview</Text>
        </View>
      )}
      <Text style={styles.faceFilename} numberOfLines={2}>{item.filename}</Text>
      <TouchableOpacity 
        style={styles.removeButton}
        onPress={() => removeFaceFromDatabase(item.filename)}
      >
        <Text style={styles.removeButtonText}>×</Text>
      </TouchableOpacity>
    </View>
  );

  if (Platform.OS !== 'android' && Platform.OS !== 'web') {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Android Only</Text>
        <Text style={styles.info}>This app works on Android devices and web demo.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Face Recognition Service</Text>
        <Text style={styles.subtitle}>
          {isInitialized ? `✅ Ready for ${Platform.OS}` : '⏳ Initializing...'}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Database Status</Text>
          <Text style={styles.info}>
            Face Images Loaded: {faceDbCount}
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.button} onPress={reloadDatabase}>
              <Text style={styles.buttonText}>Reload Database</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={() => setShowFaceDbModal(true)}>
              <Text style={styles.buttonText}>View Database</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.button, styles.addButton]} onPress={addFaceToDatabase}>
            <Text style={styles.buttonText}>+ Add Face from Gallery</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Face Testing</Text>
          <Text style={styles.info}>
            Test face recognition with custom images
          </Text>
          <TouchableOpacity style={[styles.button, styles.testButton]} onPress={testCustomImage}>
            <Text style={styles.buttonText}>🔍 Test Custom Image</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deep Link Support</Text>
          <Text style={styles.info}>
            Listening for: faceapp://match?path=...
          </Text>
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
            {lastResult.confidence && (
              <View style={styles.confidenceSection}>
                <Text style={styles.confidenceLabel}>
                  Confidence Level: {(parseFloat(lastResult.confidence) * 100).toFixed(1)}%
                </Text>
                <View style={styles.confidenceBar}>
                  <View 
                    style={[
                      styles.confidenceBarFill, 
                      { 
                        width: `${parseFloat(lastResult.confidence) * 100}%`,
                        backgroundColor: parseFloat(lastResult.confidence) >= 0.90 
                          ? '#4CAF50' 
                          : parseFloat(lastResult.confidence) >= 0.75 
                            ? '#FF9800' 
                            : '#f44336'
                      }
                    ]} 
                  />
                </View>
                {parseFloat(lastResult.confidence) >= 0.90 && (
                  <Text style={styles.highConfidence}>✅ High Confidence Match</Text>
                )}
                {parseFloat(lastResult.confidence) >= 0.75 && parseFloat(lastResult.confidence) < 0.90 && (
                  <Text style={styles.mediumConfidence}>⚠️ Medium Confidence - Manual Verification Recommended</Text>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Face Database Modal */}
      <Modal
        visible={showFaceDbModal}
        animationType="slide"
        onRequestClose={() => setShowFaceDbModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Face Database ({faceDbImages.length})</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowFaceDbModal(false)}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={faceDbImages}
            renderItem={renderFaceDbItem}
            keyExtractor={(item) => item.filename}
            numColumns={2}
            contentContainerStyle={styles.faceGrid}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No faces in database. Add some faces to get started!</Text>
            }
          />
        </View>
      </Modal>

      {/* Test Image Modal */}
      <Modal
        visible={showTestModal}
        animationType="slide"
        onRequestClose={() => setShowTestModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Face Recognition Test</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowTestModal(false)}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.testContent}>
            {testImage && (
              <View style={styles.testImageContainer}>
                <Text style={styles.testLabel}>Test Image:</Text>
                <Image source={{ uri: testImage }} style={styles.testImage} />
              </View>
            )}
            
            {lastResult && (
              <View style={styles.testResult}>
                <Text style={styles.testLabel}>Result:</Text>
                <View style={[
                  styles.resultCard,
                  {
                    backgroundColor: lastResult.match === 'yes' ? '#e8f5e8' : 
                                   lastResult.match === 'possible' ? '#fff3e0' : '#ffebee'
                  }
                ]}>
                  <Text style={styles.resultText}>
                    {lastResult.match === 'yes' 
                      ? `✅ Match Found: ${lastResult.filename}`
                      : lastResult.match === 'possible'
                        ? `⚠️ Possible Match: ${lastResult.filename}`
                        : '❌ No Match Found'
                    }
                  </Text>
                  {lastResult.confidence && (
                    <Text style={styles.resultConfidence}>
                      Confidence: {(parseFloat(lastResult.confidence) * 100).toFixed(1)}%
                    </Text>
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 6,
    marginTop: 10,
    flex: 1,
    marginHorizontal: 2,
  },
  addButton: {
    backgroundColor: '#4CAF50',
  },
  testButton: {
    backgroundColor: '#FF9800',
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
  confidenceSection: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
  },
  confidenceLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  confidenceBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  highConfidence: {
    color: '#4CAF50',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  mediumConfidence: {
    color: '#FF9800',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#2196F3',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  faceGrid: {
    padding: 10,
  },
  faceItem: {
    width: (width - 30) / 2 - 10,
    margin: 5,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    elevation: 2,
    position: 'relative',
  },
  faceImage: {
    width: '100%',
    height: 120,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  placeholderText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  faceFilename: {
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
    color: '#333',
  },
  removeButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 25,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 50,
  },
  testContent: {
    flex: 1,
    padding: 20,
  },
  testImageContainer: {
    marginBottom: 20,
  },
  testLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  testImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  testResult: {
    marginTop: 20,
  },
  resultCard: {
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resultText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  resultConfidence: {
    fontSize: 14,
    color: '#666',
  },
});
