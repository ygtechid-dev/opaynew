import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../context/APIUrl';
import PinVerificationModal from './PinVerificationModal';

export default function PaymentDetailPage({ route, navigation }) {
  const { product, phoneNumber, provider, providerLogo } = route.params;

  const [isAgen, setIsAgen] = useState(false);
  const [isLoadingAgen, setIsLoadingAgen] = useState(true);
  const [minSaldo, setMinSaldo] = useState(10000);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [showPinModal, setShowPinModal] = useState(false);

  const isAllDataLoaded = !isLoadingConfig && !isLoadingAgen;

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    await Promise.all([
      fetchConfigPrice(),
      checkAgenStatus(),
      fetchUserBalance(),
    ]);
  };

  const fetchConfigPrice = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/config-price`);
      
      if (response.data.success && response.data.data) {
        setMinSaldo(parseFloat(response.data.data.min_saldo));
      }
    } catch (error) {
      console.error('Error fetching config price:', error);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const checkAgenStatus = async () => {
    try {
      setIsLoadingAgen(true);
      const userData = await AsyncStorage.getItem('userData');
      
      if (!userData) {
        setIsAgen(false);
        setIsLoadingAgen(false);
        return;
      }

      const userObj = JSON.parse(userData);
      const response = await axios.get(
        `${API_URL}/api/users/agen/user/${userObj.id}`
      );

      if (response.data.status && response.data.data && response.data.data.length > 0) {
        setIsAgen(true);
      } else {
        setIsAgen(false);
      }
    } catch (error) {
      console.error('Error checking agen status:', error);
      setIsAgen(false);
    } finally {
      setIsLoadingAgen(false);
    }
  };

  const fetchUserBalance = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const userObj = JSON.parse(userData);
        const response = await axios.get(`${API_URL}/api/users`);
        const users = response.data.data;
        const currentUser = users.find((u) => u.id === userObj.id);
        
        if (currentUser) {
          setWalletBalance(parseFloat(currentUser.wallet_balance) || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching user balance:', error);
    }
  };

  const getPrice = () => {
    const typeName = product.type_name?.toLowerCase() || '';
    
    // Jika pascabayar, selalu gunakan price
    if (typeName === 'pascabayar') {
      return product.price?.toString() || '0';
    }
    
    // Jika bukan pascabayar, cek status agen
    if (isAgen) {
      return product.price?.toString() || '0';
    } else {
      return product.priceTierTwo?.toString() || product.price?.toString() || '0';
    }
  };

  const formatPrice = (price) => {
    const priceDouble = parseFloat(price) || 0;
    return `Rp${priceDouble.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
  };

  const isSaldoCukup = () => {
    const productPrice = parseFloat(getPrice()) || 0;
    
    if (isAgen) {
      const sisaSaldo = walletBalance - productPrice;
      return sisaSaldo >= minSaldo;
    }
    
    return walletBalance >= productPrice;
  };

  const showInsufficientBalanceDialog = () => {
    const productPrice = parseFloat(getPrice()) || 0;
    
    let title;
    let message;
    let kekurangan;
    
    if (isAgen) {
      const sisaSetelahTransaksi = walletBalance - productPrice;
      if (sisaSetelahTransaksi < minSaldo) {
        title = 'Saldo Tidak Cukup';
        message = 'Saldo Anda tidak mencukupi untuk melakukan transaksi ini.';
        kekurangan = (productPrice + minSaldo) - walletBalance;
      } else {
        title = 'Saldo Tidak Cukup';
        message = 'Saldo Anda tidak mencukupi untuk melakukan transaksi ini.';
        kekurangan = productPrice - walletBalance;
      }
    } else {
      title = 'Saldo Tidak Cukup';
      message = 'Saldo Anda tidak mencukupi untuk melakukan transaksi ini.';
      kekurangan = productPrice - walletBalance;
    }

    Alert.alert(
      title,
      message,
      [
        {
          text: 'Nanti',
          style: 'cancel',
        },
        {
          text: 'Isi Saldo',
          onPress: () => navigation.navigate('TopUpPage'),
        },
      ],
      { cancelable: true }
    );
  };

const handlePayNow = () => {
  console.log('===== HANDLE PAY NOW CLICKED =====');
  console.log('showPinModal sebelum:', showPinModal);
  
  const saldoCukup = isSaldoCukup();
  console.log('Hasil isSaldoCukup():', saldoCukup);
  
  if (saldoCukup) {
    console.log('✅ Saldo cukup - Setting showPinModal to TRUE');
    
    // PERBAIKAN: Pastikan state berubah dengan reset dulu
    if (showPinModal) {
      // Jika sudah true, reset ke false dulu
      setShowPinModal(false);
      setTimeout(() => {
        setShowPinModal(true);
      }, 100);
    } else {
      setShowPinModal(true);
    }
  } else {
    console.log('❌ Saldo tidak cukup - Showing dialog');
    showInsufficientBalanceDialog();
  }
};

  const renderDetailRow = (label, value, isGreen = false) => {
    return (
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, isGreen && styles.greenText]}>
          {value}
        </Text>
      </View>
    );
  };

  const renderDetailRowWithDivider = (label, value, showDivider = false) => {
    return (
      <View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{label}</Text>
          <Text style={styles.detailValueBold}>{value}</Text>
        </View>
        {showDivider && <View style={styles.divider} />}
      </View>
    );
  };

  const saldoCukup = isSaldoCukup();
  const productPrice = formatPrice(getPrice());

  return (
    <>
     <View style={styles.container}>
      {/* Loading Overlay */}
      {!isAllDataLoaded && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2F318B" />
          <Text style={styles.loadingText}>Memuat data...</Text>
        </View>
      )}

      {/* Main Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Image
              source={require('../assets/goback.png')}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pembayaran</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Payment Detail Card */}
        <View style={styles.paymentCard}>
          <View style={styles.paymentCardHeader}>
            <Text style={styles.paymentCardTitle}>Detail Pembayaran</Text>
          </View>

          <View style={styles.paymentCardBody}>
            {renderDetailRowWithDivider(
              'Nama Produk',
              product.product_name || '-',
              true
            )}

            {renderDetailRowWithDivider(
              'Nomor Pelanggan',
              phoneNumber,
              true
            )}

            {renderDetailRow('Harga', productPrice)}

            {renderDetailRow('Biaya Admin', 'Gratis!', true)}

            {renderDetailRowWithDivider('Keterangan', provider, true)}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Pembayaran</Text>
              <Text style={styles.totalValue}>{productPrice}</Text>
            </View>
          </View>
        </View>

        {/* Balance Card */}
        <TouchableOpacity style={styles.balanceCard} activeOpacity={0.7}>
          <Text style={styles.balanceLabel}>Saldo Anda</Text>
          <Text style={styles.balanceValue}>{formatPrice(walletBalance.toString())}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bottom Section */}
      {isAllDataLoaded && (
        <View style={styles.bottomSection}>
          <Text style={styles.bottomInfoText}>
            Selanjutnya anda akan diarahkan untuk memasukkan PIN/Password untuk
            melanjutkan transaksi.
          </Text>

          <TouchableOpacity
            style={[
              styles.payButton,
              !saldoCukup && styles.payButtonDisabled,
            ]}
            onPress={handlePayNow}
            activeOpacity={0.8}
          >
            <Text style={styles.payButtonText}>
              {saldoCukup ? 'Bayar Sekarang' : 'SALDO TIDAK CUKUP'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* PIN Verification Modal */}
    
    </View>
      <PinVerificationModal
        visible={showPinModal}
        onClose={() => setShowPinModal(false)}
        product={product}
        phoneNumber={phoneNumber}
        provider={provider}
        providerLogo={providerLogo}
        navigation={navigation}
      />
    </>
   
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    marginTop: 20,
    fontFamily: 'Poppins-Medium',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 32,
  },
  backIcon: {
    width: 32,
    height: 32,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222222',
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Poppins-Bold',
  },
  headerSpacer: {
    width: 32,
  },
  paymentCard: {
    borderRadius: 20,
    backgroundColor: '#2F318B',
    marginBottom: 24,
    overflow: 'hidden',
  },
  paymentCardHeader: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  paymentCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
  },
  paymentCardBody: {
    backgroundColor: '#F0F2FF',
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#000000',
    flex: 1,
    fontFamily: 'Poppins-Regular',
  },
  detailValue: {
    fontSize: 12,
    color: '#000000',
    fontWeight: 'bold',
    textAlign: 'right',
    fontFamily: 'Poppins-Bold',
  },
  detailValueBold: {
    fontSize: 12,
    color: '#000000',
    fontWeight: 'bold',
    textAlign: 'right',
    flexShrink: 1,
    fontFamily: 'Poppins-Bold',
  },
  greenText: {
    color: '#72A677',
  },
  divider: {
    height: 1,
    backgroundColor: '#D9D9D9',
    marginBottom: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    fontFamily: 'Poppins-Bold',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'right',
    fontFamily: 'Poppins-Bold',
  },
  balanceCard: {
    backgroundColor: '#EBF3FF',
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    fontFamily: 'Poppins-Bold',
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2F318B',
    fontFamily: 'Poppins-Bold',
  },
  bottomSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  bottomInfoText: {
    fontSize: 10,
    color: '#808080',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 14,
    fontFamily: 'Poppins-Regular',
  },
  payButton: {
    backgroundColor: '#2F318B',
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#14142B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },
  payButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  payButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: 'Poppins-Bold',
  },
});