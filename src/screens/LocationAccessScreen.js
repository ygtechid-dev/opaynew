import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Geolocation from '@react-native-community/geolocation';

export default function LocationAccessScreen({ navigation, route }) {
  const { userData, token } = route.params || {};
  const [loading, setLoading] = useState(false);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Izin Akses Lokasi',
            message: 'Ditokoku memerlukan akses lokasi Anda',
            buttonNeutral: 'Tanya Nanti',
            buttonNegative: 'Tolak',
            buttonPositive: 'Izinkan',
          }
        );
        
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          return true;
        } else {
          Alert.alert(
            'Izin Ditolak',
            'Anda menolak izin akses lokasi. Beberapa fitur mungkin tidak dapat digunakan.'
          );
          return false;
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    } else {
      // iOS akan otomatis meminta izin saat Geolocation.getCurrentPosition dipanggil
      return true;
    }
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          resolve({ latitude, longitude });
        },
        (error) => {
          console.error('Error getting location:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000
        }
      );
    });
  };

  const handleAllowLocation = async () => {
    setLoading(true);

    try {
      // 1. Request permission
      const hasPermission = await requestLocationPermission();
      
      if (!hasPermission) {
        setLoading(false);
        // User bisa skip dan tetap lanjut ke Home
        Alert.alert(
          'Lanjutkan Tanpa Lokasi?',
          'Anda dapat mengaktifkan lokasi nanti di pengaturan.',
          [
            {
              text: 'Coba Lagi',
              onPress: () => handleAllowLocation()
            },
            {
              text: 'Lanjutkan',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ 
                    name: 'Home',
                    params: {
                      userData,
                      token,
                      location: null
                    }
                  }],
                });
              }
            }
          ]
        );
        return;
      }

      // 2. Get current location
      const location = await getCurrentLocation();
      
      console.log('Location obtained:', location);

      // 3. Simpan location ke AsyncStorage atau state management jika perlu
      // await AsyncStorage.setItem('userLocation', JSON.stringify(location));

      // 4. Navigate ke Home dengan data location
      navigation.reset({
        index: 0,
        routes: [{ 
          name: 'Home',
          params: {
            userData,
            token,
            location
          }
        }],
      });

    } catch (error) {
      console.error('Location error:', error);
      
      Alert.alert(
        'Gagal Mendapatkan Lokasi',
        'Tidak dapat mengakses lokasi Anda. Pastikan GPS aktif dan coba lagi.',
        [
          {
            text: 'Coba Lagi',
            onPress: () => handleAllowLocation()
          },
          {
            text: 'Lewati',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ 
                  name: 'Home',
                  params: {
                    userData,
                    token,
                    location: null
                  }
                }],
              });
            }
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Lewati Akses Lokasi?',
      'Anda dapat mengaktifkan akses lokasi nanti di pengaturan.',
      [
        {
          text: 'Batal',
          style: 'cancel'
        },
        {
          text: 'Lewati',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ 
                name: 'Home',
                params: {
                  userData,
                  token,
                  location: null
                }
              }],
            });
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Icon name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Akses Lokasi</Text>
        <Text style={styles.subtitle}>
          Izinkan akses lokasi agar penjemputan, pemesanan makanan dan lainnya lebih cepat dan akurat. Ini juga membantu kami menjaga keselamatan Anda. Kami berkomitmen penuh untuk melindungi dan menjaga privasi data lokasi Anda
        </Text>

        {/* Location Icon */}
        <View style={styles.iconContainer}>
          <Image 
            source={require('../assets/map-location.png')} 
            style={styles.mapImage}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.btn, loading && styles.btnDisabled]} 
          onPress={handleAllowLocation}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.btnText}>Izinkan Akses Lokasi</Text>
          )}
        </TouchableOpacity>

        {/* <TouchableOpacity 
          style={styles.skipBtn} 
          onPress={handleSkip}
          disabled={loading}
        >
          <Text style={styles.skipBtnText}>Lewati</Text>
        </TouchableOpacity> */}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backBtn: {
    padding: 5
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 10,
    paddingHorizontal: 28
  },
  title: {
    fontSize: 28,
    color: '#000',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 15,
    lineHeight: 42
  },
  subtitle: {
    fontSize: 15,
    color: '#000000',
    fontFamily: 'PlusJakartaSans-Regular',
    lineHeight: 20,
    marginBottom: 40
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 20
  },
  mapImage: {
    width: 150,
    height: 150
  },
  footer: {
    padding: 20,
    paddingBottom: 30
  },
  btn: { 
    backgroundColor: '#5DCBAD', 
    padding: 11, 
    height: 52,
    borderRadius: 12,
    shadowColor: '#4FD1C5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 12
  },
  btnDisabled: {
    backgroundColor: '#D0D0D0',
    shadowOpacity: 0
  },
  btnText: { 
    color: 'white', 
    textAlign: 'center', 
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
  },
  skipBtn: {
    padding: 11,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  skipBtnText: {
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
  }
});