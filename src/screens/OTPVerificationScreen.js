import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import axios from 'axios';

const FONNTE_TOKEN = 'AmaaJpg2iQCaF54456H8';

export default function OTPVerificationScreen({ navigation, route }) {
  const { phone, email, userData, generatedOTP, onVerificationSuccess } = route.params || {};
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [currentOTP, setCurrentOTP] = useState(generatedOTP);
  const inputRefs = useRef([]);

  useEffect(() => {
    // Auto focus first input
    setTimeout(() => {
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    }, 300);

    // Countdown timer for resend
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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

  const handleOtpChange = (value, index) => {
    // Only allow numbers
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
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;

    try {
      setIsLoading(true);
      const newOTP = await sendOTP(phone);
      setCurrentOTP(newOTP);
      
      setIsLoading(false);
      Alert.alert('Sukses', 'Kode OTP telah dikirim ulang via WhatsApp');
      setResendTimer(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);

      // Restart countdown
      const timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (error) {
      setIsLoading(false);
      Alert.alert('Error', 'Gagal mengirim ulang OTP. Silakan coba lagi.');
    }
  };

  const handleConfirm = async () => {
    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      Alert.alert('Error', 'Mohon masukkan kode OTP lengkap (6 digit)');
      return;
    }

    try {
      setIsLoading(true);

      // Verify OTP
      if (otpCode === currentOTP) {
        // Call callback untuk update profile
        if (onVerificationSuccess) {
          await onVerificationSuccess();
        }
        
        setIsLoading(false);
        
        Alert.alert('Sukses', 'Verifikasi berhasil!', [
          {
            text: 'OK',
            onPress: () => {
              // Kembali 2 screen (ke Profile)
              navigation.navigate('Profile');
            },
          },
        ]);
      } else {
        setIsLoading(false);
        Alert.alert('Error', 'Kode OTP tidak valid. Silakan coba lagi.');
        setOtp(['', '', '', '', '', '']);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setIsLoading(false);
      Alert.alert('Error', 'Verifikasi gagal. Silakan coba lagi.');
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="chevron-back" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Akun</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Section */}
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              {userData?.avatar ? (
                <Image source={{ uri: userData.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Icon name="person" size={50} color="#C5C5C5" />
                </View>
              )}
            </View>

            <Text style={styles.userName}>
              {userData?.f_name || 'User'} {userData?.l_name || ''}
            </Text>
            {/* <Text style={styles.memberType}>Basic Member</Text> */}
          </View>

          {/* OTP Section */}
          <View style={styles.otpContainer}>
            <Text style={styles.otpTitle}>Masukkan Kode OTP</Text>
            <Text style={styles.otpSubtitle}>
              Silahkan Masukkan 6 digit kode OTP yang
            </Text>
            <Text style={styles.otpSubtitle}>
              dikirimkan melalui whatsapp
            </Text>

            {/* OTP Input Boxes */}
            <View style={styles.otpInputContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={[styles.otpInput, digit && styles.otpInputFilled]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            {/* Resend OTP */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Tidak menerima kode OTP? </Text>
              <TouchableOpacity onPress={handleResendOTP} disabled={!canResend || isLoading}>
                <Text style={[styles.resendLink, !canResend && styles.resendLinkDisabled]}>
                  Kirim Ulang {resendTimer > 0 && `(${resendTimer}s)`}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, isLoading && styles.confirmButtonDisabled]}
                onPress={handleConfirm}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>Konfirmasi</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Fixed Bottom Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            onPress={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>Simpan</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    paddingTop: StatusBar.currentHeight || 0,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#F9F9F9',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Medium',
    color: '#000',
    flex: 1,
    textAlign: 'left',
    marginLeft: 10,
  },
  placeholder: {
    width: 40,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#C5C5C5',
    marginBottom: 5,
  },
  memberType: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#C5C5C5',
  },
  otpContainer: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 20,
    paddingVertical: 35,
    paddingHorizontal: 25,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  otpTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-SemiBold',
    color: '#000',
    marginBottom: 12,
  },
  otpSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  otpInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
    marginBottom: 25,
    paddingHorizontal: 5,
    marginLeft: 50
  },
  otpInput: {
    width: 45,
    height: 45,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#5DCBAD',
    backgroundColor: '#FFF',
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    textAlign: 'center',
    color: '#000',
    marginHorizontal: 4,
  },
  otpInputFilled: {
    backgroundColor: '#E8F5F2',
    borderColor: '#5DCBAD',
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  resendText: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  resendLink: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
    color: '#5DCBAD',
  },
  resendLinkDisabled: {
    color: '#C5C5C5',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#5DCBAD',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: '#5DCBAD',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#5DCBAD',
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#A5E5D7',
  },
  confirmButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFF',
  },
  bottomContainer: {
    backgroundColor: '#D5F5ED',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  saveButton: {
    backgroundColor: '#5DCBAD',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#A5E5D7',
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFF',
  },
});