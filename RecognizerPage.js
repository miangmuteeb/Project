import React, { useEffect, useState, useRef } from 'react';
import { Text, SafeAreaView, View, TouchableOpacity, Dimensions, Image } from 'react-native';
import AppLoading from 'expo-app-loading';
import { useFonts } from '@use-expo/font';
import { Camera } from 'expo-camera';
import axios from 'axios';
import IconFlip from '../Assets/icons/IconFlip'; // Ensure this path is correct.
import { useIsFocused } from '@react-navigation/native';
import { Fonts } from '../Constants/Fonts';

const RecognizerPage = () => {
  let [fontsLoaded] = useFonts(Fonts);
  const [hasPermission, setHasPermission] = useState(null);
  const [type, setType] = useState(Camera.Constants.Type.back);
  const [recording, setRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState([]);
  const [service, setService] = useState('');
  const cameraRef = useRef(null);
  const isFocused = useIsFocused();

  // Request camera permissions and set the API endpoint.
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      setService("https://detect.roboflow.com/asl-new/3"); // Update with your API base URL.
    })();
  }, []);

  // Capture and process images at intervals.
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!recording || !cameraRef.current) return;

      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
        if (!photo.uri) {
          console.error('Failed to capture photo.');
          return;
        }

        const formData = new FormData();
        formData.append('file', {
          uri: photo.uri,
          name: 'gesture.jpg',
          type: 'image/jpg',
        });

        // Trying POST method first.
        try {
          const response = await axios.post(`${service}/predict`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });

          const word = response.data; // Update this based on your API's response structure.
          setRecognizedText((prevText) => {
            if (prevText[prevText.length - 1] !== word) {
              return [...prevText, word];
            }
            return prevText;
          });
        } catch (postError) {
          // If POST fails, try GET or another method based on your API docs
          console.error('POST failed, trying GET:', postError.message);

          try {
            const response = await axios.get(`${service}/predict`, {
              headers: { 'Content-Type': 'multipart/form-data' },
              params: { file: formData }, // Some APIs use GET with query params
            });
            const word = response.data; // Handle this based on API response.
            setRecognizedText((prevText) => {
              if (prevText[prevText.length - 1] !== word) {
                return [...prevText, word];
              }
              return prevText;
            });
          } catch (getError) {
            console.error('GET also failed:', getError.message);
          }
        }
      } catch (error) {
        console.error('Error during prediction:', error.message);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [recording, service]);

  if (hasPermission === null) return <View />;
  if (hasPermission === false) return <Text>No access to camera</Text>;

  const renderContent = () => (
    <View style={{ width: Dimensions.get('window').width, flex: 1, backgroundColor: 'transparent' }}>
      <View
        style={{
          flex: 1,
          height: 250,
          alignSelf: 'flex-end',
          alignItems: 'center',
          backgroundColor: 'white',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}
      >
        <TouchableOpacity
          style={{ paddingVertical: 18 }}
          onPress={() => setRecognizedText(recognizedText.slice(0, -1))}
        >
          <Text style={{ margin: 18, fontFamily: 'Bold', textAlign: 'center', color: 'gray' }}>
            {recognizedText.length > 0 ? 'Translation Result' : ''}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text
              style={{
                marginBottom: 32,
                textAlign: 'center',
                fontSize: recognizedText.length > 0 ? 32 : 18,
                fontFamily: 'Bold',
                color: recognizedText.length > 0 ? 'black' : 'gray',
              }}
            >
              {recognizedText.length > 0 ? recognizedText.join(' ') : "Press 'Record' to start"}
            </Text>
            {recognizedText.length > 0 && (
              <Image
                style={{
                  width: 24,
                  height: 20,
                  marginLeft: 8,
                  marginBottom: 32,
                  resizeMode: 'stretch',
                }}
                source={require('../Assets/images/ImageBackspace.png')}
              />
            )}
          </View>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <TouchableOpacity onPress={() => setRecording((prev) => !prev)}>
            <View
              style={{
                height: 70,
                width: 70,
                backgroundColor: 'red',
                borderRadius: 35,
                borderWidth: recording ? 5 : 20,
                borderColor: 'white',
              }}
            />
          </TouchableOpacity>
          <View style={{ width: 30 }} />
          <TouchableOpacity
            onPress={() =>
              setType(
                type === Camera.Constants.Type.back
                  ? Camera.Constants.Type.front
                  : Camera.Constants.Type.back
              )
            }
          >
            <View
              style={{
                height: 40,
                width: 40,
                backgroundColor: 'white',
                borderRadius: 20,
              }}
            >
              <IconFlip />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderCamera = () =>
    isFocused ? (
      <Camera style={{ flex: 1 }} type={type} ref={cameraRef}>
        {renderContent()}
      </Camera>
    ) : (
      renderContent()
    );

  if (!fontsLoaded) return <AppLoading />;

  return <SafeAreaView style={{ flex: 1 }}>{renderCamera()}</SafeAreaView>;
};

export default RecognizerPage;
