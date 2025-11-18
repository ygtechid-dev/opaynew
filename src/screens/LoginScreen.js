import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  Modal,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import ReactNativeBiometrics from 'react-native-biometrics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../context/APIUrl';

const FONNTE_TOKEN = 'AmaaJpg2iQCaF54456H8';
const rnBiometrics = new ReactNativeBiometrics();

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // ✅ Biometric states
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState('');
  const [savedUserData, setSavedUserData] = useState(null);

  useEffect(() => {
    checkBiometricAvailability();
    checkSavedCredentials();
  }, []);

  // ✅ Cek ketersediaan biometrik
  const checkBiometricAvailability = async () => {
    try {
      const { available, biometryType } = await rnBiometrics.isSensorAvailable();
      
      if (available) {
        setBiometricAvailable(true);
        setBiometricType(biometryType);
        console.log('Biometric available:', biometryType);
      }
    } catch (error) {
      console.error('Error checking biometric:', error);
    }
  };

  // ✅ Cek apakah ada user yang tersimpan dengan biometric enabled
  const checkSavedCredentials = async () => {
    try {
      const biometricEnabledStorage = await AsyncStorage.getItem('biometricEnabled');
      const userData = await AsyncStorage.getItem('userData');
      
      if (biometricEnabledStorage === 'true' && userData) {
        setBiometricEnabled(true);
        setSavedUserData(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error checking saved credentials:', error);
    }
  };

  // ✅ Login dengan biometric
  const handleBiometricLogin = async () => {
    if (!biometricAvailable || !biometricEnabled) {
      return;
    }

    try {
      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: 'Verifikasi untuk masuk',
        cancelButtonText: 'Batal',
      });

      if (success) {
        setLoading(true);
        
        // Login otomatis dengan data tersimpan
        if (savedUserData && savedUserData.phone) {
          try {
            const loginResponse = await axios.post(`${API_URL}/api/users/auth/login`, {
              phone: savedUserData.phone
            });

            if (loginResponse.data.status) {
              const userData = loginResponse.data.data;
              const token = loginResponse.data.token;

              // Simpan data terbaru
              await AsyncStorage.setItem('userData', JSON.stringify(userData));
              await AsyncStorage.setItem('userToken', token);

              // Navigate ke Home
              navigation.replace('Main');
            } else {
              Alert.alert('Error', 'Login gagal. Silakan login manual.');
            }
          } catch (error) {
            console.error('Biometric login error:', error);
            Alert.alert('Error', 'Login gagal. Silakan login manual.');
          }
        }
      } else {
        console.log('Biometric authentication cancelled');
      }
    } catch (error) {
      console.error('Biometric error:', error);
      Alert.alert('Error', 'Autentikasi biometrik gagal');
    } finally {
      setLoading(false);
    }
  };

  const sendOTP = async (phoneNumber) => {
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      let formattedPhone = phoneNumber;
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '62' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('62')) {
        formattedPhone = '62' + formattedPhone;
      }

      const message = `Kode OTP Ditokoku Anda: ${otp}\n\nJangan berikan kode ini kepada siapapun. Kode berlaku selama 5 menit.`;

      const response = await axios.post(
        'https://api.fonnte.com/send',
        {
          target: formattedPhone,
          message: message,
          countryCode: '62'
        },
        {
          headers: {
            'Authorization': FONNTE_TOKEN,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status) {
        return otp;
      } else {
        throw new Error('Gagal mengirim OTP');
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      throw error;
    }
  };

  const doLogin = async () => {
    if (!phone) {
      Alert.alert("Error", "Nomor telepon wajib diisi");
      return;
    }
    if (!agreed) {
      Alert.alert("Error", "Anda harus menyetujui Syarat & Ketentuan");
      return;
    }

    setLoading(true);

    try {
      let formattedPhone = phone.replace(/\s/g, '');
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+62' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('+62')) {
        formattedPhone = '+62' + formattedPhone;
      }

      let isRegistered = false;
      let userData = null;
      let token = null;

      try {
        const loginResponse = await axios.post(`${API_URL}/api/users/auth/login`, {
          phone: formattedPhone
        });

        if (loginResponse.data.status) {
          isRegistered = true;
          userData = loginResponse.data.data;
          token = loginResponse.data.token;
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          isRegistered = false;
        } else {
          throw error;
        }
      }

      const otpCode = await sendOTP(phone);

      navigation.replace("OtpScreen", {
        phone: formattedPhone,
        otpCode: otpCode,
        isRegistered: isRegistered,
        userData: userData,
        token: token
      });

    } catch (error) {
      console.error('Login error:', error);
      
      if (error.message === 'Gagal mengirim OTP') {
        Alert.alert("Error", "Gagal mengirim kode OTP. Silakan coba lagi.");
      } else {
        Alert.alert("Error", "Tidak dapat terhubung ke server");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (text) => {
    setPhone(text);

    if (text.startsWith('0')) {
      setPhoneError('Silakan isi dengan awalan 8');
    } else {
      setPhoneError('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backBtn}
          onPress={() => navigation.replace('Onboarding')}
        >
          <Icon name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mulai</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.label}>Nomor Telepon</Text>
        
        {/* Phone Input with Flag */}
        <View style={styles.phoneContainer}>
          <View style={styles.flagSection}>
            <View style={styles.flag}>
              <View style={styles.flagRed} />
              <View style={styles.flagWhite} />
            </View>
            <Text style={styles.countryCode}>+62</Text>
            <View style={styles.divider} />
          </View>
          
          <TextInput
            placeholder="XXX XXXX XXXX"
            value={phone}
            onChangeText={handlePhoneChange}
            style={styles.phoneInput}
            keyboardType="phone-pad"
            maxLength={15}
            editable={!loading}
          />
        </View>
        
        {phoneError !== '' && (
          <Text style={styles.errorText}>{phoneError}</Text>
        )}

        {/* Checkbox Agreement */}
        <TouchableOpacity 
          style={styles.checkboxContainer}
          onPress={() => setAgreed(!agreed)}
          activeOpacity={0.7}
          disabled={loading}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && <Icon name="checkmark" size={16} color="#fff" />}
          </View>
          <Text style={styles.checkboxText}>
            Saya Setuju dengan{' '}
            <Text 
              style={styles.linkText}
              onPress={(e) => {
                e.stopPropagation();
                setModalVisible(true);
              }}
            >
              Syarat & Ketentuan
            </Text>
          </Text>
        </TouchableOpacity>

        {/* Button Login Normal */}
        <TouchableOpacity 
          style={[styles.btn, (!agreed || loading) && styles.btnDisabled]} 
          onPress={doLogin}
          disabled={!agreed || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.btnText}>Lanjut</Text>
          )}
        </TouchableOpacity>

        {/* ✅ Biometric Login Button */}
        {biometricAvailable && biometricEnabled && savedUserData && (
          <>
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>atau</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity 
              style={styles.biometricBtn}
              onPress={handleBiometricLogin}
              disabled={loading}
            >
              <Icon 
                name={biometricType === 'FaceID' ? 'scan' : 'finger-print'} 
                size={24} 
                color="#5DCBAD" 
              />
              <Text style={styles.biometricBtnText}>
                Masuk dengan {biometricType === 'FaceID' ? 'Face ID' : 'Sidik Jari'}
              </Text>
            </TouchableOpacity>

            {/* Info user tersimpan */}
            <View style={styles.savedUserInfo}>
              <Icon name="person-circle-outline" size={20} color="#666" />
              <Text style={styles.savedUserText}>
                Login sebagai {savedUserData.f_name || savedUserData.phone}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Modal Syarat & Ketentuan */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Syarat & Ketentuan</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
              >
                <Icon name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalText}>
                <Text style={styles.modalSubtitle}>1. Ketentuan Umum{'\n'}</Text>
                Dengan menggunakan aplikasi Ditokoku, Anda menyetujui untuk terikat dengan syarat dan ketentuan yang berlaku.{'\n\n'}
                
                <Text style={styles.modalSubtitle}>2. Privasi & Keamanan{'\n'}</Text>
                Kami berkomitmen untuk melindungi data pribadi Anda. Informasi yang Anda berikan akan digunakan sesuai dengan kebijakan privasi kami.{'\n\n'}
                
                <Text style={styles.modalSubtitle}>3. Penggunaan Layanan{'\n'}</Text>
                Anda bertanggung jawab penuh atas aktivitas yang dilakukan menggunakan akun Anda. Pastikan untuk menjaga kerahasiaan informasi login Anda.{'\n\n'}
                
                <Text style={styles.modalSubtitle}>4. Transaksi & Pembayaran{'\n'}</Text>
                Semua transaksi yang dilakukan melalui aplikasi ini bersifat final. Pastikan untuk memeriksa detail transaksi sebelum melakukan pembayaran.{'\n\n'}
                
                <Text style={styles.modalSubtitle}>5. Perubahan Ketentuan{'\n'}</Text>
                Kami berhak untuk mengubah syarat dan ketentuan ini sewaktu-waktu. Perubahan akan diberitahukan melalui aplikasi.{'\n\n'}
              </Text>
            </ScrollView>

            <TouchableOpacity 
              style={styles.modalBtn}
              onPress={() => {
                setAgreed(true);
                setModalVisible(false);
              }}
            >
              <Text style={styles.modalBtnText}>Saya Mengerti</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backBtn: {
    padding: 5
  },
  headerTitle: {
    fontSize: 20,
    color: '#000',
    fontFamily: 'Poppins-Medium'
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 30
  },
  label: {
    fontSize: 16,
    color: '#000',
    marginBottom: 11,
    fontFamily: 'Poppins-Medium'
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#5DCBAD',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 20,
    height: 70
  },
  flagSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10
  },
  flag: {
    width: 32,
    height: 20,
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 8
  },
  flagRed: {
    flex: 1,
    backgroundColor: '#FF0000'
  },
  flagWhite: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  countryCode: {
    fontSize: 20,
    fontFamily: 'Poppins-Medium',
    color: '#000',
    marginRight: 10
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#E0E0E0'
  },
  phoneInput: {
    flex: 1,
    fontSize: 20,
    color: '#000',
    paddingLeft: 10,
    marginTop: -3
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30
  },
  errorText: {
    color: 'red',
    marginTop: -14,
    marginBottom: 30,
    fontSize: 12,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  checkboxChecked: {
    backgroundColor: '#4FD1C5',
    borderColor: '#4FD1C5'
  },
  checkboxText: {
    fontSize: 12,
    color: '#000',
    flex: 1,
    fontFamily: 'Poppins-Medium',
  },
  linkText: {
    fontFamily: 'Poppins-SemiBold',
    color: '#5DCBAD',
    fontSize: 13,
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
    elevation: 5
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

  // ✅ Biometric Styles
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 15,
    fontSize: 14,
    color: '#999',
    fontFamily: 'Poppins-Regular',
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#5DCBAD',
    padding: 11,
    height: 52,
    borderRadius: 12,
    gap: 10,
  },
  biometricBtnText: {
    color: '#5DCBAD',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  savedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    gap: 8,
  },
  savedUserText: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'Poppins-Regular',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000'
  },
  closeBtn: {
    padding: 5
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 20
  },
  modalText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333'
  },
  modalSubtitle: {
    fontWeight: '700',
    fontSize: 15,
    color: '#000'
  },
  modalBtn: {
    backgroundColor: '#4FD1C5',
    marginHorizontal: 20,
    marginVertical: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  modalBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});