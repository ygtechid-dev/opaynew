import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL, URL_IMAGE } from '../../context/APIUrl';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const { width } = Dimensions.get('window');

export default function HomeTab({navigation}) {
  const scrollViewRef = useRef(null);
  const [isAgen, setIsAgen] = useState(false);
  const [saldoShow, setSaldoShow] = useState(false);
  const [currentBanner, setCurrentBanner] = React.useState(0);
  const [direction, setDirection] = useState(1);
  const [isLoadingAgen, setIsLoadingAgen] = useState(true);
  const [dataBannerHeader, setDataBannerHeader] = useState([]);
  const [dataBannerHome, setDataBannerHome] = useState([]);
  const [userData, setUserData] = useState(null);
  
  // ✅ State untuk notifikasi
  const [hasUnreadNotif, setHasUnreadNotif] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [statusBarStyle, setStatusBarStyle] = useState('light-content');
  const [statusBarColor, setStatusBarColor] = useState('transparent');

  
  const services = [
    { id: 1, icon: require('../../assets/paket-data.png'), label: 'Paket Data', path: 'PulsaDataPage' },
    { id: 2, icon: require('../../assets/token-pln.png'), label: 'Token PLN', path: 'PrepaidPage' },
    { id: 3, icon: require('../../assets/internet.png'), label: 'Internet', path: 'PostpaidPage' },
    { id: 4, icon: require('../../assets/lihat-semua.png'), label: 'Lihat Semua', path: 'DashboardPPOB' },
  ];

  const mainServices = [
    { id: 1, icon: require('../../assets/dimotorin.png'), label: 'dimotorin' },
    { id: 2, icon: require('../../assets/dimobilin.png'), label: 'dimobilin' },
    { id: 3, icon: require('../../assets/dikirimin.png'), label: 'dikirimin' },
    { id: 4, icon: require('../../assets/direntalin.png'), label: 'direntalin' },
    { id: 5, icon: require('../../assets/dibeliin.png'), label: 'dibeliin' },
    { id: 6, icon: require('../../assets/diobatin.png'), label: 'diobatin' },
    { id: 7, icon: require('../../assets/dimakanin.png'), label: 'dimakanin' },
    { id: 8, icon: require('../../assets/difotoin.png'), label: 'difotoin' },
  ];

 
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner((prev) => {
        let next = prev + direction;

        if (next >= bannerImages.length - 1) {
          setDirection(-1);
          next = bannerImages.length - 1;
        }

        if (next <= 0) {
          setDirection(1);
          next = 0;
        }

        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({
            x: next * (width - 40),
            animated: true,
          });
        }

        return next;
      });
    }, 5000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction]);


  const checkAgenStatus = async () => {
    try {
      setIsLoadingAgen(true);
      
      const userJson = await AsyncStorage.getItem('userData');
      if (!userJson) {
        setIsAgen(false);
        setIsLoadingAgen(false);
        return;
      }

      const userObj = JSON.parse(userJson);
      const userId = userObj.id;

      const response = await axios.get(
        `${API_URL}/api/users/agen/user/${userId}`,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      console.log('====================================');
      console.log('dddd', response.data);
      console.log('====================================');
      setIsAgen(response.data.data?.length > 0);
      setIsLoadingAgen(false);
    } catch (error) {
      setIsAgen(false);
      setIsLoadingAgen(false);
    }
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

  const getBanner = async () => {
    try {
      const userJson = await AsyncStorage.getItem('userData');
      if (userJson) {
        const userObj = JSON.parse(userJson);
        console.log('📱 Current User ID:', userObj.id);

        const response = await axios.get(`${API_URL}/api/newbanner`);
        const bannerss = response.data.data;
        console.log('====================================');
        console.log('datban', bannerss);
        console.log('====================================');
        const filterDataHeader = bannerss.filter(
          (e) => e.letak_banner === "home_header"
        );

        const filterDataBanHome = bannerss.filter(
          (e) =>
            e.letak_banner.includes("home") &&
            e.letak_banner !== "home_header"
        );

        console.log('datheadss', filterDataHeader);
        setDataBannerHeader(filterDataHeader)
        setDataBannerHome(filterDataBanHome)
      }
    } catch (error) {
      console.error('❌ Error getting user:', error);
    }
  };

  // ✅ Fungsi untuk cek notifikasi
  const checkNotifications = async () => {
    try {
      const userJson = await AsyncStorage.getItem('userData');
      if (!userJson) return;

      const userObj = JSON.parse(userJson);
      const userId = userObj.id;

      const response = await axios.get(`${API_URL}/api/notifications`);
      const notifications = response.data.data || response.data;

      // Filter notifikasi untuk user ini
      const userNotifications = notifications.filter(
        (notif) => notif.user_id === userId
      );

      // Cek notifikasi yang belum dibaca (dalam 24 jam terakhir atau sesuai logic kamu)
      const lastReadTime = await AsyncStorage.getItem('lastNotifReadTime');
      const lastRead = lastReadTime ? new Date(lastReadTime) : new Date(0);

      const unreadNotifications = userNotifications.filter((notif) => {
        const notifTime = new Date(notif.sent_at);
        return notifTime > lastRead;
      });

      setHasUnreadNotif(unreadNotifications.length > 0);
      setUnreadCount(unreadNotifications.length);

      console.log('🔔 Unread notifications:', unreadNotifications.length);
    } catch (error) {
      console.error('❌ Error checking notifications:', error);
    }
  };

  // ✅ Fungsi ketika klik notifikasi
  const handleNotificationPress = async () => {
    // Simpan waktu baca terakhir
    await AsyncStorage.setItem('lastNotifReadTime', new Date().toISOString());
    setHasUnreadNotif(false);
    setUnreadCount(0);
    
    // Navigate ke MessageTab
    navigation.navigate('MessageTab', {
      tabaktif: 'notifikasi'
    });
  };

  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount);
    return numAmount.toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };


  useEffect(() => {
    checkAgenStatus()
    getUser()
    getBanner()
    checkNotifications() // ✅ Tambahkan ini
  }, [])
  

  const bannerImages = [
    require('../../assets/banners.png'),
    require('../../assets/banners2.png'),
    require('../../assets/banners.png'),
  ];

  

  return (
    <>
     <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Banner */}
      <View style={styles.headerBanner}>
        {dataBannerHeader[0] ?
       <TouchableOpacity
          onPress={async () => {
            const url = dataBannerHeader[0].url;
            if (!url) return;

            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
              Linking.openURL(url);
            } else {
              console.log("❌ Invalid header banner URL:", url);
            }
          }}
        >
          <Image
            source={{uri: URL_IMAGE + "/" + dataBannerHeader[0].image}}
            style={styles.headerImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
        :
       null
      }
       
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Icon name="search-outline" size={24} color="#999" />
          <TextInput
            placeholder="Cari Layanan..."
            style={styles.searchInput}
            placeholderTextColor="#999"
          />
        </View>
        <View style={{height: 57, width: 1, backgroundColor: '#A1A3A2'}} />
        
        {/* ✅ Notification Button dengan Red Dot */}
        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={handleNotificationPress}
        >
          <View>
            <Image source={require('../../assets/notif.png')} style={{width: 30, height: 30}} />
            {hasUnreadNotif && (
              <View style={styles.notificationDot}>
                {unreadCount > 0 && unreadCount <= 99 && (
                  <Text style={styles.notificationCount}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Quick Services */}
      <View style={styles.quickServices}>
        {services.map((service) => (
          <TouchableOpacity key={service.id} style={styles.serviceItem} 
           onPress={() =>
                  navigation.push(service.path, {
                    title: service.label,
                    categoryName: service.label,
                  })
                }>
            <View style={styles.serviceIconContainer}>
              <Image source={service.icon} style={styles.serviceIcon} resizeMode="contain" />
            </View>
            <Text style={styles.serviceLabel}>{service.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Agent Status & Balance */}
      {isAgen ?
        <View style={styles.statusContainer}>
        <View style={styles.agentCard}>
          <View>
            <Text style={styles.agentTitle}>Terdaftar Sebagai</Text>
            <View style={styles.agentBadge}>
              <Text style={styles.agentText}>Agen Platinum PPOB</Text>
            </View>
          </View>
          
          <View>
            <Image source={require('../../assets/verified.png')} style={{width: 20, height: 20, marginLeft: 5, marginTop: 7}} />
          </View>
        </View>

        <TouchableOpacity style={styles.balanceCard} onPress={() => navigation.push('TopUpPage')}>
          <View>
            <View>
              <View style={{flexDirection: 'row'}}>
                <Text style={styles.balanceTitle}>Saldo</Text>
                {saldoShow ?
                  <TouchableOpacity onPress={() => setSaldoShow(false)}>
                    <Image source={require('../../assets/saldoshow.png')} style={{width: 11, height: 11, marginLeft: 8, marginTop: 3}} />
                  </TouchableOpacity>
                :
                  <TouchableOpacity onPress={() => setSaldoShow(true)}>
                    <Image source={require('../../assets/invisible.png')} style={{width: 11, height: 11, marginLeft: 8, marginTop: 3}} />
                  </TouchableOpacity>
                }
              </View>
              <Text
                style={[
                  styles.balanceAmount,
                  { color: saldoShow ? '#000' : '#C5C5C5' }
                ]}
              >
                {saldoShow ? `Rp ${formatCurrency(userData.wallet_balance)}` : 'Rp -----'}
              </Text>
            </View>
          </View>
        
          <View>
            <Image source={require('../../assets/wallethome.png')} style={{width: 28, height: 28, marginTop: 3}} />
          </View>
        </TouchableOpacity>
      </View>
      :
        <View style={styles.statusContainer}>
        <TouchableOpacity style={styles.agentCard} onPress={() => navigation.push('DaftarAgenPage')}>
          <View>
            <Text style={styles.agentTitle}>Daftar Sebagai</Text>
            <View style={styles.agentBadge}>
              <Text style={styles.agentText}>Agen Platinum PPOB</Text>
            </View>
          </View>
          
          <View>
            <Image source={require('../../assets/unverified.png')} style={{width: 20, height: 20, marginLeft: 5, marginTop: 7}} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.balanceCard} onPress={() => navigation.push('TopUpPage')}>
          <View>
            <View>
              <View style={{flexDirection: 'row'}}>
                <Text style={styles.balanceTitle}>Saldo</Text>
                {saldoShow ?
                  <TouchableOpacity onPress={() => setSaldoShow(false)}>
                    <Image source={require('../../assets/saldoshow.png')} style={{width: 11, height: 11, marginLeft: 8, marginTop: 3}} />
                  </TouchableOpacity>
                :
                  <TouchableOpacity onPress={() => setSaldoShow(true)}>
                    <Image source={require('../../assets/invisible.png')} style={{width: 11, height: 11, marginLeft: 8, marginTop: 3}} />
                  </TouchableOpacity>
                }
              </View>
              <Text
                style={[
                  styles.balanceAmount,
                  { color: saldoShow ? '#000' : '#C5C5C5' }
                ]}
              >
                {saldoShow ? `Rp ${formatCurrency(userData.wallet_balance)}` : 'Rp -----'}
              </Text>
            </View>
          </View>
        
          <View>
            <Image source={require('../../assets/wallethome.png')} style={{width: 28, height: 28, marginTop: 3}} />
          </View>
        </TouchableOpacity>
      </View>
    }
    

      {/* Banner Carousel */}
      <View style={styles.bannerContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / (width - 40));
            setCurrentBanner(index);
          }}
        >
          {dataBannerHome? 
          
          dataBannerHome.map((banner, index) => (
            <View key={index} style={styles.bannerSlide}>
             <TouchableOpacity
              onPress={async () => {
                if (!banner.url || banner.url.trim() === "") return;

                const canOpen = await Linking.canOpenURL(banner.url);

                if (canOpen) {
                  Linking.openURL(banner.url);
                } else {
                  console.log("❌ Invalid URL, ignoring:", banner.url);
                }
              }}
            >
              <Image source={{uri: URL_IMAGE + "/" + banner.image}} style={styles.bannerImage} resizeMode="cover" />
            </TouchableOpacity>
            </View>
          ))
        :
        null}
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

      {/* Main Services Grid */}
      <View style={styles.mainServicesContainer}>
        <View style={styles.servicesGrid}>
          {mainServices.map((service) => (
            <TouchableOpacity key={service.id} style={styles.mainServiceItem} onPress={() => Alert.alert(
              "Pengumuman",
              "Fitur ini masih dalam tahap pengembangan, di perkirakan launching awal januari 2026",
            )}>
              <View style={styles.mainServiceIconContainer}>
                <Image source={service.icon} style={styles.mainServiceIcon} resizeMode="contain" />
              </View>
              <Text style={styles.mainServiceLabel}>{service.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
    </>
   
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    paddingTop: 0,
  },
  headerBanner: {
    width: '100%',
    height: 165,
  },
  headerImage: {
    width: '100%',
    height: 165,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: 'white',
    width: '90%',
    height: 58,
    alignSelf: 'center',
    marginTop: -20,
    borderRadius: 12
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    height: 50,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  notificationButton: {
    marginLeft: 10,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
  },
  // ✅ Style untuk notification dot
  notificationDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  notificationCount: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    fontWeight: 'bold',
  },
  quickServices: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 17,
    paddingHorizontal: 10,
  },
  serviceItem: {
    alignItems: 'center',
    flex: 1,
  },
  serviceIconContainer: {
    width: 65,
    height: 65,
    borderRadius: 15,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1, 
    borderColor: '#CEF8EC',
    marginBottom: 8,
  },
  serviceIcon: {
    width: 35,
    height: 35,
  },
  serviceLabel: {
    fontSize: 11,
    color: '#000000',
    textAlign: 'center',
    fontFamily: 'Poppins-Regular'
  },
  statusContainer: {
    flexDirection: 'row',
    paddingHorizontal: 22,
    justifyContent: 'space-evenly',
    paddingVertical: 12,
    gap: 13,
    backgroundColor: '#DEE3EE'
  },
  agentCard: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 11,
    height: 60
  },
  agentTitle: {
    fontSize: 10,
    color: 'black',
    marginBottom: 0,
    fontFamily: 'Poppins-Regular'
  },
  agentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentText: {
    fontSize: 10,
    fontFamily: 'Poppins-Medium',
    color: '#000000',
  },
  checkIcon: {
    marginLeft: 5,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 13,
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  balanceTitle: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#000000',
    marginBottom: 0,
  },
  balanceAmount: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: '#A1A3A2',
  },
  bannerContainer: {
    marginTop: 10,
    paddingHorizontal: 20,
  },
  bannerSlide: {
    width: width - 40,
    marginRight: 0,
  },
  bannerImage: {
    width: '100%',
    height: 155,
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
    backgroundColor: '#D9D9D9',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#5DCBAD',
    width: 24,
  },
  mainServicesContainer: {
    paddingHorizontal: 15,
    paddingTop: 20,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 15,
    padding: 15,
    justifyContent: 'space-between'
  },
  mainServiceItem: {
    width: 65,
    alignItems: 'center',
    marginBottom: 20,
    marginRight: 7,
  },
  mainServiceIconContainer: {
    width: 65,
    height: 65,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#CEF8EC',
    backgroundColor: 'white'
  },
  mainServiceIcon: {
    width: 31,
    height: 31,
  },
  mainServiceLabel: {
    fontSize: 11,
    color: 'black',
    textAlign: 'center',
    fontFamily: 'Poppins-Regular'
  },
});