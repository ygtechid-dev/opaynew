import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';


const FONNTE_TOKEN = 'AmaaJpg2iQCaF54456H8';

export default function OTPScreen({ navigation, route }) {
    const { phone, otpCode, isRegistered, userData, token } = route.params || {};
    console.log('otpcc', otpCode);
    
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const inputRefs = useRef([]);

  const handleOtpChange = (value, index) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

   const handleResendOTP = async () => {
    setResendLoading(true);
    
    try {
      // Generate 6 digit OTP baru
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Format phone number untuk Fonnte
      let formattedPhone = phone;
      if (formattedPhone.startsWith('+62')) {
        formattedPhone = '62' + formattedPhone.substring(3);
      } else if (formattedPhone.startsWith('0')) {
        formattedPhone = '62' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('62')) {
        formattedPhone = '62' + formattedPhone;
      }

      const message = `Kode OTP Ditokoku Anda: ${newOtp}\n\nJangan berikan kode ini kepada siapapun. Kode berlaku selama 5 menit.`;

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
        // Update OTP code di route params
        navigation.setParams({ otpCode: newOtp });
        Alert.alert("Berhasil", "Kode OTP baru telah dikirim");
        
        // Clear OTP input
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        Alert.alert("Gagal", "Gagal mengirim kode OTP. Silakan coba lagi.");
      }
    } catch (error) {
      console.error('Error resending OTP:', error);
      Alert.alert("Error", "Tidak dapat mengirim OTP. Silakan coba lagi.");
    } finally {
      setResendLoading(false);
    }
  };

 const handleConfirm = async () => {
    const otpInput = otp.join('');
    
    if (otpInput.length !== 6) {
      Alert.alert('Error', 'Masukkan 6 digit kode OTP');
      return;
    }

    // Verifikasi OTP
    if (otpInput !== otpCode) {
      Alert.alert('Error', 'Kode OTP tidak valid. Silakan coba lagi.');
      return;
    }

    setLoading(true);

    try {
      if (isRegistered) {
        // User sudah terdaftar, langsung ke Home
        // Simpan token ke AsyncStorage jika perlu
        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } else {
        // User belum terdaftar, arahkan ke RegisterScreen
        navigation.navigate('RegisterScreen', {
          phone: phone
        });
      }
    } catch (error) {
      console.error('Error confirming OTP:', error);
      Alert.alert('Error', 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backBtn}
          onPress={() => navigation.navigate('Login')}
        >
          <Icon name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Masukkan Kode OTP</Text>
        <Text style={styles.subtitle}>
          Silahkan Masukkan 6 digit kode OTP yang dikirimkan melalui whatsapp
        </Text>

        {/* OTP Input Boxes */}
        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
          <View key={index} style={styles.otpBoxContainer}>
  <TextInput
    ref={(ref) => (inputRefs.current[index] = ref)}
    style={styles.otpInput}
    value={digit}
    onChangeText={(value) => handleOtpChange(value, index)}
    onKeyPress={(e) => handleKeyPress(e, index)}
    keyboardType="number-pad"
    maxLength={1}
  />
</View>

          ))}
        </View>

        {/* Resend Link */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Tidak menerima kode OTP? </Text>
          <TouchableOpacity>
            <Text style={styles.resendLink}>Kirim Ulang</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Confirm Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.btn} 
          onPress={handleConfirm}
        >
          <Text style={styles.btnText}>Konfirmasi</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 14,
    paddingVertical: 15,
  },
  backBtn: {
    padding: 5
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 26,
    color: '#000',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 15,
    lineHeight: 32
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
       fontFamily: 'PlusJakartaSans-Regular',
    lineHeight: 22,
    marginBottom: 24,
    marginTop: -10,
    maxWidth: '80%'
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    marginLeft: -5,
  },
otpBoxContainer: {
  width: 52,
  height: 56,
  borderWidth: 1,
  borderColor: '#5DCBAD',
  borderRadius: 18,
  marginLeft: 3,
  backgroundColor: '#fff',
  justifyContent: 'center',
  alignItems: 'center',
},

otpInput: {
  fontSize: 24,
  fontFamily: 'Poppins-SemiBold',
  color: '#000',
  paddingVertical: 5,
  paddingHorizontal: 14,
  textAlign: 'center'
},


  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  resendText: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'Poppins-Regular'
  },
  resendLink: {
    fontSize: 13,
    color: '#5DCBAD',
    fontFamily: 'Poppins-SemiBold'
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
    elevation: 5
  },
  btnText: { 
    color: 'white', 
    textAlign: 'center', 
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
  }
});