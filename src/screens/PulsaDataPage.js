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

export default function PulsaDataPage({ navigation }) {
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
      image: require('../assets/tri_logo.png'),
      initial: 'TRI',
      color: '#9C27B0',
    },
  };

  useEffect(() => {
    checkAgenStatus();
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
    // Only allow numbers
    const cleaned = text.replace(/[^0-9]/g, '');
    setPhoneNumber(cleaned);
    detectProvider(cleaned);
  };

  const openContactPicker = () => {
    // Implement contact picker functionality
    Alert.alert('Info', 'Fitur pemilih kontak akan segera tersedia');
  };

  const formatPrice = (price) => {
    const priceDouble = parseFloat(price) || 0;
    return `Rp ${priceDouble.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
  };

  const navigateToPayment = (product) => {
    navigation.navigate('PaymentDetail', {
      product,
      phoneNumber,
      provider: selectedProvider,
      providerLogo: providerInfo[selectedProvider]?.image,
    });
  };

  const renderProductCard = (product) => {
    const productName = product.product_name || '';
    const nominalPoint = product.nominal_point 
      ? `${parseFloat(product.nominal_point).toFixed(0)} Poin`
      : '';

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
          {/* Provider Logo */}
          {selectedProvider && (
            <View style={styles.providerLogoContainer}>
              <Image
                source={providerInfo[selectedProvider]?.image}
                style={styles.providerLogo}
                resizeMode="contain"
              />
            </View>
          )}

          {/* Product Info */}
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {productName}
            </Text>
            <Text style={styles.productPrice}>{displayPrice}</Text>
          </View>

          {/* Divider */}
          <View style={styles.verticalDivider} />

          {/* Poin */}
          {nominalPoint ? (
            <View style={styles.pointContainer}>
              <Text style={styles.pointText}>{nominalPoint}</Text>
            </View>
          ) : null}

          {/* Divider */}
          <View style={styles.verticalDivider} />

          {/* Agen Section */}
          {isAgen ? (
            <View style={styles.agenSection}>
              <Text style={styles.agenText}>
                Anda mendapatkan harga{'\n'}agen platinum
              </Text>
            </View>
          ) : (
            <View style={styles.agenSection}>
              <Text style={styles.agenLabel}>Harga Agen Platinum</Text>
              <View style={styles.agenPriceRow}>
                <Text style={styles.agenPrice}>{agenPrice}</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('DaftarAgen')}
                  style={styles.verifiedIconContainer}
                >
                  <Image
                    source={require('../assets/verified.png')}
                    style={styles.verifiedIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Info text */}
        {!isAgen && (
          <Text style={styles.infoText}>
            *Klik di icon centang biru untuk daftar agen platinum
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderProductList = () => {
    const currentProducts = activeTab === 'pulsa' ? pulsaProducts : dataProducts;

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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image
            source={require('../assets/goback.png')}
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pulsa & Data</Text>
      </View>

      {/* Input Section */}
      <View style={styles.inputSection}>
        {/* Filter Button */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={togglePriceFilter}
        >
          <Text
            style={[
              styles.filterText,
              sortByLowestPrice && styles.filterTextActive,
            ]}
          >
            Harga Terendah
          </Text>
          <Icon
            name="options-outline"
            size={16}
            color={sortByLowestPrice ? '#2F318B' : '#000'}
          />
        </TouchableOpacity>

        {/* Phone Input Label */}
        <Text style={styles.inputLabel}>Masukan Nomor Telepon</Text>

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

      {/* Tabs */}
      {phoneNumber.length >= 10 && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pulsa' && styles.tabActive]}
            onPress={() => setActiveTab('pulsa')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'pulsa' && styles.tabTextActive,
              ]}
            >
              Pulsa
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'data' && styles.tabActive]}
            onPress={() => setActiveTab('data')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'data' && styles.tabTextActive,
              ]}
            >
              Data
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Product List */}
      {renderProductList()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backIcon: {
    width: 31,
    height: 31,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginLeft: 13,
    fontFamily: 'Poppins-SemiBold',
  },
  inputSection: {
    backgroundColor: '#FFF',
    padding: 20,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '300',
    color: '#000',
    marginRight: 6,
    fontFamily: 'Poppins-Light',
  },
  filterTextActive: {
    color: '#2F318B',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#000',
    marginBottom: 12,
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
    borderColor: 'rgba(47, 49, 139, 0.4)',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginRight: 12,
  },
  phoneInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    padding: 0,
    fontFamily: 'Poppins-Medium',
  },
  providerIconSmall: {
    width: 24,
    height: 24,
    marginLeft: 8,
  },
  contactButton: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(47, 49, 139, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactIcon: {
    width: 30,
    height: 30,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#2F318B',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9E9E9E',
    fontFamily: 'Poppins-SemiBold',
  },
  tabTextActive: {
    color: '#2F318B',
  },
  productList: {
    flex: 1,
    padding: 20,
  },
  productCard: {
    marginBottom: 12,
  },
  productCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    minHeight: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(47, 49, 139, 0.2)',
  },
  providerLogoContainer: {
    width: 40,
    height: 40,
    marginRight: 0,
  },
  providerLogo: {
    width: 40,
    height: 40,
  },
  productInfo: {
    flex: 1,
    marginLeft: 0,
  },
  productName: {
    fontSize: 10,
    fontWeight: '300',
    color: '#000',
    marginBottom: 2,
    fontFamily: 'Poppins-Light',
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Poppins-SemiBold',
  },
  verticalDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 3,
  },
  pointContainer: {
    paddingHorizontal: 0,
  },
  pointText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFB800',
    textAlign: 'center',
    fontFamily: 'Poppins-Bold',
  },
  agenSection: {
    paddingLeft: 8,
  },
  agenText: {
    fontSize: 10,
    fontWeight: '400',
    color: '#000',
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },
  agenLabel: {
    fontSize: 9,
    fontWeight: '400',
    color: '#AFAFB2',
    marginBottom: 4,
    fontFamily: 'Poppins-Regular',
  },
  agenPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agenPrice: {
    fontSize: 11,
    fontWeight: '700',
    color: '#AFAFB2',
    marginRight: 20,
    fontFamily: 'Poppins-Bold',
  },
  verifiedIconContainer: {
    width: 18,
    height: 18,
  },
  verifiedIcon: {
    width: 18,
    height: 18,
  },
  infoText: {
    fontSize: 8,
    fontWeight: '300',
    color: '#000',
    fontStyle: 'italic',
    textAlign: 'right',
    marginTop: 4,
    marginRight: 4,
    fontFamily: 'Poppins-LightItalic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
});