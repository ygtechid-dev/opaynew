import React, { useState } from 'react';
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
import {API_URL} from '../context/APIUrl'

const FONNTE_TOKEN = 'AmaaJpg2iQCaF54456H8';

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const sendOTP = async (phoneNumber) => {
    try {
      // Generate 6 digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Format phone number untuk Fonnte (harus dengan format 62xxx)
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
      // Format phone number (tambahkan +62 jika dimulai dengan 0)
      let formattedPhone = phone.replace(/\s/g, ''); // Hapus spasi
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+62' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('+62')) {
        formattedPhone = '+62' + formattedPhone;
      }

      let isRegistered = false;
      let userData = null;
      let token = null;

      try {
        // 1. Cek apakah nomor sudah terdaftar
        const loginResponse = await axios.post(`${API_URL}/api/users/auth/login`, {
          phone: formattedPhone
        });

        if (loginResponse.data.status) {
          isRegistered = true;
          userData = loginResponse.data.data;
          token = loginResponse.data.token;
        }
      } catch (error) {
        // Jika error 404 (nomor belum terdaftar), tetap lanjut kirim OTP
        if (error.response && error.response.status === 404) {
          isRegistered = false;
        } else {
          // Error lain, throw
          throw error;
        }
      }

      // 2. Kirim OTP via Fonnte (baik terdaftar atau belum)
      const otpCode = await sendOTP(phone);

      // 3. Navigate ke OTP Screen dengan membawa data
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
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
            onChangeText={setPhone}
            style={styles.phoneInput}
            keyboardType="phone-pad"
            maxLength={15}
            editable={!loading}
          />
        </View>

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

        {/* Button */}
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
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Syarat & Ketentuan</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
              >
                <Icon name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
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

            {/* Modal Footer */}
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
    borderWidth: 2,
    borderColor: '#5DCBAD',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    marginBottom: 20
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