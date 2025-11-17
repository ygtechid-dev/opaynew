import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../context/APIUrl';

export default function DaftarAgenPage({ navigation }) {
  const [namaKonter, setNamaKonter] = useState('');
  const [alamat, setAlamat] = useState('');
  const [kodeReferal, setKodeReferal] = useState('');
  
  const [snkData, setSnkData] = useState([]);
  const [isLoadingSnk, setIsLoadingSnk] = useState(false);
  const [minTopup, setMinTopup] = useState('50000');
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  
  const [isCheckingReferal, setIsCheckingReferal] = useState(false);
  const [namaMarketing, setNamaMarketing] = useState(null);

  useEffect(() => {
    fetchConfigPrice();
  }, []);

  const fetchConfigPrice = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/config-price`);

      if (response.data.success === true && response.data.data) {
        const minTopupValue = parseFloat(response.data.data.min_topup).toFixed(0);
        setMinTopup(minTopupValue);
        setIsLoadingConfig(false);
      } else {
        throw new Error('Failed to load config price');
      }
    } catch (error) {
      console.error('Error fetching config price:', error);
      setIsLoadingConfig(false);
      Alert.alert('Error', 'Gagal memuat konfigurasi harga');
    }
  };

  const fetchSnkData = async () => {
    setIsLoadingSnk(true);
    try {
      const response = await axios.get(`${API_URL}/api/snk-agen`);

      if (response.data.status === true) {
        setSnkData(response.data.data);
        setIsLoadingSnk(false);
      } else {
        throw new Error('Failed to load SNK data');
      }
    } catch (error) {
      console.error('Error fetching SNK:', error);
      setIsLoadingSnk(false);
      Alert.alert('Error', 'Gagal memuat data SNK');
    }
  };

  const checkKodeReferal = async (kode) => {
    if (!kode) {
      setNamaMarketing(null);
      return;
    }

    setIsCheckingReferal(true);
    try {
      const response = await axios.get(
        `${API_URL}/api/users/marketing/check/${kode}`
      );

      if (response.data.status === true && response.data.data) {
        setNamaMarketing(response.data.data.nama_marketing);
      } else {
        setNamaMarketing('not_found');
      }
    } catch (error) {
      console.error('Error checking referal:', error);
      setNamaMarketing('not_found');
    } finally {
      setIsCheckingReferal(false);
    }
  };

  const handleKodeReferalChange = (value) => {
    setKodeReferal(value);
    if (value.length >= 3) {
      checkKodeReferal(value);
    } else {
      setNamaMarketing(null);
    }
  };

  const showFullScreenTermsModal = async () => {
    await fetchSnkData();
    
    navigation.navigate('TermsConditionsPage', {
      snkData: snkData,
      isLoadingSnk: isLoadingSnk,
      minTopup: minTopup,
      onAgree: proceedToTopUp,
    });
  };

  const proceedToTopUp = () => {
    navigation.navigate('TopUpAmountPage', {
      paymentMethod: '',
      paymentCode: '',
      logoPath: '',
      isFromAgentRegistration: true,
      minTopupAmount: parseInt(minTopup),
      agentData: {
        nama_konter: namaKonter,
        alamat: alamat,
        kode_referal: kodeReferal,
        nama_marketing: namaMarketing,
      },
    });
  };

  const handleSubmit = () => {
    if (!namaKonter.trim()) {
      Alert.alert('Error', 'Nama konter harus diisi');
      return;
    }

    if (!alamat.trim()) {
      Alert.alert('Error', 'Alamat harus diisi');
      return;
    }

    showFullScreenTermsModal();
  };

  const formatCurrency = (amount) => {
    const number = parseInt(amount) || 0;
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Daftar Agen Platinum</Text>

        {/* Nama Konter Input */}
        <View style={styles.inputContainer}>
          <Icon
            name="storefront-outline"
            size={28}
            color="#9E9E9E"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Nama Konter"
            placeholderTextColor="#BDBDBD"
            value={namaKonter}
            onChangeText={setNamaKonter}
          />
        </View>

        {/* Alamat Input */}
        <View style={styles.inputContainer}>
          <Icon
            name="location-outline"
            size={28}
            color="#9E9E9E"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Alamat"
            placeholderTextColor="#BDBDBD"
            value={alamat}
            onChangeText={setAlamat}
          />
        </View>

        {/* Kode Marketing Input */}
        <View style={styles.inputContainer}>
          <Icon
            name="gift-outline"
            size={28}
            color="#9E9E9E"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Kode Marketing (opsional)"
            placeholderTextColor="#BDBDBD"
            value={kodeReferal}
            onChangeText={handleKodeReferalChange}
          />
        </View>

        {/* Marketing Status */}
        {isCheckingReferal && (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="small" color="#2F318B" />
            <Text style={styles.statusText}>Memeriksa kode marketing...</Text>
          </View>
        )}

        {!isCheckingReferal && namaMarketing && (
          <View style={styles.statusContainer}>
            <Text
              style={[
                styles.statusText,
                namaMarketing === 'not_found'
                  ? styles.statusTextError
                  : styles.statusTextSuccess,
              ]}
            >
              {namaMarketing === 'not_found'
                ? '❌ Kode marketing tidak ditemukan'
                : `✅ Ditemukan Marketing: ${namaMarketing}`}
            </Text>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            isLoadingConfig && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isLoadingConfig}
        >
          {isLoadingConfig ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>Lanjutkan Pendaftaran</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 20,
    marginBottom: 40,
    fontFamily: 'Poppins-Bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    fontFamily: 'Poppins-Regular',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -12,
    marginBottom: 20,
    paddingLeft: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    fontFamily: 'Poppins-Medium',
  },
  statusTextError: {
    color: '#F44336',
  },
  statusTextSuccess: {
    color: '#4CAF50',
  },
  submitButton: {
    backgroundColor: '#2F318B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 40,
    elevation: 0,
  },
  submitButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Poppins-SemiBold',
  },
});