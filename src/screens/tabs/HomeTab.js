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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../../context/APIUrl';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const { width } = Dimensions.get('window');

export default function HomeTab({navigation}) {
  const scrollViewRef = useRef(null);
  const [isAgen, setIsAgen] = useState(false);
  const [isLoadingAgen, setIsLoadingAgen] = useState(true);
  const [userData, setUserData] = useState(null);

  const services = [
    { id: 1, icon: require('../../assets/paket-data.png'), label: 'Paket Data', path: 'DashboardPPOB' },
    { id: 2, icon: require('../../assets/token-pln.png'), label: 'Token PLN', path: 'DashboardPPOB' },
    { id: 3, icon: require('../../assets/internet.png'), label: 'Internet', path: 'DashboardPPOB' },
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
      console.error('Error checking agen status:', error);
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
  }, [])
  

  const bannerImages = [
    require('../../assets/banners.png'),
    require('../../assets/banners2.png'),
    require('../../assets/banners.png'),
  ];

  const [currentBanner, setCurrentBanner] = React.useState(0);

  return (
    <>
     <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Banner */}
      <View style={styles.headerBanner}>
        <Image
          source={require('../../assets/banners.png')}
          style={styles.headerImage}
          resizeMode="cover"
        />
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
        <TouchableOpacity style={styles.notificationButton}>
        <Image source={require('../../assets/notif.png')} style={{width: 30, height: 30}} />
        </TouchableOpacity>
      </View>

      {/* Quick Services */}
      <View style={styles.quickServices}>
        {services.map((service) => (
          <TouchableOpacity key={service.id} style={styles.serviceItem} onPress={() => navigation.navigate(service.path)}>
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

        <View style={styles.balanceCard}>
          <Text style={styles.balanceTitle}>Saldo</Text>
          <Text style={styles.balanceAmount}>{ `Rp ${formatCurrency(userData.wallet_balance)}` || 'Rp xxxxxx'}</Text>
        </View>
      </View>
      :
        <View style={styles.statusContainer}>
        <View style={styles.agentCard}>
          <View>
<Text style={styles.agentTitle}>Daftar Sebagai</Text>
          <View style={styles.agentBadge}>
            <Text style={styles.agentText}>Agen Platinum PPOB</Text>
         
          </View>
          </View>
          
          <View>
            <Image source={require('../../assets/unverified.png')} style={{width: 20, height: 20, marginLeft: 5, marginTop: 7}} />
          </View>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceTitle}>Saldo</Text>
          <Text style={styles.balanceAmount}>Rp xx,xxx,xxx</Text>
        </View>
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

      {/* Main Services Grid */}
      <View style={styles.mainServicesContainer}>
        <View style={styles.servicesGrid}>
          {mainServices.map((service) => (
            <TouchableOpacity key={service.id} style={styles.mainServiceItem} onPress={() => alert('Sedang dalam Pengembangan')}>
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
      backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 13,
    height: 60,
    width: '50%'
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
    backgroundColor: '#F8F9FA',
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
    fontSize: 12,
    color: 'black',
    textAlign: 'center',
    fontFamily: 'Poppins-Regular'
  },
});