import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import ReactNativeBiometrics from 'react-native-biometrics';
import { API_URL } from '../context/APIUrl';
import { SafeAreaView } from 'react-native-safe-area-context';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';


const FONNTE_TOKEN = 'AmaaJpg2iQCaF54456H8';
const rnBiometrics = new ReactNativeBiometrics();

export default function EditProfileScreen({ navigation, route }) {
  const { userData: initialUserData } = route.params || {};
  
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidikJariActive, setSidikJariActive] = useState(false);
  const [userId, setUserId] = useState(null);
  const [originalPhone, setOriginalPhone] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentAvatar, setCurrentAvatar] = useState(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('');

  useEffect(() => {
    if (initialUserData) {
      console.log('====================================');
      console.log('inudat', initialUserData);
      console.log('====================================');
      setPhone(initialUserData.phone || '');
      setEmail(initialUserData.email || '');
      setUserId(initialUserData.id);
      setOriginalPhone(initialUserData.phone || '');
      setCurrentAvatar(API_URL + initialUserData.image || null);
    }
    checkBiometricAvailability();
    loadBiometricSetting();
  }, [initialUserData]);

  // ✅ Cek ketersediaan biometrik
  const checkBiometricAvailability = async () => {
    try {
      const { available, biometryType } = await rnBiometrics.isSensorAvailable();
      
      if (available) {
        setBiometricAvailable(true);
        setBiometricType(biometryType);
        console.log('Biometric available:', biometryType);
      } else {
        setBiometricAvailable(false);
        console.log('Biometric not available');
      }
    } catch (error) {
      console.error('Error checking biometric:', error);
      setBiometricAvailable(false);
    }
  };

  // ✅ Load biometric setting dari AsyncStorage
  const loadBiometricSetting = async () => {
    try {
      const biometricEnabled = await AsyncStorage.getItem('biometricEnabled');
      if (biometricEnabled === 'true') {
        setSidikJariActive(true);
      }
    } catch (error) {
      console.error('Error loading biometric setting:', error);
    }
  };

  // ✅ Toggle biometric
  const handleBiometricToggle = async (value) => {
    if (!biometricAvailable) {
      Alert.alert(
        'Tidak Tersedia',
        'Perangkat Anda tidak mendukung autentikasi biometrik'
      );
      return;
    }

    if (value) {
      // Aktifkan biometrik - verifikasi dulu
      try {
        const { success } = await rnBiometrics.simplePrompt({
          promptMessage: 'Verifikasi identitas Anda',
          cancelButtonText: 'Batal',
        });

        if (success) {
          setSidikJariActive(true);
          await AsyncStorage.setItem('biometricEnabled', 'true');
          Alert.alert('Berhasil', 'Autentikasi biometrik berhasil diaktifkan');
        } else {
          Alert.alert('Gagal', 'Verifikasi biometrik gagal');
        }
      } catch (error) {
        console.error('Biometric error:', error);
        Alert.alert('Error', 'Terjadi kesalahan saat verifikasi biometrik');
      }
    } else {
      // Nonaktifkan biometrik
      Alert.alert(
        'Nonaktifkan Biometrik',
        'Apakah Anda yakin ingin menonaktifkan autentikasi biometrik?',
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Nonaktifkan',
            style: 'destructive',
            onPress: async () => {
              setSidikJariActive(false);
              await AsyncStorage.setItem('biometricEnabled', 'false');
              Alert.alert('Berhasil', 'Autentikasi biometrik berhasil dinonaktifkan');
            },
          },
        ]
      );
    }
  };

  // ✅ Pilih foto dari galeri atau kamera
  const selectImage = () => {
    Alert.alert(
      'Pilih Foto',
      'Pilih sumber foto profil',
      [
        {
          text: 'Kamera',
          onPress: () => openCamera(),
        },
        {
          text: 'Galeri',
          onPress: () => openGallery(),
        },
        {
          text: 'Batal',
          style: 'cancel',
        },
      ]
    );
  };

  // ✅ Buka kamera
 
// ✅ Buka kamera - Fixed untuk iOS
const openCamera = async () => {
  try {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
      saveToPhotos: false,
      cameraType: 'back',
      includeBase64: false,
    };

    const result = await launchCamera(options);
    
    console.log('Camera result:', result);
    
    if (result.didCancel) {
      console.log('User cancelled camera');
    } else if (result.errorCode) {
      console.log('Camera Error:', result.errorCode);
      console.log('Error Message:', result.errorMessage);
      
      // Handle specific error codes
      if (result.errorCode === 'camera_unavailable') {
        Alert.alert('Error', 'Kamera tidak tersedia');
      } else if (result.errorCode === 'permission') {
        Alert.alert(
          'Izin Diperlukan',
          'Aplikasi memerlukan akses kamera. Silakan aktifkan di pengaturan.',
          [
            { text: 'Batal', style: 'cancel' },
            { 
              text: 'Buka Pengaturan', 
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', result.errorMessage || 'Gagal membuka kamera');
      }
    } else if (result.assets && result.assets[0]) {
      setSelectedImage(result.assets[0]);
    }
  } catch (error) {
    console.log('Camera Exception:', error);
    Alert.alert('Error', 'Terjadi kesalahan saat membuka kamera');
  }
};

  // ✅ Buka galeri
  const openGallery = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        Alert.alert('Error', 'Gagal membuka galeri');
      } else if (response.assets && response.assets[0]) {
        setSelectedImage(response.assets[0]);
      }
    });
  };

  // ✅ Hapus foto
  const removeAvatar = () => {
    Alert.alert(
      'Hapus Foto',
      'Apakah Anda yakin ingin menghapus foto profil?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => {
            setSelectedImage(null);
            setCurrentAvatar(null);
          },
        },
      ]
    );
  };

  const sendOTP = async (phoneNumber) => {
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const message = `Kode OTP Ditokoku Anda: ${otp}\n\nJangan berikan kode ini kepada siapapun. Kode berlaku selama 5 menit.`;

      const response = await axios.post(
        'https://api.fonnte.com/send',
        {
          target: phoneNumber,
          message: message,
        },
        {
          headers: {
            'Authorization': FONNTE_TOKEN,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('OTP sent:', response.data);

      if (response.data) {
        return otp;
      } else {
        throw new Error('Gagal mengirim OTP');
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      throw error;
    }
  };

  const handleUpdate = async () => {
    try {
      if (!phone.trim()) {
        Alert.alert('Error', 'Nomor telepon wajib diisi');
        return;
      }

      const phoneChanged = phone !== originalPhone;

      if (phoneChanged) {
        setIsLoading(true);
        
        try {
          const otpCode = await sendOTP(phone);
          setIsLoading(false);

          navigation.navigate('OTPVerificationScreen', {
            phone: phone,
            email: email,
            userData: initialUserData,
            generatedOTP: otpCode,
            onVerificationSuccess: async () => {
              await updateProfile();
            }
          });
        } catch (error) {
          setIsLoading(false);
          Alert.alert('Error', 'Gagal mengirim kode OTP. Silakan coba lagi.');
        }
      } else {
        await updateProfile();
      }
    } catch (error) {
      console.error('Error in handleUpdate:', error);
      setIsLoading(false);
    }
  };

  // ✅ Update profile dengan foto
  const updateProfile = async () => {
    try {
      setIsLoading(true);

      // Buat FormData untuk upload image
      const formData = new FormData();
      
      formData.append('phone', phone.trim());
      formData.append('email', email.trim() || '');

      // ✅ Tambahkan image jika ada
      if (selectedImage) {
        const imageFile = {
          uri: Platform.OS === 'android' 
            ? selectedImage.uri 
            : selectedImage.uri.replace('file://', ''),
          type: selectedImage.type || 'image/jpeg',
          name: selectedImage.fileName || `profile_${userId}_${Date.now()}.jpg`,
        };
        formData.append('image', imageFile);
      } else if (currentAvatar === null) {
        // Jika foto dihapus
        formData.append('remove_image', 'true');
      }

      const response = await axios.patch(
        `${API_URL}/api/users/profile/${userId}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.status) {
        // Update local storage dengan data baru
        const updatedUser = { 
          ...initialUserData, 
          phone, 
          email,
          image: response.data.data?.image || currentAvatar 
        };
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));

        Alert.alert('Sukses', 'Profile berhasil diperbarui', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert('Error', response.data.message || 'Gagal update profile');
      }
    } catch (error) {
      console.error('Error update profile:', error);
      Alert.alert('Error', error.response?.data?.message || 'Gagal memperbarui profile');
    } finally {
      setIsLoading(false);
    }
  };

const handleDeleteAccount = () => {
  Alert.alert(
    'Hapus Akun',
    'Apakah Anda yakin ingin mengajukan penghapusan akun? Tim kami akan menghubungi Anda dalam 1x24 jam untuk konfirmasi.',
    [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Ajukan Penghapusan',
        style: 'destructive',
        onPress: () => {
          // Navigate ke screen form request hapus akun
          navigation.navigate('RequestHapusAkunScreen', {
            userData: initialUserData,
            onRequestSuccess: handleLogout
          });
        },
      },
    ]
  );
};

// Fungsi untuk logout setelah request berhasil
const handleLogout = async () => {
  try {
    await AsyncStorage.removeItem('userData');
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('biometricEnabled');
    
    Alert.alert(
      'Berhasil',
      'Pengajuan hapus akun berhasil dikirim. Anda akan keluar dari aplikasi.',
      [
        {
          text: 'OK',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  } catch (error) {
    console.error('Error logout:', error);
  }
};

  // ✅ Tampilkan avatar (prioritas: selectedImage > currentAvatar > placeholder)
  const renderAvatar = () => {
    if (selectedImage) {
      return <Image source={{ uri: selectedImage.uri }} style={styles.avatar} />;
    } else if (currentAvatar) {
      return <Image source={{ uri: currentAvatar }} style={styles.avatar} />;
    } else {
      return (
        <View style={styles.avatarPlaceholder}>
          <Icon name="person" size={50} color="#C5C5C5" />
        </View>
      );
    }
  };

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="chevron-back" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Akun</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Profile Picture */}
          <View style={styles.profileContainer}>
            <View style={styles.avatarWrapper}>
              {renderAvatar()}
              
              {/* ✅ Button untuk ganti foto */}
              <TouchableOpacity 
                style={styles.editAvatarButton}
                onPress={selectImage}
              >
                <Icon name="camera" size={18} color="#FFF" />
              </TouchableOpacity>

              {/* ✅ Button untuk hapus foto - hanya muncul jika ada foto */}
              {(selectedImage || currentAvatar) && (
                <TouchableOpacity 
                  style={styles.removeAvatarButton}
                  onPress={removeAvatar}
                >
                  <Icon name="close" size={20} color="#FFF" />
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.userName}>
              {initialUserData?.f_name || ''} {initialUserData?.l_name || ''}
            </Text>
            {/* <Text style={styles.memberType}>Basic Member</Text> */}
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            {/* No. Telepon */}
            <View style={styles.formItem}>
              <Icon name="call-outline" size={24} color="#666" />
              <View style={styles.formContent}>
                <Text style={styles.formLabel}>No. Telepon</Text>
                <TextInput
                  style={styles.formInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Masukkan nomor telepon"
                  placeholderTextColor="#C5C5C5"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.formItem}>
              <Icon name="mail-outline" size={24} color="#666" />
              <View style={styles.formContent}>
                <Text style={styles.formLabel}>Email</Text>
                <TextInput
                  style={styles.formInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Masukkan email"
                  placeholderTextColor="#C5C5C5"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Hapus Akun */}
            <TouchableOpacity style={styles.formItem} onPress={handleDeleteAccount}>
              <Icon name="person-remove-outline" size={24} color="#666" />
              <View style={styles.formContent}>
                <Text style={styles.formLabel}>Hapus Akun</Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#C5C5C5" />
            </TouchableOpacity>

            {/* Sidik Jari - dengan status ketersediaan */}
            <View style={styles.formItem}>
              <Icon name="finger-print-outline" size={24} color="#666" />
              <View style={styles.formContent}>
                <Text style={styles.formLabel}>
                  {biometricType === 'FaceID' ? 'Face ID' : 'Sidik Jari'}
                </Text>
                <Text style={styles.formSubLabel}>
                  {!biometricAvailable 
                    ? 'Tidak tersedia di perangkat ini' 
                    : sidikJariActive 
                      ? 'Aktif' 
                      : 'Nonaktif'
                  }
                </Text>
              </View>
              <Switch
                value={sidikJariActive}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: '#D9D9D9', true: '#5DCBAD' }}
                thumbColor="#FFF"
                disabled={!biometricAvailable}
              />
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Fixed Bottom Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            onPress={handleUpdate}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveButtonText}>Simpan</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    paddingTop: StatusBar.currentHeight || 0,
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
  profileContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatarWrapper: {
    position: 'relative',
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
  // ✅ Button edit foto (kamera icon)
  editAvatarButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#5DCBAD',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F9F9F9',
  },
  // ✅ Button hapus foto (X icon)
  removeAvatarButton: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    backgroundColor: '#FF6B6B',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F9F9F9',
  },
  userName: {
    fontSize: 20,
    fontFamily: 'Poppins-SemiBold',
    color: '#000',
    marginBottom: 5,
  },
  memberType: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#999',
  },
  formContainer: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 15,
    padding: 15,
  },
  formItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  formContent: {
    flex: 1,
    marginLeft: 15,
  },
  formLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#000',
    marginBottom: 5,
  },
  formSubLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#666',
  },
  formInput: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    padding: 0,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F9F9F9',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  saveButton: {
    backgroundColor: '#5DCBAD',
    paddingVertical: 15,
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