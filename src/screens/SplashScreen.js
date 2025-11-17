import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image } from 'react-native';
import IMGsrc from '../assets/splash_new.png';
import AsyncStorage from '@react-native-async-storage/async-storage';
export default function SplashScreen({ navigation }) {
 useEffect(() => {
  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      setTimeout(() => {
        if (token) {
          navigation.replace("Home");   // Langsung ke Home
        } else {
          navigation.replace("Onboarding"); // Belum login → Onboarding
        }
      }, 1500);

    } catch (error) {
      console.log("Error checking token:", error);
      navigation.replace("Onboarding");
    }
  };

  checkAuth();
}, []);

  return (
    <View style={styles.container}>
      <Image source={IMGsrc} style={{width: '100%', height: '100%'}} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1},
  logo: { fontSize: 34, fontWeight: 'bold', marginBottom: 20, color: '#FF5F00' }
});
