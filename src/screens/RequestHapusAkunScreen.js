// screens/RequestHapusAkunScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import { API_URL } from '../context/APIUrl';

export default function RequestHapusAkunScreen({ navigation, route }) {
  const { userData, onRequestSuccess } = route.params || {};
  
  const [nama, setNama] = useState(`${userData?.f_name || ''} ${userData?.l_name || ''}`.trim());
  const [email, setEmail] = useState(userData?.email || '');
  const [nomorHp, setNomorHp] = useState(userData?.phone || '');
  const [alasan, setAlasan] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      // Validasi
      if (!nama.trim()) {
        Alert.alert('Error', 'Nama wajib diisi');
        return;
      }

      if (!email.trim()) {
        Alert.alert('Error', 'Email wajib diisi');
        return;
      }

      if (!nomorHp.trim()) {
        Alert.alert('Error', 'Nomor HP wajib diisi');
        return;
      }

      if (!alasan.trim()) {
        Alert.alert('Error', 'Alasan penghapusan akun wajib diisi');
        return;
      }

      if (alasan.trim().length < 10) {
        Alert.alert('Error', 'Alasan minimal 10 karakter');
        return;
      }

      setIsLoading(true);

      const requestData = {
        user_id: userData?.id,
        nama: nama.trim(),
        email: email.trim(),
        nomor_hp: nomorHp.trim(),
        alasan: alasan.trim(),
      };

      const response = await axios.post(
        `${API_URL}/api/snk/request-hapus-akun`,
        requestData
      );

      if (response.data.status) {
        Alert.alert(
          'Berhasil',
          response.data.message || 'Pengajuan hapus akun berhasil dikirim. Tim kami akan menghubungi Anda dalam 1x24 jam.',
          [
            {
              text: 'OK',
              onPress: () => {
                if (onRequestSuccess) {
                  onRequestSuccess();
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', response.data.message || 'Gagal mengirim pengajuan');
      }
    } catch (error) {
      console.error('Error submit request:', error);
      
      let errorMessage = 'Gagal mengirim pengajuan hapus akun';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Hapus Akun</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Info Box */}
          <View style={styles.infoBox}>
            <Icon name="information-circle" size={24} color="#FF6B6B" />
            <Text style={styles.infoText}>
              Pengajuan penghapusan akun bersifat permanen. Tim kami akan menghubungi Anda untuk konfirmasi lebih lanjut.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Nama */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nama Lengkap</Text>
              <View style={styles.inputWrapper}>
                <Icon name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={nama}
                  onChangeText={setNama}
                  placeholder="Masukkan nama lengkap"
                  placeholderTextColor="#C5C5C5"
                />
              </View>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Icon name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Masukkan email"
                  placeholderTextColor="#C5C5C5"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Nomor HP */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nomor HP</Text>
              <View style={styles.inputWrapper}>
                <Icon name="call-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={nomorHp}
                  onChangeText={setNomorHp}
                  placeholder="Masukkan nomor HP"
                  placeholderTextColor="#C5C5C5"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Alasan */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Alasan Penghapusan Akun *</Text>
              <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={alasan}
                  onChangeText={setAlasan}
                  placeholder="Jelaskan alasan Anda ingin menghapus akun (minimal 10 karakter)"
                  placeholderTextColor="#C5C5C5"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>
              <Text style={styles.charCount}>{alasan.length} karakter</Text>
            </View>
          </View>

          {/* Warning */}
          <View style={styles.warningBox}>
            <Icon name="warning" size={20} color="#FFA500" />
            <Text style={styles.warningText}>
              Dengan menghapus akun, semua data Anda termasuk riwayat transaksi akan dihapus secara permanen dan tidak dapat dikembalikan.
            </Text>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Fixed Bottom Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Icon name="trash-outline" size={20} color="#FFF" />
                <Text style={styles.submitButtonText}>Ajukan Penghapusan</Text>
              </>
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
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F5',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginLeft: 10,
    lineHeight: 20,
  },
  formContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#000',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    paddingHorizontal: 12,
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#000',
    paddingVertical: 12,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 10,
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#999',
    marginTop: 5,
    textAlign: 'right',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#666',
    marginLeft: 10,
    lineHeight: 20,
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
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#FF6B6B',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#FFAAAA',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFF',
    marginLeft: 8,
  },
});