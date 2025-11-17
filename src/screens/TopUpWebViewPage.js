import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL, API_URL_PROD } from '../context/APIUrl';

export default function TopUpWebViewPage({ route, navigation }) {
  const { checkoutUrl, paymentMethod, amount, reference } = route.params;

  const webViewRef = useRef(null);
  const checkIntervalRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [pageTitle, setPageTitle] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [extractedReference, setExtractedReference] = useState(reference);
  const [autoCheckCount, setAutoCheckCount] = useState(0);
  const [currentUrl, setCurrentUrl] = useState('');

  const MAX_AUTO_CHECK = 40; // 40 x 3 detik = 2 menit
  const CHECK_INTERVAL = 3000; // 3 detik

  // ✅ Extract reference saat component mount
  useEffect(() => {
    console.log('🚀 Component mounted');
    console.log('Checkout URL:', checkoutUrl);
    console.log('Initial reference:', reference);

    if (checkoutUrl && !extractedReference) {
      const ref = extractReferenceFromUrl(checkoutUrl);
      if (ref) {
        console.log('✅ Reference extracted from checkout URL:', ref);
        setExtractedReference(ref);
      }
    }

    return () => {
      stopAutoCheck();
    };
  }, []);

  // ✅ Auto-check payment status setiap 3 detik
  useEffect(() => {
    if (extractedReference && autoCheckCount < MAX_AUTO_CHECK) {
      console.log(`🔄 Starting auto-check (${autoCheckCount}/${MAX_AUTO_CHECK})`);
      startAutoCheck();
    } else if (autoCheckCount >= MAX_AUTO_CHECK) {
      console.log('⏹️ Max auto-check reached');
      stopAutoCheck();
    }

    return () => {
      stopAutoCheck();
    };
  }, [extractedReference, autoCheckCount]);

  const startAutoCheck = () => {
    stopAutoCheck(); // Clear existing interval

    checkIntervalRef.current = setInterval(() => {
      console.log(`⏰ Auto-check #${autoCheckCount + 1}`);
      checkPaymentStatus(true);
    }, CHECK_INTERVAL);
  };

  const stopAutoCheck = () => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
      console.log('🛑 Auto-check stopped');
    }
  };

  const extractReferenceFromUrl = (url) => {
    try {
      console.log('🔍 Extracting reference from URL:', url);

      // Method 1: Regex untuk path /checkout/TXXX (PRIORITAS TERTINGGI)
      const pathMatch = url.match(/\/checkout\/(T[A-Z0-9]+)/i);
      if (pathMatch) {
        console.log('✅ Found reference from path regex:', pathMatch[1]);
        return pathMatch[1];
      }

      // Method 2: Parse URL
      const uri = new URL(url);

      // Query parameters
      if (uri.searchParams.has('tripay_reference')) {
        const ref = uri.searchParams.get('tripay_reference');
        console.log('✅ Found tripay_reference:', ref);
        return ref;
      }

      if (uri.searchParams.has('reference')) {
        const ref = uri.searchParams.get('reference');
        console.log('✅ Found reference:', ref);
        return ref;
      }

      // Path segments
      const pathSegments = uri.pathname.split('/').filter(Boolean);
      console.log('📍 Path segments:', pathSegments);

      if (pathSegments.length > 0) {
        const lastSegment = pathSegments[pathSegments.length - 1];
        console.log('🔎 Last segment:', lastSegment);

        if (lastSegment.startsWith('T') && lastSegment.length > 10) {
          console.log('✅ Found reference from path:', lastSegment);
          return lastSegment;
        }
      }

      console.log('❌ No reference found in URL');
    } catch (error) {
      console.error('❌ Error extracting reference:', error);
    }
    return null;
  };

  const isSuccessUrl = (url) => {
    return (
      url.includes('success') ||
      url.includes('completed') ||
      url.includes('/tripay/success') ||
      url.includes('status=success')
    );
  };

  const isFailureUrl = (url) => {
    return (
      url.includes('failed') ||
      url.includes('cancelled') ||
      url.includes('/tripay/failed') ||
      url.includes('status=failed')
    );
  };

  const checkPaymentStatus = async (isAutoCheck = false) => {
    if (isProcessingPayment && !isAutoCheck) {
      console.log('⏳ Already processing payment, skipping...');
      return;
    }

    const refToUse = extractedReference;

    if (!refToUse) {
      console.error('❌ ERROR: Reference not found');
      if (!isAutoCheck) {
        Alert.alert('Error', 'Reference transaksi tidak ditemukan');
      }
      return;
    }

    console.log('======== CHECKING PAYMENT STATUS ========');
    console.log('Reference:', refToUse);
    console.log('Is Auto Check:', isAutoCheck);
    console.log('Check Count:', autoCheckCount);

    try {
      const response = await axios.get(
        `${API_URL_PROD}/api/tripay/status/${refToUse}`
      );

      console.log('✅ Status Response:', response.data);

      if (response.status === 200) {
        const status = response.data?.data?.status || '';
        console.log('📊 Payment Status:', status);

        if (status === 'PAID') {
          console.log('✅ Payment PAID - Processing top-up');
          stopAutoCheck();
          setIsProcessingPayment(true);
          await handlePaymentSuccess();
        } else if (status === 'UNPAID') {
          console.log('⏳ Payment still UNPAID');
          if (isAutoCheck) {
            setAutoCheckCount((prev) => prev + 1);
          }
        } else if (status === 'FAILED' || status === 'EXPIRED') {
          console.log('❌ Payment FAILED/EXPIRED');
          stopAutoCheck();
          handlePaymentFailed();
        } else {
          console.log('⚠️ Unknown status:', status);
          if (isAutoCheck) {
            setAutoCheckCount((prev) => prev + 1);
          }
        }
      } else {
        throw new Error(`Failed to check status: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ ERROR: Status check failed:', error);
      if (!isAutoCheck) {
        Alert.alert('Error', 'Gagal mengecek status pembayaran');
      }
      if (isAutoCheck) {
        setAutoCheckCount((prev) => prev + 1);
      }
    }
  };

  const handlePaymentSuccess = async () => {
    console.log('======== PROCESSING PAID PAYMENT ========');
    console.log('Payment Method:', paymentMethod);
    console.log('Amount:', amount);

    try {
      // Step 1: Add funds to wallet
      console.log('--- Step 1: Adding funds to wallet ---');
      await addFundsToWallet();

      // Step 2: Refresh user profile
      console.log('--- Step 2: Refreshing profile ---');
      await refreshUserProfile();

      setIsProcessingPayment(false);

      console.log('======== PAYMENT PROCESSING COMPLETED ========');

      // ✅ Alert sukses dengan redirect ke Home
      Alert.alert(
        'Sukses! 🎉',
        'Pembayaran berhasil! Saldo telah ditambahkan ke akun Anda.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error('ERROR: Payment processing failed:', error);
      setIsProcessingPayment(false);

      // Fallback: refresh profile dulu
      console.log('--- Doing fallback profile refresh ---');
      await refreshUserProfile();

      Alert.alert(
        'Info',
        'Pembayaran berhasil! Saldo sedang diproses',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
            },
          },
        ]
      );
    }
  };

  const addFundsToWallet = async () => {
    try {
      console.log('=== Adding Funds to Wallet ===');

      const userData = await AsyncStorage.getItem('userData');
      if (!userData) throw new Error('User data not found');

      const userObj = JSON.parse(userData);

      const response = await axios.post(`${API_URL}/api/wallet-transactions/add`, {
        customer_id: userObj.id,
        amount: amount,
        referance: extractedReference || `TOPUP_${Date.now()}`,
        payment_method: paymentMethod,
      });

      console.log('Add Funds Response:', response.data);

      if (response.data.success) {
        console.log('SUCCESS: Funds added to wallet');
        return;
      } else {
        throw new Error(response.data.message || 'Failed to add funds');
      }
    } catch (error) {
      console.error('ERROR: addFundsToWallet failed:', error);
      throw error;
    }
  };

  const refreshUserProfile = async () => {
    try {
      console.log('Refreshing user profile...');
      const userData = await AsyncStorage.getItem('userData');
      if (!userData) return;

      const userObj = JSON.parse(userData);

      const response = await axios.get(`${API_URL}/api/users`);
      const users = response.data.data;
      const currentUser = users.find((u) => u.id === userObj.id);

      if (currentUser) {
        console.log('Updated wallet balance:', currentUser.wallet_balance);
        await AsyncStorage.setItem('userData', JSON.stringify(currentUser));
      }

      console.log('Profile refresh completed');
    } catch (error) {
      console.error('ERROR: Failed to refresh profile:', error);
    }
  };

  const handlePaymentFailed = () => {
    Alert.alert(
      'Pembayaran Gagal',
      'Pembayaran gagal atau dibatalkan. Silakan coba lagi.',
      [
        {
          text: 'OK',
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            });
          },
        },
      ]
    );
  };

  const handleNavigationStateChange = (navState) => {
    const { url, title, loading } = navState;

    console.log('======== NAVIGATION STATE CHANGE ========');
    console.log('URL:', url);
    console.log('Title:', title);
    console.log('Loading:', loading);
    console.log('Current extractedReference:', extractedReference);
    console.log('=========================================');

    setPageTitle(title || '');
    setCurrentUrl(url);

    // Extract reference dari setiap URL change
    if (url) {
      const ref = extractReferenceFromUrl(url);
      if (ref && ref !== extractedReference) {
        console.log('🎯 Setting new reference:', ref);
        setExtractedReference(ref);
      }
    }

    // Check for success/failure URLs (only when page finished loading)
    if (!loading) {
      if (isFailureUrl(url)) {
        console.log('❌ Failure URL detected');
        stopAutoCheck();
        handlePaymentFailed();
      }
    }
  };

  const handleWebViewError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    Alert.alert('Error', 'Gagal memuat halaman pembayaran');
  };

  const showExitDialog = () => {
    Alert.alert(
      'Batalkan Pembayaran?',
      'Apakah Anda yakin ingin membatalkan proses pembayaran?',
      [
        { text: 'Tidak', style: 'cancel' },
        {
          text: 'Ya, Batalkan',
          style: 'destructive',
          onPress: () => {
            stopAutoCheck();
            navigation.goBack();
          },
        },
      ]
    );
  };

  const formatCurrency = (value) => {
    const number = parseInt(value) || 0;
    return `Rp ${number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={showExitDialog} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {pageTitle || 'Pembayaran'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {paymentMethod} • {formatCurrency(amount.toString())}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            console.log('🔄 Manual refresh triggered');
            console.log('Current reference:', extractedReference);
            checkPaymentStatus(false);
          }}
          style={styles.refreshButton}
        >
          <Icon name="refresh" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Icon name="information-circle" size={20} color="#1976D2" />
        <View style={styles.infoBannerTextContainer}>
          <Text style={styles.infoBannerText}>
            Setelah pembayaran selesai, saldo akan otomatis ditambahkan
          </Text>
          {extractedReference && autoCheckCount < MAX_AUTO_CHECK && (
            <Text style={styles.autoCheckText}>
              Auto-check aktif: {autoCheckCount}/{MAX_AUTO_CHECK}
            </Text>
          )}
        </View>
      </View>

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: checkoutUrl }}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={handleWebViewError}
        style={styles.webView}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2F318B" />
            <Text style={styles.loadingText}>Memuat halaman pembayaran...</Text>
          </View>
        )}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2F318B" />
          <Text style={styles.loadingText}>Memuat halaman pembayaran...</Text>
        </View>
      )}

      {/* Processing Overlay */}
      {isProcessingPayment && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingCard}>
            <ActivityIndicator size="large" color="#2F318B" />
            <Text style={styles.processingTitle}>Memproses Pembayaran</Text>
            <Text style={styles.processingText}>
              Mohon tunggu, kami sedang memproses pembayaran dan menambahkan
              saldo ke akun Anda...
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'Poppins-Bold',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
    fontFamily: 'Poppins-Regular',
  },
  refreshButton: {
    padding: 4,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#90CAF9',
  },
  infoBannerTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  infoBannerText: {
    fontSize: 12,
    color: '#0D47A1',
    fontFamily: 'Poppins-Regular',
  },
  autoCheckText: {
    fontSize: 11,
    color: '#1976D2',
    marginTop: 4,
    fontFamily: 'Poppins-Medium',
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  loadingText: {
    fontSize: 14,
    color: '#757575',
    marginTop: 16,
    fontFamily: 'Poppins-Regular',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  processingCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: '80%',
  },
  processingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    fontFamily: 'Poppins-Bold',
  },
  processingText: {
    fontSize: 13,
    color: '#757575',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Poppins-Regular',
  },
});