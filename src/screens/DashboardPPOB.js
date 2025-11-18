import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL, URL_IMAGE } from '../context/APIUrl';

const { width } = Dimensions.get('window');

export default function DashboardPPOB({ navigation }) {
  const [isRegistered, setIsRegistered] = useState(false);
  const [agentData, setAgentData] = useState(null);
  const [balanceVisible, setBalanceVisible] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [dataBannerPPOB, setDataBannerPPOB] = useState([]);


  const transactionIntervalRef = useRef(null);


  const getBanner = async () => {
    try {
      const userJson = await AsyncStorage.getItem('userData');
      if (userJson) {
        const userObj = JSON.parse(userJson);
        console.log('📱 Current User ID:', userObj.id);

        const response = await axios.get(`${API_URL}/api/newbanner`);
        const bannerss = response.data.data;
   
const filterDataHeader = bannerss.filter((e) =>
  e.letak_banner.includes("ppob")
);



        console.log('datheadss123', filterDataHeader);
        setDataBannerPPOB(filterDataHeader)
      }
    } catch (error) {
      console.error('❌ Error getting user:', error);
    }
  };

  
  useEffect(() => {
    loadData();
    getBanner()

    // Start auto-refresh transactions every 3 seconds
    startTransactionAutoRefresh();

    return () => {
      // Cleanup interval on unmount
      stopTransactionAutoRefresh();
    };
  }, []);

  const startTransactionAutoRefresh = () => {
    stopTransactionAutoRefresh(); // Clear any existing interval

    transactionIntervalRef.current = setInterval(() => {
      console.log('🔄 Auto-refreshing transactions...');
      getTransactions(true); // true = silent refresh (no loading indicator)
    }, 3000);
  };

  const stopTransactionAutoRefresh = () => {
    if (transactionIntervalRef.current) {
      clearInterval(transactionIntervalRef.current);
      transactionIntervalRef.current = null;
      console.log('🛑 Transaction auto-refresh stopped');
    }
  };

  const loadData = async () => {
    await Promise.all([getUser(), checkAgentStatus(), getTransactions()]);
    setIsLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getUser = async () => {
    try {
      const userJson = await AsyncStorage.getItem('userData');
      if (userJson) {
        const userObj = JSON.parse(userJson);
        console.log('📱 Current User ID:', userObj.id);

        const response = await axios.get(`${API_URL}/api/users`);
        const users = response.data.data;
        const currentUser = users.find((e) => e.id === userObj.id);

        if (currentUser) {
          console.log('✅ User data loaded:', currentUser);
          setUserData(currentUser);
          await AsyncStorage.setItem('userData', JSON.stringify(currentUser));
        }
      }
    } catch (error) {
      console.error('❌ Error getting user:', error);
    }
  };

  const checkAgentStatus = async () => {
    try {
      const userJson = await AsyncStorage.getItem('userData');
      if (!userJson) {
        console.log('⚠️ No user data in AsyncStorage');
        setIsRegistered(false);
        return;
      }

      const userObj = JSON.parse(userJson);
      console.log('🔍 Checking agent status for user ID:', userObj.id);

      const response = await axios.get(`${API_URL}/api/users/agen`);
      console.log('📊 Agent API Response:', response.data);

      if (response.data.data) {
        const agents = response.data.data;
        const agentInfo = agents.find((agent) => agent.user_id === userObj.id);

        if (agentInfo) {
          console.log('✅ User is registered as agent:', agentInfo);
          setIsRegistered(true);
          setAgentData(agentInfo);
        } else {
          console.log('❌ User is NOT registered as agent');
          setIsRegistered(false);
          setAgentData(null);
        }
      } else {
        console.log('⚠️ Invalid agent API response');
        setIsRegistered(false);
        setAgentData(null);
      }
    } catch (error) {
      console.error('❌ Error checking agent status:', error);
      setIsRegistered(false);
      setAgentData(null);
    }
  };

  const getTransactions = async (silent = false) => {
    try {
      if (!silent) {
        setIsLoadingTransactions(true);
      }

      const userJson = await AsyncStorage.getItem('userData');
      if (!userJson) {
        setTransactions([]);
        return;
      }

      const userObj = JSON.parse(userJson);

      console.log('ssssid', userObj.id);
      
      const response = await axios.get(`${API_URL}/api/order-transaction`);
      console.log('📋 Transactions API Response:', response.data.data);

    if (response.data && Array.isArray(response.data.data)) {

  const list = response.data.data;

  const userTransactions = list.filter(
    (transaction) => transaction.user?.id == userObj.id
  );

  const sortedTransactions = userTransactions.sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  const lastFiveTransactions = sortedTransactions.slice(0, 5);

  setTransactions(lastFiveTransactions);

} else {
  setTransactions([]);
}

    } catch (error) {
      console.error('❌ Error getting transactions:', error);
      setTransactions([]);
    } finally {
      if (!silent) {
        setIsLoadingTransactions(false);
      }
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'Rp 0';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `Rp ${numAmount.toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return date.toLocaleDateString('id-ID', options);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'sukses':
      case 'success':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'gagal':
      case 'failed':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'sukses':
      case 'success':
        return 'checkmark-circle';
      case 'pending':
        return 'time';
      case 'gagal':
      case 'failed':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const prabayarServices = [
    { id: 1, icon: require('../assets/pulsa.png'), label: 'Pulsa', path: 'PulsaDataPage' },
    { id: 2, icon: require('../assets/paket-data.png'), label: 'Paket Data', path: 'PulsaDataPage' },
    { id: 3, icon: require('../assets/voucherss.png'), label: 'Voucher', path: 'PrepaidPage' },
    { id: 4, icon: require('../assets/e-money.png'), label: 'E-Money', path: 'PrepaidPage' },
    { id: 5, icon: require('../assets/token-pln.png'), label: 'Token PLN', path: 'PrepaidPage' },
    { id: 6, icon: require('../assets/game.png'), label: 'Game', path: 'PrepaidPage' },
    { id: 7, icon: require('../assets/tv.png'), label: 'TV', path: 'PrepaidPage' },
    { id: 8, icon: require('../assets/gas.png'), label: 'Gas', path: 'PrepaidPage' },
  ];

  const pascabayarServices = [
    { id: 1, icon: require('../assets/token-pln.png'), label: 'Tagihan Listrik', path: 'PostpaidPage' },
    { id: 2, icon: require('../assets/pdam.png'), label: 'PDAM', path: 'PostpaidPage' },
    { id: 3, icon: require('../assets/hp-pascabayar.png'), label: 'HP Pascabayar', path: 'PostpaidPage' },
    { id: 4, icon: require('../assets/internet.png'), label: 'Internet', path: 'PostpaidPage' },
    { id: 5, icon: require('../assets/bpjs-ks.png'), label: 'BPJS-KS', path: 'PostpaidPage' },
    { id: 6, icon: require('../assets/bpjs-kt.png'), label: 'BPJS-KT', path: 'PostpaidPage' },
    { id: 7, icon: require('../assets/multifinance.png'), label: 'Multifinance', path: 'PostpaidPage' },
    { id: 8, icon: require('../assets/pbb.png'), label: 'PBB', path: 'PostpaidPage' },
    { id: 9, icon: require('../assets/gas-negara.png'), label: 'Gas Negara', path: 'PostpaidPage' },
    { id: 10, icon: require('../assets/tv-pascabayar.png'), label: 'TV Pascabayar', path: 'PostpaidPage' },
    { id: 11, icon: require('../assets/e-money-pascabayar.png'), label: 'E-Money', path: 'PostpaidPage' },
    { id: 12, icon: require('../assets/byu.png'), label: 'By.U', path: 'PostpaidPage' },
  ];

  const bannerImages = [
    require('../assets/ppob-banner.png'),
    require('../assets/ppob-banner.png'),
    require('../assets/ppob-banner.png'),
  ];

  const renderBalanceCard = () => {
    if (!isRegistered) {
      return (
        <View style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View style={styles.balanceLeft}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.balanceTitle}>Saldo Tersedia</Text>
                <TouchableOpacity onPress={() => setBalanceVisible(!balanceVisible)}>
                  <Icon
                    name={balanceVisible ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#666"
                    style={styles.eyeIcon}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.balanceAmountRow}>
               <Text
  style={[
    styles.balanceAmount,
    balanceVisible && styles.balanceVisibleText
  ]}
>
  {balanceVisible && userData
    ? formatCurrency(userData.wallet_balance)
    : 'Rp ---------'}
</Text>

              </View>
            </View>

            <View style={styles.balanceRight}>
              <TouchableOpacity style={styles.topUpButton} onPress={() => navigation.push('TopUpPage')}>
                <Icon name="add-circle" size={25} color="#2F318B" />
                <Text style={styles.topUpText}>Isi Saldo</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.historyButton} onPress={() => navigation.push('TopUpHistoryPage')}>
                <Image
                  source={require('../assets/riwayat-icon.png')}
                  style={{ width: 25, height: 25 }}
                />
                <Text style={styles.historyText}>Riwayat</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.registerSection}>
            <View style={styles.registerTextContainer}>
              <Text style={styles.registerText}>
                Dapatkan lebih banyak keuntungan dengan menjadi{' '}
                <Text style={styles.registerTextBold}>"Agen Platinum"</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => navigation.push('DaftarAgenPage')}
            >
              <Text style={styles.registerButtonText}>Daftar</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    } else {
      return (
        <View style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View style={styles.balanceLeft}>
              <View style={{ flexDirection: 'row' }}>
                <Text style={styles.balanceTitle}>Saldo Tersedia</Text>
                <TouchableOpacity onPress={() => setBalanceVisible(!balanceVisible)}>
                  <Icon
                    name={balanceVisible ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#666"
                    style={styles.eyeIcon}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.balanceAmountRow}>
                <Text
  style={[
    styles.balanceAmount,
    balanceVisible && styles.balanceVisibleText
  ]}
>
  {balanceVisible && userData
    ? formatCurrency(userData.wallet_balance)
    : 'Rp xxxxxx'}
</Text>

              </View>
            </View>

            <View style={styles.balanceRight}>
              <TouchableOpacity style={styles.topUpButton} onPress={() => navigation.push('TopUpPage')}>
                <Icon name="add-circle" size={25} color="#2F318B" />
                <Text style={styles.topUpText}>Isi Saldo</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.historyButton} onPress={() => navigation.push('TopUpHistoryPage')}>
                <Image
                  source={require('../assets/riwayat-icon.png')}
                  style={{ width: 25, height: 25 }}
                />
                <Text style={styles.historyText}>Riwayat</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.agentSection}>
            <View style={styles.agentTextContainer}>
              <Text style={styles.agentText}>
                Anda Terdaftar <Text style={styles.agentTextBold}>"Agen Platinum"</Text>
              </Text>
            </View>
            <View style={styles.agentNameContainer}>
              <Text style={styles.agentName}>
                {agentData?.nama_konter || 'Agen Platinum'}
              </Text>
              <Image
                source={require('../assets/verified.png')}
                style={{ width: 28, height: 28 }}
              />
            </View>
          </View>
        </View>
      );
    }
  };

  const renderTransactionItem = (transaction) => {
    const statusColor = getStatusColor(transaction.status);
    const statusIcon = getStatusIcon(transaction.status);

    return (
      <TouchableOpacity
        key={transaction.ref_id}
        style={styles.transactionItem}
        onPress={() => {
          // Navigate to transaction detail if needed
          console.log('Transaction clicked:', transaction.ref_id);
        }}
      >
        <View style={styles.transactionLeft}>
          <View style={[styles.transactionIconContainer, { backgroundColor: `${statusColor}20` }]}>
            <Icon name={statusIcon} size={24} color={statusColor} />
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionProduct} numberOfLines={1}>
              {transaction.product?.name || 'Produk'}
            </Text>
            <Text style={styles.transactionCustomer} numberOfLines={1}>
              {transaction.customer_no}
            </Text>
            <Text style={styles.transactionDate}>{formatDate(transaction.created_at)}</Text>
          </View>
        </View>

        <View style={styles.transactionRight}>
          <Text style={styles.transactionAmount}>
            {formatCurrency(transaction.product?.price)}
          </Text>
          <View style={[styles.transactionStatusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.transactionStatusText}>{transaction.status}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2F318B" />
        <Text style={styles.loadingText}>Memuat data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header with Background Image */}
        <View style={styles.headerContainer}>
          <Image
            source={require('../assets/ppob-header-image.png')}
            style={styles.headerBgImage}
            resizeMode="cover"
          />
          <View style={styles.headerOverlay}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="chevron-back" size={28} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCardWrapper}>{renderBalanceCard()}</View>

        {/* Banner Carousel */}
        <View style={styles.bannerContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / (width - 40)
              );
              setCurrentBanner(index);
            }}
          >
            {dataBannerPPOB.map((banner, index) => (
              <View key={index} style={styles.bannerSlide}>
                 <TouchableOpacity onPress={() => Linking.openURL(banner.url)}>
                              <Image source={{uri: URL_IMAGE + "/" + banner.image}} style={styles.bannerImage} resizeMode="cover" />
                
                               </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <View style={styles.pagination}>
            {bannerImages.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  currentBanner === index && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Prabayar Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prabayar</Text>
          <View style={styles.servicesGrid}>
            {prabayarServices.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceItem}
                onPress={() =>
                  navigation.push(service.path, {
                    title: service.label,
                    categoryName: service.label,
                  })
                }
              >
                <View style={styles.serviceIconContainer}>
                  <Image
                    source={service.icon}
                    style={styles.serviceIcon}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.serviceLabel}>{service.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Pascabayar Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pascabayar</Text>
          <View style={styles.servicesGrid}>
            {pascabayarServices.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceItem}
                onPress={() =>
                  navigation.push(service.path, {
                    title: service.label,
                    categoryName: 'Pascabayar',
                  })
                }
              >
                <View style={styles.serviceIconContainer}>
                  <Image
                    source={service.icon}
                    style={styles.serviceIcon}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.serviceLabel}>{service.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Transaksi Terakhir */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transaksi Terakhir</Text>


<View style={{flexDirection: 'row'}}>
  {transactions.length > 0 && (
              <TouchableOpacity onPress={() => getTransactions()}>
                <Icon name="refresh" size={17} color="#2F318B" />
              </TouchableOpacity>
            )}

<TouchableOpacity onPress={() => navigation.push('AllTransactionPage')}>
            <Text style={{marginLeft: 10, fontSize: 14, fontFamily: 'Poppins-Regular', color: '#4F46E5'}}>Lihat Semua</Text>

</TouchableOpacity>
</View>
          

          </View>

          {isLoadingTransactions ? (
            <View style={styles.transactionLoading}>
              <ActivityIndicator size="small" color="#2F318B" />
            </View>
          ) : transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="receipt-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyStateText}>Belum ada Transaksi</Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {transactions.map((transaction) => renderTransactionItem(transaction))}
            </View>
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#757575',
    fontFamily: 'Poppins-Regular',
  },
  headerContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  headerBgImage: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  balanceCardWrapper: {
    marginTop: -50,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  balanceCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceLeft: {
    flex: 1,
  },
  balanceTitle: {
    fontSize: 15,
    color: '#000000',
    marginBottom: 5,
    fontFamily: 'Poppins-Regular',
  },
  balanceAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceAmount: {
    fontSize: 22,
    color: '#A1A3A2',
    marginBottom: 0,
    fontFamily: 'Poppins-Regular',
  },
  eyeIcon: {
    marginLeft: 10,
  },
  balanceRight: {
    flexDirection: 'row',
  },
  topUpButton: {
    flexDirection: 'column',
    alignItems: 'center',
    borderRadius: 12,
    padding: 10,
    minWidth: 70,
  },
  topUpText: {
    fontSize: 11,
    color: 'black',
    marginTop: 4,
    fontFamily: 'Poppins-Regular',
  },
  historyButton: {
    flexDirection: 'column',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 12,
  },
  historyText: {
    fontSize: 11,
    color: 'black',
    marginTop: 4,
    fontFamily: 'Poppins-Regular',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  registerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  registerTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  registerText: {
    fontSize: 11,
    color: 'black',
    lineHeight: 14,
    fontFamily: 'Poppins-Regular',
    marginTop: -5,
  },
  registerTextBold: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 11,
    color: '#4F46E5',
  },
  registerButton: {
    backgroundColor: '#2F318B',
    paddingHorizontal: 24,
    paddingVertical: 2,
    borderRadius: 8,
    height: 25,
    marginTop: -5,
  },
  registerButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  agentSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  agentTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  agentText: {
    fontSize: 10,
    color: 'black',
    lineHeight: 14,
    fontFamily: 'Poppins-Regular',
    marginTop: -7,
  },
  agentTextBold: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 11,
    color: '#4F46E5',
  },
  agentNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceVisibleText: {
  color: '#000',
},
  agentName: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#000000',
  },
  bannerContainer: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  bannerSlide: {
    width: width - 40,
  },
  bannerImage: {
    width: '100%',
    height: 160,
    borderRadius: 15,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#1F2937',
    width: 24,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 9,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#000000',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 15,
  },
  serviceItem: {
    width: '25%',
    alignItems: 'center',
    marginBottom: 20,
  },
  serviceIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceIcon: {
    width: 35,
    height: 35,
  },
  serviceLabel: {
    fontSize: 11,
    color: '#1F2937',
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },
  emptyState: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
    fontFamily: 'Poppins-Regular',
  },
  transactionLoading: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 40,
    alignItems: 'center',
  },
  transactionsList: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionProduct: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#1F2937',
    marginBottom: 2,
  },
  transactionCustomer: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    color: '#9CA3AF',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  transactionStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  transactionStatusText: {
    fontSize: 11,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFF',
  },
});