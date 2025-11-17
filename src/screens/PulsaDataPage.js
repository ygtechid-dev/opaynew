import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../context/APIUrl';
import Contacts from 'react-native-contacts';
import { PermissionsAndroid, Platform } from 'react-native';


export default function PulsaDataPage({ navigation, route }) {
    const {title} = route.params
  const [activeTab, setActiveTab] = useState('pulsa'); // 'pulsa' or 'data'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [products, setProducts] = useState([]);
  const [pulsaProducts, setPulsaProducts] = useState([]);
  const [dataProducts, setDataProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAgen, setIsAgen] = useState(false);
  const [isLoadingAgen, setIsLoadingAgen] = useState(true);
  const [sortByLowestPrice, setSortByLowestPrice] = useState(false);


  const providerPrefixes = {
    TELKOMSEL: ['0811', '0812', '0813', '0821', '0822', '0823', '0851', '0852', '0853'],
    INDOSAT: ['0814', '0815', '0816', '0855', '0856', '0857', '0858', '0895', '0896', '0897', '0898', '0899'],
    XL: ['0817', '0818', '0819', '0859', '0877', '0878', '0831', '0832', '0833', '0838'],
    SMARTFREN: ['0881', '0882', '0883', '0884', '0885', '0886', '0887', '0888', '0889'],
    TRI: ['0895', '0896', '0897', '0898', '0899'],
  };

  const providerInfo = {
    TELKOMSEL: {
      image: require('../assets/telkomsel_logo.png'),
      initial: 'T-SEL',
      color: '#E53935',
    },
    INDOSAT: {
      image: require('../assets/indosat_logo.png'),
      initial: 'ISAT',
      color: '#FFA000',
    },
    XL: {
      image: require('../assets/xl_logo.png'),
      initial: 'XL',
      color: '#1976D2',
    },
    SMARTFREN: {
      image: require('../assets/smartfren_logo.png'),
      initial: 'SMART',
      color: '#E91E63',
    },
    TRI: {
      image: require('../assets/tri_logo.jpg'),
      initial: 'TRI',
      color: '#9C27B0',
    },
  };

useEffect(() => {
  checkAgenStatus();

  if (title === "Paket Data") {
    setActiveTab("data"); 
  } else {
    setActiveTab("pulsa");
  }
}, []);


  useEffect(() => {
    if (phoneNumber.length >= 10) {
      fetchProducts();
    } else {
      setProducts([]);
      setPulsaProducts([]);
      setDataProducts([]);
    }
  }, [phoneNumber, selectedProvider]);

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

      console.log('====================================');
      console.log('resss', response.data);
      console.log('====================================');
      if (response.data && response.data.length > 0) {
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

  const detectProvider = (phone) => {
    if (phone.length >= 4) {
      const prefix = phone.substring(0, 4);
      for (const provider in providerPrefixes) {
        if (providerPrefixes[provider].includes(prefix)) {
          setSelectedProvider(provider);
          return provider;
        }
      }
    }
    setSelectedProvider('');
    return '';
  };

  const fetchProducts = async () => {
    if (phoneNumber.trim().length < 10) {
      setProducts([]);
      setPulsaProducts([]);
      setDataProducts([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/products`);
      
      if (response.data) {
        let allProducts = response.data;
        
        // Filter by provider if detected
        if (selectedProvider) {
          allProducts = allProducts.filter(
            (product) => 
              product.brand_name?.toUpperCase() === selectedProvider
          );
        }

        // Separate pulsa and data products
        const pulsa = allProducts.filter((product) =>
          product.category_name?.toLowerCase().includes('pulsa')
        );
        const data = allProducts.filter((product) =>
          product.category_name?.toLowerCase().includes('data')
        );

        setProducts(allProducts);
        setPulsaProducts(pulsa);
        setDataProducts(data);

        if (sortByLowestPrice) {
          sortProductsByPrice();
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Gagal memuat produk');
    } finally {
      setIsLoading(false);
    }
  };

  const sortProductsByPrice = () => {
    const sortFunc = (a, b) => {
      const priceA = parseFloat(isAgen ? a.price : (a.priceTierTwo || a.price)) || 0;
      const priceB = parseFloat(isAgen ? b.price : (b.priceTierTwo || b.price)) || 0;
      return priceA - priceB;
    };

    setPulsaProducts([...pulsaProducts].sort(sortFunc));
    setDataProducts([...dataProducts].sort(sortFunc));
  };

  const togglePriceFilter = () => {
    setSortByLowestPrice(!sortByLowestPrice);
    if (!sortByLowestPrice) {
      sortProductsByPrice();
    } else {
      fetchProducts();
    }
  };

  const handlePhoneChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setPhoneNumber(cleaned);
    detectProvider(cleaned);
  };

 const openContactPicker = async () => {
  try {
    // === ANDROID PERMISSION ===
    if (Platform.OS === 'android') {
      const permission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        {
          title: 'Izin Akses Kontak',
          message: 'Aplikasi membutuhkan akses kontak untuk memilih nomor.',
          buttonPositive: 'OK',
        }
      );

      if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Izin ditolak', 'Tidak bisa membuka kontak tanpa izin.');
        return;
      }
    }

    // === OPEN CONTACT PICKER ===
    const contact = await Contacts.openContactPicker();

    if (!contact.phoneNumbers || contact.phoneNumbers.length === 0) {
      Alert.alert('Tidak ada nomor telepon', 'Kontak tidak punya nomor.');
      return;
    }

    // Ambil nomor pertama
    let number = contact.phoneNumbers[0].number;

    // === BERSIHKAN FORMAT NOMOR ===
    number = number
      .replace(/\s+/g, '')   // hilangkan spasi
      .replace(/-/g, '')     // hilangkan strip
      .replace(/\(/g, '')    // hilangkan (
      .replace(/\)/g, '')    // hilangkan )
      .replace(/^\+62/, '0'); // convert +62 ke 0

    // set ke input
    setPhoneNumber(number);

    // jalankan deteksi provider
    detectProvider(number);

  } catch (error) {
    console.log('Error open contact picker:', error);
  }
};

  const formatPrice = (price) => {
    const priceDouble = parseFloat(price) || 0;
    return `Rp ${priceDouble.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
  };

  const navigateToPayment = (product) => {
    navigation.navigate('PaymentDetailPage', {
      product,
      phoneNumber,
      provider: selectedProvider,
      providerLogo: providerInfo[selectedProvider]?.image,
    });
  };

  const renderProductCard = (product) => {
    const productName = product.product_name || '';
    
    const displayPrice = isAgen 
      ? formatPrice(product.price || '0')
      : formatPrice(product.priceTierTwo || product.price || '0');

    const agenPrice = formatPrice(product.price || '0');

    return (
      <TouchableOpacity
        key={product.id}
        style={styles.productCard}
        onPress={() => navigateToPayment(product)}
      >
        <View style={styles.productCardInner}>
          {/* Left Section - Logo & Info */}
          <View style={styles.leftSection}>
            {selectedProvider && (
              <Image
                source={providerInfo[selectedProvider]?.image}
                style={styles.providerLogo}
                resizeMode="contain"
              />
            )}
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={1}>
                {productName}
              </Text>
              <Text style={styles.productPrice}>{displayPrice}</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.verticalDivider} />

          {/* Right Section - Agen Info */}

{isAgen ? 

   <View style={styles.rightSection}>
            <View style={{flexDirection: 'row'}}>
               <View>
  <Text style={styles.agenLabel}>
    Anda mendapatkan{'\n'}Harga{' '}
    <Text style={styles.agenPlatinum}>Agen Platinum</Text>
  </Text>
</View>


                <Image source={require('../assets/verified.png')} style={{width: 20, height: 20, marginLeft: 10}} />
         
            {/* <View style={{flexDirection: 'row'}}>
            <Text style={styles.agenPrice}>{agenPrice}</Text>
 <View style={styles.arrowContainer}>
            <Icon name="play" size={14} color="white" />
          </View>
            </View> */}
  
            </View>
            
          </View>

          :
            <View style={styles.rightSection}>
            <View>
            <Text style={styles.agenLabel}>
              Daftar Agen Platinum,{'\n'}dapatkan harga murah
            </Text>

            <View style={{flexDirection: 'row'}}>
            <Text style={styles.agenPrice}>{agenPrice}</Text>
 <View style={styles.arrowContainer}>
            <Icon name="play" size={14} color="white" />
          </View>
            </View>
  
            </View>
            
          </View>
}

       

          {/* Arrow Icon */}
       
        </View>
      </TouchableOpacity>
    );
  };

  const renderProductList = () => {
    let currentProducts = [];

if (title === "Paket Data") {
  currentProducts = dataProducts;
} else {
  currentProducts = activeTab === "pulsa" ? pulsaProducts : dataProducts;
}

    if (phoneNumber.length < 10) {
      return (
        <View style={styles.emptyState}>
          <Icon name="smartphone-outline" size={80} color="#E0E0E0" />
          <Text style={styles.emptyStateText}>
            Silakan Masukan Nomor Telepon untuk{'\n'}melihat produk pulsa dan data
          </Text>
        </View>
      );
    }

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2F318B" />
        </View>
      );
    }

    if (currentProducts.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Icon name="cube-outline" size={64} color="#BDBDBD" />
          <Text style={styles.emptyStateText}>
            {selectedProvider
              ? `Tidak ada produk tersedia untuk ${selectedProvider}`
              : 'Tidak ada produk tersedia'}
          </Text>
        </View>
      );
    }

    return (
      <ScrollView 
        style={styles.productList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.productListContent}
      >
        {currentProducts.map((product) => renderProductCard(product))}
        <View style={{ height: 20 }} />
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      {/* Content */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Input Section */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Masukkan No. Telepon</Text>

          {/* Phone Input Row */}
          <View style={styles.inputRow}>
            <View style={styles.phoneInputContainer}>
              <TextInput
                style={styles.phoneInput}
                placeholder="08xxxxxxx"
                placeholderTextColor="#BAB0B0"
                value={phoneNumber}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                maxLength={13}
              />
              {selectedProvider && (
                <Image
                  source={providerInfo[selectedProvider]?.image}
                  style={styles.providerIconSmall}
                  resizeMode="contain"
                />
              )}
            </View>

            <TouchableOpacity
              style={styles.contactButton}
              onPress={openContactPicker}
            >
              <Image
                source={require('../assets/bookuser.png')}
                style={styles.contactIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Product List */}
        <View style={styles.productListWrapper}>
          {renderProductList()}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F8FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 30,
  },
  backButton: {
    marginRight: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Poppins-SemiBold',
  },
  inputSection: {
    padding: 20,
    paddingTop: 30,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000',
    marginBottom: 15,
    fontFamily: 'Poppins-Regular',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(47, 49, 139, 0.3)',
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginRight: 12,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: '#000',
    padding: 0,
    fontFamily: 'Poppins-Regular',
  },
  providerIconSmall: {
    width: 32,
    height: 32,
    marginLeft: 8,
  },
  contactButton: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(47, 49, 139, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  contactIcon: {
    width: 32,
    height: 32,
  },
  productListWrapper: {
    flex: 1,
    minHeight: 400,
    backgroundColor: 'white',
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50
  },
  productList: {
    flex: 1,
  },
  productListContent: {
    padding: 20,
  },
  productCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  productCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 90,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  providerLogo: {
    width: 45,
    height: 55,
    marginRight: 8,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 9,
    color: '#000',
    marginBottom: 0,
    fontFamily: 'Poppins-Regular',
  },
  productPrice: {
    fontSize: 16,
    color: '#000',
    fontFamily: 'Poppins-SemiBold',
  },
  verticalDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
  },
  rightSection: {
    flex: 1,
  },
  agenLabel: {
    fontSize: 10,
    color: '#000',
    lineHeight: 16,
    marginBottom: 6,
    fontFamily: 'Poppins-Regular',
  },
    agenPlatinum: {
    fontSize: 10,
    color: '#2F318B',
    lineHeight: 16,
    marginBottom: 6,
    fontFamily: 'Poppins-SemiBold',
  },
  agenPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2F318B',
    fontFamily: 'Poppins-Bold',
  },
  arrowContainer: {
    width: 23,
    height: 23,
    borderRadius: 16,
    backgroundColor: '#2F318B',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 30
    
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyStateText: {
    fontSize: 12,
    color: '#BDBDBD',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
    fontFamily: 'Poppins-Regular',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
});