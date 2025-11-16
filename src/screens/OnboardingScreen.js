import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Image, ImageBackground } from 'react-native';
import Swiper from 'react-native-swiper';
const { width, height } = Dimensions.get('window');

export default function OnboardingScreen({ navigation }) {
  const swiperRef = useRef(null);
  const [index, setIndex] = useState(0);

  const pages = [
    { 
      title: "Semua Layanan, Satu Aplikasi", 
      desc: "Belanja, kuliner, transportasi, kirim paket, PPOB & jasa cukup Ditokoku.id. Transaksi aman, cepat, nyaman.",
      image: require('../assets/onboarding1.png'), 
      buttonText: "Lanjutkan",
      buttonColor: "#FF5F00"
    },
    { 
      title: "Dompet Terpadu, Bayar Tanpa Ribet", 
      desc: "Satu saldo untuk semua. Top-up gampang, bayar instan, riwayat jelas, notifikasi real-time. Tetap aman, cepat, nyaman.",
      image: require('../assets/onboarding2.png'), 
      buttonText: "Lanjutkan",
      buttonColor: "#FF5F00"
    },
    { 
      title: "Dekat dengan Bisnis Lokal", 
      desc: "Jelajah UMKM sekitar, kumpulkan poin & tukar voucher, banyak promo tiap hari. Tetap aman, cepat, nyaman.",
      image: require('../assets/onboarding3.png'), 
      buttonText: "Lanjutkan",
      buttonColor: "#4CAF50"
    },
  ];

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
            source={item.image}  // ✅ UBAH DI SINI: i.image → item.image
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
    // overlay gelap dikit biar text keliatan
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
    color: '#000000' // ubah jadi putih biar keliatan di gambar
  },
  desc: { 
    fontSize: 12, 
    color: 'black', // ubah jadi putih
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
          height:  52,
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