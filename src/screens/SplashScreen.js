import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image } from 'react-native';
import IMGsrc from '../assets/splashimg.png';
export default function SplashScreen({ navigation }) {
  useEffect(() => {
    setTimeout(() => {
      navigation.replace("Onboarding");
    }, 1500);
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
