import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL, API_URL_PROD } from '../context/APIUrl';

export default function TopUpAmountPage({ route, navigation }) {
  const {
    paymentMethod = '',
    paymentCode = '',
    logoPath = '',
    isFromAgentRegistration = false,
    minTopupAmount,
    agentData,
  } = route.params || {};

  const [amount, setAmount] = useState(
    isFromAgentRegistration && minTopupAmount
      ? minTopupAmount.toString()
      : ''
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(paymentMethod);
  const [selectedPaymentCode, setSelectedPaymentCode] = useState(paymentCode);
  const [selectedLogoPath, setSelectedLogoPath] = useState(logoPath);
  const [isLoading, setIsLoading] = useState(false);

  const predefinedAmounts = [10000, 20000, 50000, 100000, 200000, 500000];

  const paymentMethods = [
    // E-Wallet (QRIS di paling atas)
    {
      category: 'E-Wallet',
      methods: [
        {
          name: 'QRIS',
          code: 'QRIS',
          logo: require('../assets/qris_logo.png'),
        },
      ],
    },
    // Virtual Account
    {
      category: 'Virtual Account',
      methods: [
        {
          name: 'BCA Virtual Account',
          code: 'BCAVA',
          logo: require('../assets/bca_logo.png'),
        },
        {
          name: 'BRI Virtual Account',
          code: 'BRIVA',
          logo: require('../assets/bri_logo.png'),
        },
        {
          name: 'BNI Virtual Account',
          code: 'BNIVA',
          logo: require('../assets/bni_logo.png'),
        },
        {
          name: 'Mandiri Virtual Account',
          code: 'MANDIRIVA',
          logo: require('../assets/mandiri_logo.png'),
        },
        {
          name: 'Permata Virtual Account',
          code: 'PERMATAVA',
          logo: require('../assets/permata_logo.jpg'),
        },
        {
          name: 'BSI Virtual Account',
          code: 'BSIVA',
          logo: require('../assets/bsi_logo.png'),
        },
        {
          name: 'CIMB Virtual Account',
          code: 'CIMBVA',
          logo: require('../assets/cimb_logo.png'),
        },
        {
          name: 'Muamalat Virtual Account',
          code: 'MUAMALATVA',
          logo: require('../assets/muamalat_logo.jpg'),
        },
        {
          name: 'Danamon Virtual Account',
          code: 'DANAMONVA',
          logo: require('../assets/danamon_logo.png'),
        },
        {
          name: 'OCBC NISP Virtual Account',
          code: 'OCBCVA',
          logo: require('../assets/ocbc_logo.png'),
        },
        {
          name: 'Bank Lain',
          code: 'BANKLAIN',
          logo: require('../assets/banklain_logo.png'),
        },
      ],
    },
    // Convenience Store
    {
      category: 'Convenience Store',
      methods: [
        {
          name: 'Alfamart',
          code: 'ALFAMART',
          logo: require('../assets/alfamart_logo.png'),
        },
        {
          name: 'Indomaret',
          code: 'INDOMARET',
          logo: require('../assets/indomaret_logo.png'),
        },
        {
          name: 'Alfamidi',
          code: 'ALFAMIDI',
          logo: require('../assets/alfamidi_logo.png'),
        },
      ],
    },
  ];

  const formatCurrency = (value) => {
    const number = parseInt(value) || 0;
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleAmountChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setAmount(cleaned);
  };

  const selectPredefinedAmount = (value) => {
    setAmount(value.toString());
  };

  const selectPaymentMethod = (method) => {
    setSelectedPaymentMethod(method.name);
    setSelectedPaymentCode(method.code);
    setSelectedLogoPath(method.logo);
  };

  const isValidAmount = () => {
    const numAmount = parseInt(amount);

    if (isFromAgentRegistration && minTopupAmount) {
      return numAmount === minTopupAmount;
    }

    return numAmount >= 1000;
  };

  const getUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const userObj = JSON.parse(userData);
        return {
          name: `${userObj.f_name || ''} ${userObj.l_name || ''}`.trim() || 'User',
          email: userObj.email || 'user@example.com',
          phone: userObj.phone || '08123456789',
        };
      }
      return {
        name: 'User',
        email: 'user@example.com',
        phone: '08123456789',
      };
    } catch (error) {
      console.error('Error getting user data:', error);
      return {
        name: 'User',
        email: 'user@example.com',
        phone: '08123456789',
      };
    }
  };

const processTopUp = async () => {
  if (!isValidAmount() || !selectedPaymentCode) {
    alert('Pilih metode pembayaran dan masukkan nominal yang valid');
    return;
  }

  setIsLoading(true);

  try {
    const userData = await getUserData();
    const numAmount = parseInt(amount);

    const response = await axios.post(`${API_URL_PROD}/api/tripay/create`, {
      method: selectedPaymentCode,
      amount: numAmount,
      name: userData.name,     // 🔥 sesuai BE
      email: userData.email,   // 🔥 sesuai BE
      phone: userData.phone,   // 🔥 sesuai BE
      user_id: userData.id,    // 🔥 biar tersimpan di DB
    });

    if (response.data.success === true && response.data.data?.checkout_url) {

      const checkoutUrl = response.data.data.checkout_url;
      const reference = response.data.data.reference;

      if (isFromAgentRegistration && agentData) {
        navigation.navigate('AgentTopUpWebViewPage', {
          checkoutUrl,
          paymentMethod: selectedPaymentMethod,
          amount: numAmount,
          agentData,
          reference,
        });
      } else {
        navigation.navigate('TopUpWebViewPage', {
          checkoutUrl,
          paymentMethod: selectedPaymentMethod,
          amount: numAmount,
          reference,
        });
      }

    } else {
      alert(response.data.message || 'Gagal membuat transaksi');
    }

  } catch (error) {
    console.error('Error processing top up:', error?.response);
    alert(`Error: ${error.message}`);
  } finally {
    setIsLoading(false);
  }
};


  const renderSelectedPaymentMethod = () => {
    if (!selectedPaymentMethod) return null;

    return (
      <View style={styles.selectedPaymentCard}>
        <View style={styles.logoContainer}>
          <Image
            source={selectedLogoPath}
            style={styles.paymentLogo}
            resizeMode="contain"
          />
        </View>
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentName}>{selectedPaymentMethod}</Text>
          <Text style={styles.paymentSubtext}>Metode pembayaran dipilih</Text>
        </View>
      </View>
    );
  };

  const renderPaymentMethodsList = () => {
    return (
      <View style={styles.paymentMethodsCard}>
        <Text style={styles.cardTitle}>Pilih Metode Pembayaran</Text>

        {paymentMethods.map((category, catIndex) => (
          <View key={catIndex}>
            <Text style={styles.categoryTitle}>{category.category}</Text>
            {category.methods.map((method, methodIndex) => (
              <TouchableOpacity
                key={methodIndex}
                style={[
                  styles.paymentMethodItem,
                  selectedPaymentCode === method.code &&
                    styles.paymentMethodItemSelected,
                ]}
                onPress={() => selectPaymentMethod(method)}
              >
                <View style={styles.methodLogoContainer}>
                  <Image
                    source={method.logo}
                    style={styles.methodLogo}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.methodName}>{method.name}</Text>
                {selectedPaymentCode === method.code && (
                  <Icon name="checkmark-circle" size={24} color="#1976D2" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image
            source={require('../assets/goback.png')}
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isFromAgentRegistration
            ? 'Isi Saldo & Daftar Agen Platinum'
            : 'Masukkan Nominal'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner for Agent Registration */}
        {isFromAgentRegistration && minTopupAmount && (
          <View style={styles.infoBanner}>
            <Icon
              name="information-circle-outline"
              size={24}
              color="#1976D2"
            />
            <Text style={styles.infoBannerText}>
              Anda akan Mengisi saldo Rp. {formatCurrency(minTopupAmount.toString())}{' '}
              untuk pendaftaran agen platinum
            </Text>
          </View>
        )}

        {/* Payment Method */}
        {isFromAgentRegistration
          ? renderPaymentMethodsList()
          : renderSelectedPaymentMethod()}

        {/* Amount Input Card */}
        <View style={styles.amountCard}>
          <Text style={styles.cardTitle}>Nominal Top Up</Text>

          <TextInput
            style={[
              styles.amountInput,
              isFromAgentRegistration && styles.amountInputDisabled,
            ]}
            placeholder="Masukkan nominal"
            placeholderTextColor="#BDBDBD"
            value={amount}
            onChangeText={handleAmountChange}
            keyboardType="numeric"
            editable={!isFromAgentRegistration}
          />

          <Text style={styles.amountHint}>
            {isFromAgentRegistration && minTopupAmount
              ? `Nominal tetap Rp ${formatCurrency(minTopupAmount.toString())} untuk pendaftaran agen platinum`
              : 'Minimal top up Rp 10.000'}
          </Text>
        </View>

        {/* Predefined Amounts - Only for regular top-up */}
        {!isFromAgentRegistration && (
          <View style={styles.quickAmountCard}>
            <Text style={styles.cardTitle}>Nominal Cepat</Text>

            <View style={styles.quickAmountGrid}>
              {predefinedAmounts.map((value, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.quickAmountButton}
                  onPress={() => selectPredefinedAmount(value)}
                >
                  <Text style={styles.quickAmountText}>
                    Rp {formatCurrency(value.toString())}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!isValidAmount() || !selectedPaymentCode || isLoading) &&
              styles.submitButtonDisabled,
          ]}
          onPress={processTopUp}
          disabled={!isValidAmount() || !selectedPaymentCode || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isFromAgentRegistration
                ? 'Isi Saldo & Daftar Agen Platinum'
                : 'Lanjutkan Pembayaran'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    backgroundColor: '#FFF',
  },
  backIcon: {
    width: 31,
    height: 31,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Poppins-Bold',
  },
  headerSpacer: {
    width: 31,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#90CAF9',
    padding: 16,
    marginBottom: 20,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#0D47A1',
    marginLeft: 12,
    fontFamily: 'Poppins-Regular',
  },
  selectedPaymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  logoContainer: {
    width: 50,
    height: 50,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentLogo: {
    width: 40,
    height: 40,
  },
  paymentInfo: {
    flex: 1,
    marginLeft: 16,
  },
  paymentName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'Poppins-Bold',
  },
  paymentSubtext: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
    fontFamily: 'Poppins-Regular',
  },
  paymentMethodsCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
    fontFamily: 'Poppins-Bold',
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 12,
    marginBottom: 8,
    fontFamily: 'Poppins-Bold',
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
    backgroundColor: '#FFF',
  },
  paymentMethodItemSelected: {
    borderColor: '#1976D2',
    borderWidth: 2,
    backgroundColor: '#E3F2FD',
  },
  methodLogoContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodLogo: {
    width: 32,
    height: 32,
  },
  methodName: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 12,
    fontFamily: 'Poppins-Bold',
  },
  amountCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  amountInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontFamily: 'Poppins-Bold',
  },
  amountInputDisabled: {
    backgroundColor: '#F5F5F5',
    color: '#757575',
  },
  amountHint: {
    fontSize: 12,
    color: '#757575',
    marginTop: 16,
    fontFamily: 'Poppins-Regular',
  },
  quickAmountCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  quickAmountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAmountButton: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    fontFamily: 'Poppins-Medium',
  },
  bottomSection: {
    padding: 20,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  submitButton: {
    backgroundColor: '#1976D2',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Poppins-Bold',
  },
});