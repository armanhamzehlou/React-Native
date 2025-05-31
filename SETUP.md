
# React Native Facial Recognition Service

This app provides local facial recognition services that can be called from other Android apps.

## Features

- 📱 Local facial recognition (offline)
- 🔗 Deep link support (`faceapp://match?path=...`)
- 📁 Local face database in `/storage/emulated/0/FaceDB/`
- 🚀 Intent-based external API
- ⚡ Fast on-device processing

## Setup Instructions

### 1. Create Face Database Directory

```bash
# On your Android device, create:
/storage/emulated/0/FaceDB/
```

### 2. Add Face Images

- Copy face images (jpg, png, jpeg, bmp) to the FaceDB folder
- Name files with recognizable names (e.g., `john_doe.jpg`, `alice_smith.png`)
- Each image should contain one clear face

### 3. Install Dependencies

The app will automatically install required packages:
- TensorFlow.js
- face-api.js
- react-native-fs
- react-native-permissions

### 4. Configure Permissions

The app requests these Android permissions:
- `READ_EXTERNAL_STORAGE`
- `WRITE_EXTERNAL_STORAGE`

## Usage

### Deep Link API

Call from other apps using:

```javascript
// Android Intent
Intent intent = new Intent(Intent.ACTION_VIEW);
intent.setData(Uri.parse("faceapp://match?path=/storage/emulated/0/DCIM/photo.jpg"));
startActivity(intent);
```

### Response Format

```json
// Match found
{ 
  "match": "yes", 
  "filename": "alice_smith.jpg",
  "confidence": "0.876"
}

// No match
{ 
  "match": "no" 
}

// Error
{ 
  "match": "no", 
  "error": "No face detected in input image" 
}
```

## Development Notes

### Current Implementation

- Uses TensorFlow.js framework
- Simulated face descriptors for demo (replace with real face-api.js)
- Euclidean distance for face comparison
- Configurable similarity threshold (0.6)

### Production Setup

To use real facial recognition:

1. Download face-api.js model files
2. Include models in app assets
3. Replace mock descriptor extraction with real implementation
4. Fine-tune similarity threshold based on testing

### File Structure

```
src/
  services/
    FaceRecognitionService.js  # Core facial recognition logic
  utils/
    PermissionManager.js       # Android permissions handling
```

## Testing

1. Start the app
2. Check that FaceDB directory is created
3. Add test images to FaceDB folder
4. Tap "Reload Database" to load faces
5. Use "Test Face Match" or deep link to test recognition

## Limitations

- Currently uses simulated face descriptors
- Requires manual model integration for production
- Android-focused (iOS would need additional setup)
- Single-face matching per image

## Next Steps

1. Integrate real face-api.js models
2. Add Intent receiver for external app calls
3. Implement background processing
4. Add batch face matching
5. Optimize performance for large databases
