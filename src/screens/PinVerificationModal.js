/* eslint-disable react/no-unstable-nested-components */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL, API_URL_PROD } from '../context/APIUrl';

const { height } = Dimensions.get('window');

export default function PinVerificationModal({
  visible,
  onClose,
  product,
    isAgens,
  phoneNumber,
  provider,
  providerLogo,

  navigation,
}) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const maxPinLength = 6;
   const [walletDeducted, setWalletDeducted] = useState(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // PIN states
  const [hasExistingPin, setHasExistingPin] = useState(false);
  const [isCreatePinMode, setIsCreatePinMode] = useState(false);
  const [isConfirmPinMode, setIsConfirmPinMode] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userPhone, setUserPhone] = useState(null);

  useEffect(() => {
    console.log('===== MODAL VISIBILITY CHANGED =====');
    console.log('visible:', visible);
    
    if (visible) {
      console.log('Modal is visible, initializing...');
      setIsLoading(true);
      initializePage();
    } else {
      console.log('Modal is hidden, resetting states...');
      setPin('');
      setConfirmPin('');
      setIsConfirmPinMode(false);
      setIsProcessing(false);
    }
  }, [visible]);

  const initializePage = async () => {
    console.log('initializePage started');
    try {
      const userData = await AsyncStorage.getItem('userData');

      if (userData) {
        const userObj = JSON.parse(userData);
        setUserId(userObj.id.toString());
        setUserPhone(userObj.phone || userObj.f_name);
        
        console.log('User ID:', userObj.id);
        console.log('User Phone:', userObj.phone);

        const pinStatus = await detectPin(userObj.id.toString());
        
        console.log('PIN Status:', pinStatus);

        setHasExistingPin(pinStatus.has_pin === true);
        setIsCreatePinMode(pinStatus.has_pin !== true);
        
        console.log('Has existing PIN:', pinStatus.has_pin);
        console.log('Is Create PIN Mode:', pinStatus.has_pin !== true);
      } else {
        console.log('No user data found');
        showErrorDialog('Error', 'User tidak teridentifikasi. Silakan login ulang.');
      }
    } catch (error) {
      console.error('Initialize error:', error);
      showErrorDialog('Error', 'Gagal memuat data user.');
    } finally {
      console.log('Setting isLoading to false');
      setIsLoading(false);
    }
  };

  const detectPin = async (userId) => {
    try {
      const response = await axios.post(`${API_URL}/api/pin/detect`, {
        user_id: userId,
      });

      console.log('PIN Detection Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('PIN Detection Error:', error);
      return { success: false, has_pin: false };
    }
  };

  const createPin = async (userId, pin) => {
    try {
      const response = await axios.post(`${API_URL}/api/pin/create`, {
        user_id: userId,
        pin: pin,
      });

      console.log('PIN Creation Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('PIN Creation Error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create PIN',
      };
    }
  };

  const verifyPin = async (userId, pin) => {
    try {
      const response = await axios.post(`${API_URL}/api/pin/verify`, {
        user_id: userId,
        pin: pin,
      });

      console.log('PIN Verification Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('PIN Verification Error:', error);
      const errorData = error.response?.data || {};
      return {
        success: false,
        error: errorData.error || 'PIN verification failed',
        failed_attempts: errorData.failed_attempts,
        locked_until: errorData.locked_until,
        attempts_remaining: errorData.attempts_remaining,
      };
    }
  };

 const sendOTP = async (phoneNumber) => {
  try {
const FONNTE_TOKEN = 'AmaaJpg2iQCaF54456H8';

    // Generate OTP 6 digit
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Format nomor: hapus 0 di depan, tambahkan country code 62
    let formattedPhone = phoneNumber;
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.slice(1);
    } else if (!formattedPhone.startsWith('62')) {
      formattedPhone = '62' + formattedPhone;
    }

    const message = `Kode OTP Ditokoku: ${otp}. Jaga kerahasiaan kode. Tim Ditokoku tidak pernah meminta OTP melalui kanal apa pun. Jika tidak merasa meminta OTP, segera abaikan pesan ini. Segala risiko, kerugian, dan/atau penyalahgunaan yang timbul karena membagikan kode, kelalaian menjaga OTP, atau penggunaan oleh pihak ketiga berada di luar tanggung jawab Ditokoku`;

    const response = await axios.post(
      'https://api.fonnte.com/send',
      {
        target: formattedPhone,
        message: message,
      },
      {
        headers: {
          'Authorization': FONNTE_TOKEN,
        }
      }
    );

    console.log('Fonnte Response:', response.data);

    if (response.data && response.data.status !== false) {
      console.log('✅ OTP sent successfully via Fonnte:', otp);
      return otp; // Return OTP untuk digunakan di verifikasi
    } else {
      throw new Error(response.data?.reason || 'Gagal mengirim OTP via Fonnte');
    }
  } catch (error) {
    console.error('Send OTP Error:', error);
    if (error.response) {
      console.error('Fonnte Error Response:', error.response.data);
      throw new Error(error.response.data?.reason || 'Gagal mengirim OTP');
    }
    throw new Error('Gagal mengirim OTP: ' + error.message);
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

  const showForgotPinFlow = async () => {
    if (!userPhone || userPhone.length === 0) {
      showErrorDialog('Error', 'Nomor telepon tidak ditemukan');
      return;
    }

    setIsProcessing(true);

    try {
      const generatedOtp = await sendOTP(userPhone);
      
      setIsProcessing(false);

      showOTPDialog(generatedOtp);
    } catch (error) {
      setIsProcessing(false);
      showErrorDialog('Error', 'Gagal mengirim OTP: ' + error.message);
    }
  };

  const showOTPDialog = (correctOtp) => {
    let enteredOtp = '';

    Alert.prompt(
      'Masukkan Kode OTP',
      `Kode OTP telah dikirim ke ${userPhone}`,
      [
        {
          text: 'Batal',
          style: 'cancel',
        },
        {
          text: 'Verifikasi',
          onPress: (text) => {
            enteredOtp = text || '';
            
            if (enteredOtp.length !== 6) {
              showErrorDialog('Error', 'Masukkan 6 digit OTP');
              return;
            }

            if (enteredOtp === correctOtp) {
              showSetNewPinDialog();
            } else {
              showErrorDialog('Error', 'Kode OTP salah');
            }
          },
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  const showSetNewPinDialog = () => {
    let newPin = '';
    let confirmNewPin = '';
    let isConfirmMode = false;

    const NewPinModal = () => {
      const [localNewPin, setLocalNewPin] = useState('');
      const [localConfirmPin, setLocalConfirmPin] = useState('');
      const [localIsConfirmMode, setLocalIsConfirmMode] = useState(false);
      const [isUpdating, setIsUpdating] = useState(false);

      const onNumberPress = (number) => {
        if (isUpdating) return;

        if (localIsConfirmMode) {
          if (localConfirmPin.length < 6) {
            const newConfirm = localConfirmPin + number;
            setLocalConfirmPin(newConfirm);

            if (newConfirm.length === 6) {
              setTimeout(async () => {
                if (localNewPin === newConfirm) {
                  setIsUpdating(true);
                  const result = await updatePin(userId, localNewPin);
                  
                  Alert.dismiss();
                  
                  if (result.success === true) {
                    showSuccessDialog(
                      'PIN Berhasil Diubah',
                      'PIN Anda telah berhasil diubah',
                      () => {}
                    );
                  } else {
                    showErrorDialog('Error', result.error || 'Gagal mengubah PIN');
                  }
                } else {
                  showErrorDialog('PIN Tidak Cocok', 'PIN yang Anda masukkan tidak sama');
                  setLocalNewPin('');
                  setLocalConfirmPin('');
                  setLocalIsConfirmMode(false);
                }
              }, 300);
            }
          }
        } else {
          if (localNewPin.length < 6) {
            const newPinValue = localNewPin + number;
            setLocalNewPin(newPinValue);

            if (newPinValue.length === 6) {
              setTimeout(() => {
                setLocalIsConfirmMode(true);
              }, 300);
            }
          }
        }
      };

      const onDeletePress = () => {
        if (isUpdating) return;

        if (localIsConfirmMode) {
          if (localConfirmPin.length > 0) {
            setLocalConfirmPin(localConfirmPin.slice(0, -1));
          }
        } else {
          if (localNewPin.length > 0) {
            setLocalNewPin(localNewPin.slice(0, -1));
          }
        }
      };

      const currentPin = localIsConfirmMode ? localConfirmPin : localNewPin;

      return (
        <Modal visible={true} transparent={true} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: '#2F318B' }]}>
              <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: '#FFF' }]}>
                  {localIsConfirmMode ? 'Ulangi PIN Baru' : 'Buat PIN Baru'}
                </Text>
                <TouchableOpacity
                  onPress={() => Alert.dismiss()}
                  style={styles.closeButton}
                >
                  <Icon name="close" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>

              <Text style={[styles.forgotPinText, { color: '#FFF', textAlign: 'center', marginTop: 10 }]}>
                {localIsConfirmMode 
                  ? 'Masukkan kembali PIN baru Anda'
                  : 'Masukkan PIN baru 6 digit'}
              </Text>

              <View style={styles.pinDotsContainer}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.pinDot,
                      { backgroundColor: index < currentPin.length ? '#FFF' : 'rgba(255,255,255,0.3)' },
                    ]}
                  />
                ))}
              </View>

              <View style={styles.numberPad}>
                {[0, 1, 2].map((row) => (
                  <View key={row} style={styles.numberRow}>
                    {[1, 2, 3].map((col) => {
                      const number = (row * 3 + col).toString();
                      return (
                        <TouchableOpacity
                          key={number}
                          style={[styles.numberButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                          onPress={() => onNumberPress(number)}
                          disabled={isUpdating}
                        >
                          <Text style={[styles.numberButtonText, { color: '#FFF' }]}>
                            {number}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}

                <View style={styles.numberRow}>
                  <View style={styles.numberButton} />
                  <TouchableOpacity
                    style={[styles.numberButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                    onPress={() => onNumberPress('0')}
                    disabled={isUpdating}
                  >
                    <Text style={[styles.numberButtonText, { color: '#FFF' }]}>0</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.numberButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                    onPress={onDeletePress}
                    disabled={isUpdating}
                  >
                    <Icon name="backspace-outline" size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      );
    };

    // Show the modal
    Alert.alert('', '', [], { cancelable: false });
    setTimeout(() => {
      Alert.dismiss();
      // You'll need to create a separate state management for this modal
      // For simplicity, using Alert here but ideally use a separate Modal component
    }, 100);
  };

  const onNumberPressed = (number) => {
    if (isProcessing) return;

    if (isCreatePinMode && !isConfirmPinMode) {
      if (pin.length < maxPinLength) {
        const newPin = pin + number;
        setPin(newPin);

        if (newPin.length === maxPinLength) {
          setTimeout(() => {
            setIsConfirmPinMode(true);
          }, 300);
        }
      }
    } else if (isCreatePinMode && isConfirmPinMode) {
      if (confirmPin.length < maxPinLength) {
        const newConfirmPin = confirmPin + number;
        setConfirmPin(newConfirmPin);

        if (newConfirmPin.length === maxPinLength) {
          setTimeout(() => {
            checkPinMatch(pin, newConfirmPin);
          }, 300);
        }
      }
    } else {
      if (pin.length < maxPinLength) {
        setPin(pin + number);
      }
    }
  };

  const onDeletePressed = () => {
    if (isProcessing) return;

    if (isCreatePinMode && isConfirmPinMode) {
      if (confirmPin.length > 0) {
        setConfirmPin(confirmPin.slice(0, -1));
      }
    } else {
      if (pin.length > 0) {
        setPin(pin.slice(0, -1));
      }
    }
  };

  const checkPinMatch = (originalPin, newConfirmPin) => {
    if (originalPin === newConfirmPin) {
      handleCreatePin(originalPin);
    } else {
      showErrorDialog(
        'PIN Tidak Cocok',
        'PIN yang Anda masukkan tidak sama. Silakan coba lagi.'
      );
      setPin('');
      setConfirmPin('');
      setIsConfirmPinMode(false);
    }
  };

  const handleCreatePin = async (pinToCreate) => {
    if (!userId) return;

    setIsProcessing(true);

    const result = await createPin(userId, pinToCreate);

    if (result.success === true) {
      showSuccessDialog(
        'PIN Berhasil Dibuat',
        'PIN Anda telah berhasil dibuat. Transaksi akan dilanjutkan.',
        () => {
          setHasExistingPin(true);
          setIsCreatePinMode(false);
          setIsConfirmPinMode(false);
          setIsProcessing(false);
          processPayment();
        }
      );
    } else {
      setIsProcessing(false);
      setPin('');
      setConfirmPin('');
      setIsConfirmPinMode(false);
      showErrorDialog('Gagal Membuat PIN', result.error || 'Tidak dapat membuat PIN');
    }
  };

  const generateRefId = () => {
    const randomNum = Math.floor(Math.random() * 999999)
      .toString()
      .padStart(6, '0');
    return `O-PAYMENT-${randomNum}`;
  };

  const isPascabayarTransaction = () => {
    return (
      product.ref_id !== null &&
      product.ref_id !== undefined &&
      product.ref_id.toString().length > 0
    );
  };


    const deductWalletOnPending = async () => {
 
      const pricing = isAgens ? product.price : product.priceTierTwo
       const randomNum = Math.floor(10000 + Math.random() * 90000); 
  const newRef = `DEDUCTOPAY-${randomNum}`;
        const deductSuccess = await deductWalletBalance(pricing, newRef);

        if (deductSuccess) {
          console.log('✅ Wallet deducted successfully');
        }
      }


const deductWalletBalance = async (amount, refId) => {
  console.log("====================================");
  console.log("🔥 DEDUCT DEBUG TRIGGERED");
  console.log("Amount:", amount);
  console.log("RefID:", refId);
  console.log("WalletDeducted Set:", Array.from(walletDeducted));
  console.log("====================================");

  try {
    const userData = await AsyncStorage.getItem('userData');
    const userObj = JSON.parse(userData || '{}');

    console.log("User Loaded:", userObj.id);

    // DEBUG: cek apakah sudah pernah di-deduct
    if (walletDeducted.has(refId)) {
      console.log("❌ SKIPPED — walletDeducted sudah ada REFID:", refId);
      return true;
    }

    const alreadyDeducted = await AsyncStorage.getItem(`deduct_${refId}`);
    console.log("AsyncStorage deduct flag:", alreadyDeducted);

    if (alreadyDeducted === "true") {
      console.log("❌ SKIPPED — AsyncStorage flag found");
      return true;
    }

    console.log("⏳ POST KE SERVER DEDUCT SALDO…");

    const response = await axios.post(`${API_URL}/api/deduct-saldo/deduct`, {
      user_id: userObj.id,
      amount: amount,
      transaction_type: 'ppob_payment',
      reference: refId,
    });

    console.log("SERVER RESPONSE:", response.data);

    if (response.data) {
      console.log("✅ SUCCESS — DEDUCT DONE:", refId);

      // simpan flag biar 100% tidak ter-deduct 2x
      await AsyncStorage.setItem(`deduct_${refId}`, "true");
      setWalletDeducted(prev => new Set([...prev, refId]));

      return true;
    } else {
      console.log("❌ SERVER RETURNED ERROR, NO DEDUCT");
      return false;
    }

  } catch (error) {
    console.log("❌ ERROR deductWalletBalance:", error);
    return false;
  }
};


  const processPayment = async () => {
  if ((hasExistingPin && pin.length !== maxPinLength) || isProcessing || !userId) {
    return;
  }

  setIsProcessing(true);

  try {
    if (hasExistingPin) {
      const verifyResult = await verifyPin(userId, pin);

      if (verifyResult.success !== true) {
        setIsProcessing(false);
        setPin('');

        let errorMessage = verifyResult.error || 'PIN tidak valid';
        if (verifyResult.attempts_remaining != null) {
          errorMessage += `\nSisa percobaan: ${verifyResult.attempts_remaining}`;
        }

        showErrorDialog('PIN Salah', errorMessage);
        return;
      }
    }

    // ✅ CEK APAKAH PRODUK DARI NEWPRICELIST ATAU PRICELIST LAMA
    const isNewPricelist = product.product_code !== undefined;
    const isPascabayar = isPascabayarTransaction();

    let apiEndpoint;
    let requestBody;
    let refId;

    console.log('Product Type Check:', {
      isNewPricelist,
      isPascabayar,
      product_code: product.product_code,
      buyer_sku_code: product.buyer_sku_code
    });

    if (isNewPricelist && !isPascabayar) {
      // ✅ PRABAYAR BARU - PAKAI NEWTRANSACTION API
      refId = generateRefId();
      apiEndpoint = `${API_URL}/api/newtransaction/order`;
      requestBody = {
        product_code: product.product_code, // ✅ Pakai product_code
        dest_number: phoneNumber,
        user_id: userId,
        qty: 1,
        ref_id: refId,
      };

      console.log('🔥 NEW PRABAYAR Transaction Request:', requestBody);

    } else if (isPascabayar) {
      // ✅ PASCABAYAR - PAKAI PAY-TRANSACTION API (TIDAK DIUBAH)
      refId = product.ref_id.toString();
      apiEndpoint = `${API_URL_PROD}/api/pay-transaction`;
      requestBody = {
        customer_no: phoneNumber,
        buyer_sku_code: product.buyer_sku_code,
        ref_id: refId,
        user_id: userId,
        testing: true,
      };

      console.log('💳 PASCABAYAR Transaction Request:', requestBody);

    } else {
      // ✅ PRABAYAR LAMA - PAKAI ORDER-TRANSACTION API (TIDAK DIUBAH)
      refId = generateRefId();
      apiEndpoint = `${API_URL_PROD}/api/order-transaction`;
      requestBody = {
        customer_no: phoneNumber,
        buyer_sku_code: product.buyer_sku_code,
        ref_id: refId,
        user_id: userId,
        testing: false,
      };

      console.log('📱 OLD PRABAYAR Transaction Request:', requestBody);
    }

    console.log('API Endpoint:', apiEndpoint);
    console.log('Request Body:', requestBody);

    const response = await axios.post(apiEndpoint, requestBody);

    console.log('Payment Response:', response.data);

    if (response.data.success === true) {
      deductWalletOnPending();
      onClose();
      navigation.replace('TransactionReceipt', {
        product: product,
        phoneNumber: phoneNumber,
        provider: provider,
        transactionData: response.data,
        providerLogo: providerLogo,
        isAgenss: isAgens
      });
    } else {
      showErrorDialog(
        'Transaksi Gagal',
        response.data.message || 'Transaksi tidak dapat diproses'
      );
    }
  } catch (error) {
    console.error('Payment Error:', error.response?.data || error.message);
    showErrorDialog('Kesalahan', `Terjadi kesalahan: ${error.response?.data?.message || error.message}`);
  } finally {
    setIsProcessing(false);
  }
};



  const showErrorDialog = (title, message) => {
    Alert.alert(title, message, [{ text: 'OK' }]);
  };

  const showSuccessDialog = (title, message, onOk) => {
    Alert.alert(title, message, [{ text: 'OK', onPress: onOk }], {
      cancelable: false,
    });
  };

  const onProcessPayment = () => {
    if (getButtonEnabled()) {
      if (isCreatePinMode && isConfirmPinMode) {
        checkPinMatch(pin, confirmPin);
      } else if (hasExistingPin && pin.length === maxPinLength) {
        processPayment();
      }
    }
  };

  const getPinInputTitle = () => {
    if (isCreatePinMode && !isConfirmPinMode) {
      return 'Buat PIN 6 Digit';
    } else if (isCreatePinMode && isConfirmPinMode) {
      return 'Ulangi PIN Anda';
    } else {
      return 'Masukkan PIN';
    }
  };

  const getButtonText = () => {
    if (isCreatePinMode && !isConfirmPinMode) {
      return 'LANJUTKAN';
    } else if (isCreatePinMode && isConfirmPinMode) {
      return 'BUAT PIN';
    } else {
      return 'Proses Pembayaran';
    }
  };

  const getButtonEnabled = () => {
    if (isProcessing) return false;

    if (isCreatePinMode && !isConfirmPinMode) {
      return pin.length === maxPinLength;
    } else if (isCreatePinMode && isConfirmPinMode) {
      return confirmPin.length === maxPinLength;
    } else {
      return pin.length === maxPinLength;
    }
  };

  const renderNumberButton = (number) => {
    return (
      <TouchableOpacity
        key={number}
        style={styles.numberButton}
        onPress={() => onNumberPressed(number)}
        disabled={isProcessing}
        activeOpacity={0.7}
      >
        <Text
          style={[styles.numberButtonText, isProcessing && styles.disabledText]}
        >
          {number}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderDeleteButton = () => {
    return (
      <TouchableOpacity
        style={styles.numberButton}
        onPress={onDeletePressed}
        disabled={isProcessing}
        activeOpacity={0.7}
      >
        <Icon
          name="backspace-outline"
          size={24}
          color={isProcessing ? '#BDBDBD' : '#000'}
        />
      </TouchableOpacity>
    );
  };

  const renderEmptyButton = () => {
    return <View style={styles.numberButton} />;
  };

  console.log('===== RENDERING MODAL =====');
  console.log('visible:', visible);
  console.log('isLoading:', isLoading);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2F318B" />
              <Text style={styles.loadingText}>Memuat...</Text>
            </View>
          ) : (
            <>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>{getPinInputTitle()}</Text>
                <TouchableOpacity
                  onPress={onClose}
                  disabled={isProcessing}
                  style={styles.closeButton}
                >
                  <Icon
                    name="close"
                    size={24}
                    color={isProcessing ? '#BDBDBD' : '#000'}
                  />
                </TouchableOpacity>
              </View>

              {/* PIN Dots */}
              <View style={styles.pinDotsContainer}>
                {Array.from({ length: maxPinLength }).map((_, index) => {
                  const currentPin = isCreatePinMode && isConfirmPinMode ? confirmPin : pin;
                  return (
                    <View
                      key={index}
                      style={[
                        styles.pinDot,
                        index < currentPin.length && styles.pinDotFilled,
                      ]}
                    />
                  );
                })}
              </View>

              {/* Forgot PIN - only show if not in create mode */}
              {!isCreatePinMode && (
             <TouchableOpacity
    onPress={() => {
      onClose(); // Close current modal
      navigation.push('ForgotPinPage'); // Navigate to Forgot PIN page
    }}
    disabled={isProcessing}
    style={styles.forgotPinButton}
  >
    <Text style={styles.forgotPinText}>Lupa PIN?</Text>
  </TouchableOpacity>
              )}

              {/* Number Pad */}
              <View style={styles.numberPad}>
                {[0, 1, 2].map((row) => (
                  <View key={row} style={styles.numberRow}>
                    {[1, 2, 3].map((col) => {
                      const number = (row * 3 + col).toString();
                      return renderNumberButton(number);
                    })}
                  </View>
                ))}

                <View style={styles.numberRow}>
                  {renderEmptyButton()}
                  {renderNumberButton('0')}
                  {renderDeleteButton()}
                </View>
              </View>

              {/* Process Button */}
              <TouchableOpacity
                style={[
                  styles.processButton,
                  !getButtonEnabled() && styles.processButtonDisabled,
                ]}
                onPress={onProcessPayment}
                disabled={!getButtonEnabled()}
                activeOpacity={0.8}
              >
                {isProcessing ? (
                  <View style={styles.processingRow}>
                    <ActivityIndicator size="small" color="#FFF" />
                    <Text style={styles.processButtonText}>MEMPROSES...</Text>
                  </View>
                ) : (
                  <Text style={styles.processButtonText}>{getButtonText()}</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: height * 0.7,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'Poppins-Bold',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    padding: 4,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 20,
    gap: 12,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E0E0E0',
  },
  pinDotFilled: {
    backgroundColor: '#000',
  },
  forgotPinButton: {
    alignSelf: 'center',
    marginTop: 15,
    paddingVertical: 6,
  },
  forgotPinText: {
    fontSize: 13,
    color: '#2F318B',
    fontFamily: 'Poppins-Medium',
  },
  numberPad: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    marginTop: 10,
    marginBottom: 10,
  },
  numberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  numberButton: {
    width: 65,
    height: 65,
    borderRadius: 12,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  numberButtonText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Poppins-SemiBold',
  },
  disabledText: {
    color: '#BDBDBD',
  },
  processButton: {
    backgroundColor: '#2F318B',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  processButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  processButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Poppins-Bold',
  },
});