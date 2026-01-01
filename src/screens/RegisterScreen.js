import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import { API_URL } from '../context/APIUrl';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OneSignal } from 'react-native-onesignal';

export default function RegisterScreen({ navigation, route }) {
  const { phone } = route.params || {};
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);

const sendWelcomeEmail = async (userEmail, userName) => {
  try {
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .header {
            background-color: #5DCBAD;
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 24px;
          }
          .content {
            padding: 40px 30px;
            color: #333333;
            line-height: 1.8;
          }
          .content h2 {
            color: #5DCBAD;
            font-size: 20px;
            margin-bottom: 20px;
          }
          .content p {
            margin-bottom: 15px;
            font-size: 15px;
          }
          .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #888888;
            font-size: 13px;
          }
          .signature {
            margin-top: 30px;
            font-weight: bold;
            color: #5DCBAD;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Pendaftaran Berhasil – Ditokoku</h1>
          </div>
          
          <div class="content">
            <h2>Halo, ${userName}</h2>
            
            <p>
              Akun kamu di <b>Ditokoku</b> berhasil dibuat dan sudah siap digunakan.
            </p>

            <p>
              Di fitur <b>PPOB</b>, status kamu saat ini adalah <b>Agen Basic</b>, jadi kamu sudah
              bisa mulai jualan pulsa, paket data, token PLN, dan pembayaran lainnya.
            </p>

            <p>
              Kalau ingin dapat keuntungan lebih, silakan daftar <b>Agen Platinum</b> langsung dari menu PPOB di aplikasi.
            </p>

            <p>Terima kasih sudah bergabung bersama Ditokoku.</p>

            <p class="signature">Salam,<br>Tim Ditokoku</p>
          </div>
          
          <div class="footer">
            <p>© 2024 Ditokoku. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
Pendaftaran Berhasil – Ditokoku

Halo ${userName},

Akun kamu di Ditokoku berhasil dibuat dan sudah siap digunakan.

Di fitur PPOB, status kamu saat ini adalah Agen Basic, jadi kamu sudah bisa mulai jualan pulsa, paket data, token PLN, dan pembayaran lainnya.

Kalau ingin dapat keuntungan lebih, silakan daftar Agen Platinum langsung dari menu PPOB di aplikasi.

Terima kasih sudah bergabung bersama Ditokoku.

Salam,
Tim Ditokoku
    `;

    await axios.post(`${API_URL}/api/emailnotif/send-email`, {
      to: userEmail,
      subject: "Pendaftaran Berhasil – Ditokoku",
      text: emailText,
      html: emailHtml,
    });

    console.log("✅ Welcome email sent successfully");
  } catch (error) {
    console.error("❌ Failed to send welcome email:", error);
  }
};


  const handleRegister = async () => {
    // Validasi
    if (!fullName.trim()) {
      Alert.alert('Error', 'Nama lengkap wajib diisi');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Error', 'Email wajib diisi');
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Format email tidak valid');
      return;
    }

    if (!phone) {
      Alert.alert('Error', 'Nomor telepon tidak ditemukan');
      return;
    }

    setLoading(true);

    try {
      // Pisahkan nama depan dan nama belakang
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || null;

      // Generate random password (karena login pakai OTP)
      const randomPassword = Math.random().toString(36).slice(-8) + 
                            Math.random().toString(36).slice(-8);

      const registerData = {
        f_name: firstName,
        l_name: lastName,
        email: email.trim().toLowerCase(),
        phone: phone,
        password: randomPassword
      };

      const response = await axios.post(
        `${API_URL}/api/users/auth/register`,
        registerData
      );

      if (response.data.status) {
        // Registrasi berhasil
        const { data: userData, token } = response.data;

        // Simpan token dan user data ke AsyncStorage
        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('userData', JSON.stringify(userData));

        // Kirim welcome email
        sendWelcomeEmail(email.trim().toLowerCase(), fullName.trim());
         OneSignal.login(String(userData.id));

        Alert.alert(
          'Berhasil',
          'Registrasi berhasil! Silakan lanjutkan.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.replace('LocationAccessScreen', {
                  userData: userData,
                  token: token
                });
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Register error:', error);
      
      if (error.response) {
        // Error dari API
        const errorMessage = error.response.data.message || 'Terjadi kesalahan saat registrasi';
        
        if (error.response.status === 400 && errorMessage.includes('sudah terdaftar')) {
          Alert.alert(
            'Nomor Sudah Terdaftar',
            'Nomor telepon ini sudah terdaftar. Silakan login.',
            [
              {
                text: 'Login',
                onPress: () => navigation.navigate('Login')
              },
              {
                text: 'Batal',
                style: 'cancel'
              }
            ]
          );
        } else {
          Alert.alert('Error', errorMessage);
        }
      } else {
        Alert.alert('Error', 'Tidak dapat terhubung ke server');
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
          disabled={loading}
        >
          <Icon name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Daftar</Text>

        {/* Phone Display (Read-only) */}
        {phone && (
          <View style={[styles.inputContainer, styles.readOnlyContainer]}>
            <Icon name="call-outline" size={20} color="#999" style={styles.inputIcon} />
            <Text style={styles.readOnlyText}>{phone}</Text>
          </View>
        )}

        {/* Full Name Input */}
        <View style={styles.inputContainer}>
          <Icon name="person-outline" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            placeholder="Nama Lengkap"
            value={fullName}
            onChangeText={setFullName}
            style={styles.input}
            placeholderTextColor="#999"
            editable={!loading}
          />
        </View>

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <Icon name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#999"
            editable={!loading}
          />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.btn, loading && styles.btnDisabled]} 
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnText}>Simpan</Text>
            )}
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backBtn: {
    padding: 5
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 10,
    paddingHorizontal: 28
  },
  title: {
    fontSize: 28,
    color: '#000',
    fontFamily: 'PlusJakartaSans-Bold',
    marginBottom: 30,
    lineHeight: 42
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#5DCBAD',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 20,
    backgroundColor: '#fff'
  },
  readOnlyContainer: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0'
  },
  inputIcon: {
    marginRight: 12
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    fontFamily: 'Poppins-Regular',
    paddingVertical: 0
  },
  readOnlyText: {
    flex: 1,
    fontSize: 15,
    color: '#666',
    fontFamily: 'Poppins-Medium',
  },
  footer: {
    paddingBottom: 30
  },
  btn: { 
    backgroundColor: '#5DCBAD', 
    padding: 11, 
    height: 52,
    borderRadius: 16,
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
  }
});