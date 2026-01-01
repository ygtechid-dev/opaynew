import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../context/APIUrl';

const { height, width } = Dimensions.get('window');

export default function ForgotPinPage({ navigation }) {
  const [currentStep, setCurrentStep] = useState('otp'); // 'otp', 'newPin', 'confirmPin'
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
const FONNTE_TOKEN = 'AmaaJpg2iQCaF54456H8';

  // User data
  const [userId, setUserId] = useState(null);
  const [userPhone, setUserPhone] = useState(null);

  // OTP
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [enteredOTP, setEnteredOTP] = useState('');

  // PIN
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const maxPinLength = 6;

  console.log('====================================');
  console.log('newpin', newPin);
  console.log('confnewpin', confirmNewPin);
  console.log('====================================');

  useEffect(() => {
    initializePage();
  }, []);

  const initializePage = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');

      if (userData) {
        const userObj = JSON.parse(userData);
        setUserId(userObj.id.toString());
        setUserPhone(userObj.phone || userObj.f_name);

        console.log('User ID:', userObj.id);
        console.log('User Phone:', userObj.phone);

        // Send OTP immediately
        await sendOTP(userObj.phone || userObj.f_name);
      } else {
        Alert.alert('Error', 'User tidak teridentifikasi. Silakan login ulang.');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Initialize error:', error);
      Alert.alert('Error', 'Gagal memuat data user.');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };
const sendOTP = async (phoneNumber) => {
  try {
    setIsProcessing(true);

    // Generate OTP 6 digit
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOTP(otp);

    // Format nomor jika perlu (misal hapus 0 di depan)
    const formattedPhone = phoneNumber.startsWith('0')
      ? phoneNumber.slice(1)
      : phoneNumber;

    const message = `Kode OTP Ditokoku: ${otp}. Jaga kerahasiaan kode. Tim Ditokoku tidak pernah meminta OTP melalui kanal apa pun. Jika tidak merasa meminta OTP, segera abaikan pesan ini. Segala risiko, kerugian, dan/atau penyalahgunaan yang timbul karena membagikan kode, kelalaian menjaga OTP, atau penggunaan oleh pihak ketiga berada di luar tanggung jawab Ditokoku`;

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

    if (response.status === 200) {
      console.log('OTP sent successfully:', otp);
      Alert.alert('OTP Terkirim', `Kode OTP telah dikirim ke ${phoneNumber}`);
    } else {
      throw new Error('Gagal mengirim OTP');
    }
  } catch (error) {
    console.error('Send OTP Error:', error);
    Alert.alert('Error', 'Gagal mengirim OTP: ' + error.message);
    navigation.goBack();
  } finally {
    setIsProcessing(false);
  }
};


  const verifyOTP = () => {
    if (enteredOTP.length !== 6) {
      Alert.alert('Error', 'Masukkan 6 digit OTP');
      return;
    }

    if (enteredOTP === generatedOTP) {
      setCurrentStep('newPin');
      setEnteredOTP('');
    } else {
      Alert.alert('Error', 'Kode OTP salah');
      setEnteredOTP('');
    }
  };

  const updatePin = async (userId, newPin) => {
    try {
      const response = await axios.put(`${API_URL}/api/pin/update`, {
        user_id: userId,
        new_pin: newPin,
      });

      console.log('PIN Update Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('PIN Update Error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update PIN',
      };
    }
  };

  // FIX: Terima parameter finalConfirmPin langsung
  const handlePinComplete = async (finalConfirmPin) => {
    console.log('🔍 Comparing PINs:');
    console.log('newPin:', newPin);
    console.log('finalConfirmPin:', finalConfirmPin);
    
    // Validate langsung dengan parameter, bukan state
    if (newPin !== finalConfirmPin) {
      Alert.alert('PIN Tidak Cocok', 'PIN yang Anda masukkan tidak sama. Silakan coba lagi.');
      setNewPin('');
      setConfirmNewPin('');
      setCurrentStep('newPin');
      return;
    }

    setIsProcessing(true);

    const result = await updatePin(userId, newPin);

    setIsProcessing(false);

    if (result.success === true) {
      Alert.alert(
        'PIN Berhasil Diubah',
        'PIN Anda telah berhasil diubah',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
        { cancelable: false }
      );
    } else {
      Alert.alert('Error', result.error || 'Gagal mengubah PIN');
      setNewPin('');
      setConfirmNewPin('');
      setCurrentStep('newPin');
    }
  };

  const onOTPNumberPressed = (number) => {
    if (enteredOTP.length < 6) {
      setEnteredOTP(enteredOTP + number);
    }
  };

  const onOTPDeletePressed = () => {
    if (enteredOTP.length > 0) {
      setEnteredOTP(enteredOTP.slice(0, -1));
    }
  };

  const onPinNumberPressed = (number) => {
    if (currentStep === 'newPin') {
      if (newPin.length < maxPinLength) {
        const updatedPin = newPin + number;
        setNewPin(updatedPin);

        if (updatedPin.length === maxPinLength) {
          setTimeout(() => {
            setCurrentStep('confirmPin');
          }, 300);
        }
      }
    } else if (currentStep === 'confirmPin') {
      if (confirmNewPin.length < maxPinLength) {
        const updatedConfirmPin = confirmNewPin + number;
        setConfirmNewPin(updatedConfirmPin);

        // FIX: Pass updatedConfirmPin langsung ke handlePinComplete
        if (updatedConfirmPin.length === maxPinLength) {
          setTimeout(() => {
            handlePinComplete(updatedConfirmPin); // ✅ Pass value langsung!
          }, 300);
        }
      }
    }
  };

  const onPinDeletePressed = () => {
    if (currentStep === 'newPin') {
      if (newPin.length > 0) {
        setNewPin(newPin.slice(0, -1));
      }
    } else if (currentStep === 'confirmPin') {
      if (confirmNewPin.length > 0) {
        setConfirmNewPin(confirmNewPin.slice(0, -1));
      }
    }
  };

  const renderNumberButton = (number, onPress) => {
    return (
      <TouchableOpacity
        key={number}
        style={styles.numberButton}
        onPress={() => onPress(number)}
        disabled={isProcessing}
        activeOpacity={0.7}
      >
        <Text style={[styles.numberButtonText, isProcessing && styles.disabledText]}>
          {number}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderDeleteButton = (onPress) => {
    return (
      <TouchableOpacity
        style={styles.numberButton}
        onPress={onPress}
        disabled={isProcessing}
        activeOpacity={0.7}
      >
        <Icon
          name="backspace-outline"
          size={24}
          color={isProcessing ? '#BDBDBD' : '#FFF'}
        />
      </TouchableOpacity>
    );
  };

  const renderEmptyButton = () => {
    return <View style={styles.numberButton} />;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFF" />
          <Text style={styles.loadingText}>Mengirim OTP...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={isProcessing}
        >
          <Icon name="chevron-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lupa PIN</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {currentStep === 'otp' && (
          <>
            <Text style={styles.title}>Masukkan Kode OTP</Text>
            <Text style={styles.subtitle}>
              Kode OTP telah dikirim ke {userPhone}
            </Text>

            <View style={styles.otpContainer}>
              <TextInput
                style={styles.otpInput}
                value={enteredOTP}
                editable={false}
                placeholder="______"
                placeholderTextColor="#FFFFFF50"
                maxLength={6}
              />
            </View>

            {/* Number Pad */}
            <View style={styles.numberPad}>
              {[0, 1, 2].map((row) => (
                <View key={row} style={styles.numberRow}>
                  {[1, 2, 3].map((col) => {
                    const number = (row * 3 + col).toString();
                    return renderNumberButton(number, onOTPNumberPressed);
                  })}
                </View>
              ))}

              <View style={styles.numberRow}>
                {renderEmptyButton()}
                {renderNumberButton('0', onOTPNumberPressed)}
                {renderDeleteButton(onOTPDeletePressed)}
              </View>
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              style={[
                styles.verifyButton,
                enteredOTP.length !== 6 && styles.verifyButtonDisabled,
              ]}
              onPress={verifyOTP}
              disabled={enteredOTP.length !== 6 || isProcessing}
            >
              <Text style={styles.verifyButtonText}>Verifikasi OTP</Text>
            </TouchableOpacity>

            {/* Resend OTP */}
            <TouchableOpacity
              style={styles.resendButton}
              onPress={() => sendOTP(userPhone)}
              disabled={isProcessing}
            >
              <Text style={styles.resendButtonText}>Kirim Ulang OTP</Text>
            </TouchableOpacity>
          </>
        )}

        {currentStep === 'newPin' && (
          <>
            <Text style={styles.title}>Buat PIN Baru</Text>
            <Text style={styles.subtitle}>Masukkan PIN baru 6 digit</Text>

            {/* PIN Dots */}
            <View style={styles.pinDotsContainer}>
              {Array.from({ length: maxPinLength }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.pinDot,
                    index < newPin.length && styles.pinDotFilled,
                  ]}
                />
              ))}
            </View>

            {/* Number Pad */}
            <View style={styles.numberPad}>
              {[0, 1, 2].map((row) => (
                <View key={row} style={styles.numberRow}>
                  {[1, 2, 3].map((col) => {
                    const number = (row * 3 + col).toString();
                    return renderNumberButton(number, onPinNumberPressed);
                  })}
                </View>
              ))}

              <View style={styles.numberRow}>
                {renderEmptyButton()}
                {renderNumberButton('0', onPinNumberPressed)}
                {renderDeleteButton(onPinDeletePressed)}
              </View>
            </View>
          </>
        )}

        {currentStep === 'confirmPin' && (
          <>
            <Text style={styles.title}>Ulangi PIN Baru</Text>
            <Text style={styles.subtitle}>Masukkan kembali PIN baru Anda</Text>

            {/* PIN Dots */}
            <View style={styles.pinDotsContainer}>
              {Array.from({ length: maxPinLength }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.pinDot,
                    index < confirmNewPin.length && styles.pinDotFilled,
                  ]}
                />
              ))}
            </View>

            {/* Number Pad */}
            <View style={styles.numberPad}>
              {[0, 1, 2].map((row) => (
                <View key={row} style={styles.numberRow}>
                  {[1, 2, 3].map((col) => {
                    const number = (row * 3 + col).toString();
                    return renderNumberButton(number, onPinNumberPressed);
                  })}
                </View>
              ))}

              <View style={styles.numberRow}>
                {renderEmptyButton()}
                {renderNumberButton('0', onPinNumberPressed)}
                {renderDeleteButton(onPinDeletePressed)}
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2F318B',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FFF',
    fontFamily: 'Poppins-Regular',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Poppins-Bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: 'Poppins-Bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#FFFFFF90',
    textAlign: 'center',
    marginBottom: 40,
    fontFamily: 'Poppins-Regular',
  },
  otpContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  otpInput: {
    fontSize: 32,
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: 10,
    fontFamily: 'Poppins-Bold',
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    gap: 12,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF30',
  },
  pinDotFilled: {
    backgroundColor: '#FFF',
  },
  numberPad: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  numberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  numberButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Poppins-SemiBold',
  },
  disabledText: {
    color: '#FFFFFF50',
  },
  verifyButton: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginTop: 30,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  verifyButtonDisabled: {
    backgroundColor: '#FFFFFF50',
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2F318B',
    fontFamily: 'Poppins-Bold',
  },
  resendButton: {
    alignSelf: 'center',
    marginTop: 10,
    paddingVertical: 10,
  },
  resendButtonText: {
    fontSize: 14,
    color: '#FFF',
    textDecorationLine: 'underline',
    fontFamily: 'Poppins-Medium',
  },
});