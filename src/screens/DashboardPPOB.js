import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../context/APIUrl';

const { width } = Dimensions.get('window');

export default function DashboardPPOB({navigation}) {
  // Toggle untuk testing - true = sudah daftar, false = belum daftar
  const [isRegistered, setIsRegistered] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [userData, setUserData] = useState([]);


  const getUser = async () => {
     const userss = await AsyncStorage.getItem('userData');
     if (userss) {
  const userObj = JSON.parse(userss);
  console.log('uuuuss', userObj.id);
   await axios.get(`${API_URL}/api/users`).then((res) => {
        console.log('====================================');
        console.log('sdsdsd', res.data.data);
        const resuser = res.data.data
        const filteringuser = resuser.filter((e) => e.id == userObj.id)
        console.log('====================================');
        console.log('hasilfilter', filteringuser);
        console.log('====================================');
        setUserData(filteringuser)
     })
}
    
  }

  useEffect(() => {
    getUser()
  }, [])
  
  const prabayarServices = [
    { id: 1, icon: require('../assets/pulsa.png'), label: 'Pulsa', path: 'PulsaDataPage' },
    { id: 2, icon: require('../assets/paket-data.png'), label: 'Paket Data', path: 'PulsaDataPage' },
    { id: 3, icon: require('../assets/voucherss.png'), label: 'Voucher', path: 'PulsaDataPage' },
    { id: 4, icon: require('../assets/e-money.png'), label: 'E-Money', path: 'PulsaDataPage' },
    { id: 5, icon: require('../assets/token-pln.png'), label: 'Token PLN', path: 'PulsaDataPage' },
    { id: 6, icon: require('../assets/game.png'), label: 'Game', path: 'PulsaDataPage' },
    { id: 7, icon: require('../assets/tv.png'), label: 'TV', path: 'PulsaDataPage' },
    { id: 8, icon: require('../assets/gas.png'), label: 'Gas', path: 'PulsaDataPage' },
  ];

  const pascabayarServices = [
    { id: 1, icon: require('../assets/token-pln.png'), label: 'Tagihan Listrik' },
    { id: 2, icon: require('../assets/pdam.png'), label: 'PDAM' },
    { id: 3, icon: require('../assets/hp-pascabayar.png'), label: 'HP Pascabayar' },
    { id: 4, icon: require('../assets/internet.png'), label: 'Internet' },
    { id: 5, icon: require('../assets/bpjs-ks.png'), label: 'BPJS-KS' },
    { id: 6, icon: require('../assets/bpjs-kt.png'), label: 'BPJS-KT' },
    { id: 7, icon: require('../assets/multifinance.png'), label: 'Multifinance' },
    { id: 8, icon: require('../assets/pbb.png'), label: 'PBB' },
    { id: 9, icon: require('../assets/gas-negara.png'), label: 'Gas Negara' },
    { id: 10, icon: require('../assets/tv-pascabayar.png'), label: 'TV Pascabayar' },
    { id: 11, icon: require('../assets/e-money-pascabayar.png'), label: 'E-Money' },
    { id: 12, icon: require('../assets/byu.png'), label: 'By.U' },
  ];

  const bannerImages = [
    require('../assets/ppob-banner.png'),
    require('../assets/ppob-banner.png'),
    require('../assets/ppob-banner.png'),
  ];

  const renderBalanceCard = () => {
    if (!isRegistered) {
      // Belum terdaftar
      return (
        <View style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View style={styles.balanceLeft}>
              <View style={{flexDirection: 'row'}}>
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
              
              {balanceVisible ?
               <View style={styles.balanceAmountRow}>
                <Text style={styles.balanceAmount}>{userData? 'Rp ' + userData[0].wallet_balance : "Rp. xxxxxx"} </Text>
              </View>

              :
               <View style={styles.balanceAmountRow}>
                <Text style={styles.balanceAmount}>{"Rp. xxxxxx"} </Text>
              </View>
              }
             
            </View>

            <View style={styles.balanceRight}>
              <TouchableOpacity style={styles.topUpButton}>
                <Icon name="add-circle" size={25} color="#2F318B" />
                <Text style={styles.topUpText}>Isi Saldo</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.historyButton}>
                <Image source={require('../assets/riwayat-icon.png')} style={{width: 25, height: 25}} />
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
            <TouchableOpacity style={styles.registerButton}>
              <Text style={styles.registerButtonText}>Daftar</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    } else {
      // Sudah terdaftar
      return (
        <View style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View style={styles.balanceLeft}>
              <View style={{flexDirection: 'row'}}>
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
              

          {balanceVisible ?
               <View style={styles.balanceAmountRow}>
                <Text style={styles.balanceAmount}>{userData? 'Rp ' + userData[0].wallet_balance : "Rp. xxxxxx"} </Text>
              </View>

              :
               <View style={styles.balanceAmountRow}>
                <Text style={styles.balanceAmount}>{"Rp. xxxxxx"} </Text>
              </View>
              }

              
            </View>

            <View style={styles.balanceRight}>
              <TouchableOpacity style={styles.topUpButton}>
                <Icon name="add-circle" size={25} color="#2F318B" />
                <Text style={styles.topUpText}>Isi Saldo</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.historyButton}>
                <Image source={require('../assets/riwayat-icon.png')} style={{width: 25, height: 25}} />
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
              <Text style={styles.agentName}>Andri Cell</Text>
                <Image source={require('../assets/verified.png')} style={{width: 28, height: 28}} />
            
            </View>
          </View>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with Background Image */}
        <View style={styles.headerContainer}>
          <Image
            source={require('../assets/ppob-header-image.png')}
            style={styles.headerBgImage}
            resizeMode="cover"
          />
          <View style={styles.headerOverlay}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Icon name="chevron-back" size={28} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance Card - Positioned to overlap header */}
        <View style={styles.balanceCardWrapper}>
          {renderBalanceCard()}
        </View>

        {/* Banner Carousel */}
        <View style={styles.bannerContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / (width - 40));
              setCurrentBanner(index);
            }}
          >
            {bannerImages.map((banner, index) => (
              <View key={index} style={styles.bannerSlide}>
                <Image source={banner} style={styles.bannerImage} resizeMode="cover" />
              </View>
            ))}
          </ScrollView>

          {/* Pagination Dots */}
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
              <TouchableOpacity key={service.id} style={styles.serviceItem} onPress={() => navigation.push(service.path)}>
                <View style={styles.serviceIconContainer}>
                  <Image source={service.icon} style={styles.serviceIcon} resizeMode="contain" />
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
              <TouchableOpacity key={service.id} style={styles.serviceItem}>
                <View style={styles.serviceIconContainer}>
                  <Image source={service.icon} style={styles.serviceIcon} resizeMode="contain" />
                </View>
                <Text style={styles.serviceLabel}>{service.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Transaksi Terakhir */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaksi Terakhir</Text>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Belum ada Transaksi</Text>
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Debug Toggle Button - Hapus ini di production */}
      <TouchableOpacity
        style={styles.debugButton}
        onPress={() => setIsRegistered(!isRegistered)}
      >
        <Text style={styles.debugButtonText}>
          {isRegistered ? 'Mode: Terdaftar' : 'Mode: Belum Terdaftar'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
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
    fontFamily: 'Poppins-Regular'
  },
  balanceAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceAmount: {
    fontSize: 22,
    color: '#A1A3A2',
    marginBottom: 0,
    fontFamily: 'Poppins-Regular'
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
    marginTop: -5
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
    marginTop: -5
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
    marginTop: -7

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
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
    color: '#000000',
    marginBottom: 9,
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
    fontFamily: 'Poppins-Regular'
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
  },
  debugButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#10B981',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  debugButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});