import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Image, ImageBackground, ActivityIndicator } from 'react-native';
import Swiper from 'react-native-swiper';
import axios from 'axios';
import { API_URL } from '../context/APIUrl';

const { width, height } = Dimensions.get('window');

export default function OnboardingScreen({ navigation }) {
  const swiperRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [pages, setPages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Default hardcode data
  const defaultPages = [
    { 
      title: "Semua Layanan, Satu Aplikasi", 
      desc: "Belanja, kuliner, transportasi, kirim paket, PPOB & jasa cukup Ditokoku.id. Transaksi aman, cepat, nyaman.",
      image: require('../assets/onboarding1.png'), 
      buttonText: "Lanjutkan",
      buttonColor: "#FF5F00",
      isLocal: true
    },
    { 
      title: "Dompet Terpadu, Bayar Tanpa Ribet", 
      desc: "Satu saldo untuk semua. Top-up gampang, bayar instan, riwayat jelas, notifikasi real-time. Tetap aman, cepat, nyaman.",
      image: require('../assets/onboarding2.png'), 
      buttonText: "Lanjutkan",
      buttonColor: "#FF5F00",
      isLocal: true
    },
    { 
      title: "Dekat dengan Bisnis Lokal", 
      desc: "Jelajah UMKM sekitar, kumpulkan poin & tukar voucher, banyak promo tiap hari. Tetap aman, cepat, nyaman.",
      image: require('../assets/onboarding3.png'), 
      buttonText: "Lanjutkan",
      buttonColor: "#4CAF50",
      isLocal: true
    },
  ];

  useEffect(() => {
    fetchOnboardingData();
  }, []);

  const fetchOnboardingData = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/api/onboarding?is_active=1`);
      
      if (response.data.status && response.data.data.length > 0) {
        // Mapping data dari API
        const apiPages = response.data.data.map((item) => ({
          title: item.title,
          desc: item.description,
          image: { uri: `${API_URL}/uploads/onboarding/${item.image}` },
          buttonText: "Lanjutkan",
          buttonColor: "#5DCBAD",
          isLocal: false
        }));
        
        setPages(apiPages);
      } else {
        // Jika data kosong, pakai hardcode
        setPages(defaultPages);
      }
    } catch (error) {
      console.error('Error fetching onboarding:', error);
      // Jika error, pakai hardcode
      setPages(defaultPages);
    } finally {
      setIsLoading(false);
    }
  };

  const goNext = () => {
    if (index === pages.length - 1) {
      navigation.replace("Login");
    } else {
      swiperRef.current.scrollBy(1);
    }
  };

  const skipOnboarding = () => {
    navigation.replace("Login");
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5DCBAD" />
        <Text style={styles.loadingText}>Memuat...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Skip Button */}
      {/* {index < pages.length - 1 && (
        <TouchableOpacity style={styles.skipBtn} onPress={skipOnboarding}>
          <Text style={styles.skipText}>Lewati</Text>
        </TouchableOpacity>
      )} */}

      <Swiper
        ref={swiperRef}
        loop={false}
        showsPagination
        activeDotColor="#5DCBAD"
        dotColor="#E0E0E0"
        paginationStyle={styles.pagination}
        onIndexChanged={setIndex}
      >
        {pages.map((item, i) => (
          <ImageBackground
            key={i}
            source={item.image}
            style={styles.imageContainer}
            resizeMode="cover"
          >
            <View style={styles.overlay}>
              {/* Content */}
              <View style={styles.content}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.desc}>{item.desc}</Text>
              </View>

              {/* Button */}
              <View style={styles.bottom}>
                <TouchableOpacity 
                  style={[styles.btn, { backgroundColor: '#5DCBAD' }]} 
                  onPress={goNext}
                >
                  <Text style={styles.btnText}>{item.buttonText}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ImageBackground>
        ))}
      </Swiper>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#666',
  },
  skipBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 20
  },
  skipText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600'
  },
  imageContainer: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 60
  },
  content: {
    paddingHorizontal: 30,
    paddingBottom: 40,
    alignItems: 'center'
  },
  title: { 
    fontSize: 25, 
    marginTop: 151,
    marginBottom: 10,
    fontFamily: 'PlusJakartaSans-Bold',
    textAlign: 'center',
    color: '#000000'
  },
  desc: { 
    fontSize: 12, 
    color: 'black',
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans-Regular',
    marginBottom: 10,
  },
  pagination: {
    bottom: 100
  },
  bottom: { 
    paddingHorizontal: 20,
  },
  btn: {
    padding: 12,
    marginBottom: -30,
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  btnText: { 
    color: 'white', 
    fontSize: 16, 
    fontFamily: 'PlusJakartaSans-SemiBold',
  }
});