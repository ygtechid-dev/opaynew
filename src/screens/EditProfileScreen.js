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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../context/APIUrl';

const FONNTE_TOKEN = 'AmaaJpg2iQCaF54456H8';


export default function EditProfileScreen({ navigation, route }) {
  const { userData: initialUserData } = route.params || {};
  
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidikJariActive, setSidikJariActive] = useState(false);
  const [userId, setUserId] = useState(null);
  const [originalPhone, setOriginalPhone] = useState('');

  useEffect(() => {
    if (initialUserData) {
      setPhone(initialUserData.phone || '');
      setEmail(initialUserData.email || '');
      setUserId(initialUserData.id);
      setOriginalPhone(initialUserData.phone || '');
    }
  }, [initialUserData]);

  const sendOTP = async (phoneNumber) => {
    try {
      // Generate 6 digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Format phone number untuk Fonnte (harus dengan format 62xxx)
     

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

      console.log('ddd', response.data);
      

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

      // Cek apakah nomor HP berubah
      const phoneChanged = phone !== originalPhone;

      if (phoneChanged) {
        // Jika nomor HP berubah, kirim OTP dulu
        setIsLoading(true);
        
        try {
          const otpCode = await sendOTP(phone);
          setIsLoading(false);



          // Navigate ke OTP screen dengan callback
          navigation.navigate('OTPVerificationScreen', {
            phone: phone,
            email: email,
            userData: initialUserData,
            generatedOTP: otpCode,
            onVerificationSuccess: async () => {
              // Setelah OTP berhasil, baru update profile
              await updateProfile();
            }
          });
        } catch (error) {
          setIsLoading(false);
          Alert.alert('Error', 'Gagal mengirim kode OTP. Silakan coba lagi.');
        }
      } else {
        // Jika nomor HP tidak berubah, langsung update
        await updateProfile();
      }
    } catch (error) {
      console.error('Error in handleUpdate:', error);
      setIsLoading(false);
    }
  };

  const updateProfile = async () => {
    try {
      setIsLoading(true);

      const response = await axios.patch(
        `${API_URL}/api/users/profile/${userId}`,
        {
          phone: phone.trim(),
          email: email.trim() || null,
        }
      );

      if (response.data.status) {
        // Update local storage
        const updatedUser = { ...initialUserData, phone, email };
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
      'Apakah Anda yakin ingin menghapus akun? Tindakan ini tidak dapat dibatalkan.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Info', 'Fitur hapus akun dalam pengembangan');
          },
        },
      ]
    );
  };

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={styles.container}>
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
              {initialUserData?.avatar ? (
                <Image source={{ uri: initialUserData.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Icon name="person" size={50} color="#C5C5C5" />
                </View>
              )}
              
              <TouchableOpacity style={styles.removeAvatarButton}>
                <Icon name="close" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.userName}>
              {initialUserData?.f_name || ''} {initialUserData?.l_name || ''}
            </Text>
            <Text style={styles.memberType}>Basic Member</Text>
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

            {/* Sidik Jari */}
            <View style={styles.formItem}>
              <Icon name="finger-print-outline" size={24} color="#666" />
              <View style={styles.formContent}>
                <Text style={styles.formLabel}>Sidik Jari</Text>
                <Text style={styles.formSubLabel}>Aktif</Text>
              </View>
              <Switch
                value={sidikJariActive}
                onValueChange={setSidikJariActive}
                trackColor={{ false: '#D9D9D9', true: '#5DCBAD' }}
                thumbColor="#FFF"
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
      </View>
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
  removeAvatarButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#FF6B6B',
    width: 32,
    height: 32,
    borderRadius: 16,
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