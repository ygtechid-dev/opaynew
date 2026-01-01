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
  Modal,
  FlatList,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../context/APIUrl';
import Contacts from 'react-native-contacts';
import { PermissionsAndroid, Platform } from 'react-native';

export default function PrepaidPage({ navigation, route }) {
  const { title, categoryName } = route.params;

  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductName, setSelectedProductName] = useState('');
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [allPrepaidProducts, setAllPrepaidProducts] = useState([]);
  const [uniqueProductTypes, setUniqueProductTypes] = useState([]);
  const [productLogos, setProductLogos] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isAgen, setIsAgen] = useState(false);
  const [isLoadingAgen, setIsLoadingAgen] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  
  // State untuk contact picker
  const [contacts, setContacts] = useState([]);
  const [showContactModal, setShowContactModal] = useState(false);
  const [searchContact, setSearchContact] = useState('');

  useEffect(() => {
    checkAgenStatus();
    fetchPrepaidProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct && phoneNumber.length >= 5) {
      filterProductsBySelection();
    } else {
      setFilteredProducts([]);
    }
  }, [selectedProduct, phoneNumber]);

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

      if (response.data.data && response.data.data.length > 0) {
        setIsAgen(true);
      } else {
        setIsAgen(false);
      }
    } catch (error) {
      setIsAgen(false);
    } finally {
      setIsLoadingAgen(false);
    }
  };

  const fetchPrepaidProducts = async () => {
    setIsLoading(true);
    try {
      const [productsResponse, newProductsResponse] = await Promise.all([
        axios.get(`${API_URL}/api/products`),
        axios.get(`${API_URL}/api/newproductsppob`),
      ]);

      if (productsResponse.data && newProductsResponse.data) {
        const logoMap = {};
        newProductsResponse.data.forEach((newProduct) => {
          if (newProduct.buyerSkuCode && newProduct.logo_uri) {
            logoMap[newProduct.buyerSkuCode.toLowerCase()] = {
              logo_uri: newProduct.logo_uri,
              backgroundColor: newProduct.backgroundColor,
            };
          }
        });

        setProductLogos(logoMap);

        const prepaidProducts = productsResponse.data.filter(
          (product) => product.product_source === 'prepaid'
        );

        const categoryProducts = prepaidProducts.filter((product) =>
          categoryName.toLowerCase().includes(product.category_name?.toLowerCase())
        );

        const productsWithLogo = categoryProducts.map((product) => {
          const buyerSkuPrefix = product.buyer_sku_code?.toLowerCase() || '';
          
          let matchedLogo = null;
          for (const [key, value] of Object.entries(logoMap)) {
            if (buyerSkuPrefix.includes(key) || key.includes(buyerSkuPrefix.split(/\d/)[0])) {
              matchedLogo = value;
              break;
            }
          }

          return {
            ...product,
            logo_uri: matchedLogo?.logo_uri || null,
            backgroundColor: matchedLogo?.backgroundColor || '#2F318B',
          };
        });

        setAllPrepaidProducts(productsWithLogo);

        const uniqueBrands = [];
        productsWithLogo.forEach((p) => {
          if (!uniqueBrands.some((b) => b.brand_name === p.brand_name)) {
            uniqueBrands.push({
              brand_name: p.brand_name,
              logo_uri: p.logo_uri,
              backgroundColor: p.backgroundColor,
            });
          }
        });

        setUniqueProductTypes(uniqueBrands);
      }
    } catch (error) {
      console.error('Error fetching prepaid products:', error);
      Alert.alert('Error', 'Gagal memuat produk');
    } finally {
      setIsLoading(false);
    }
  };

  const filterProductsBySelection = () => {
    if (!selectedProduct) {
      setFilteredProducts([]);
      return;
    }

    const filtered = allPrepaidProducts.filter(
      (product) => product.brand_name === selectedProduct
    );

    setFilteredProducts(filtered);
  };

  const handlePhoneChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setPhoneNumber(cleaned);
  };

  const openContactPicker = async () => {
    try {
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

      Contacts.getAll()
        .then(allContacts => {
          const contactsWithPhone = allContacts.filter(
            contact => contact.phoneNumbers && contact.phoneNumbers.length > 0
          );
          
          contactsWithPhone.sort((a, b) => {
            const nameA = a.displayName || a.givenName || '';
            const nameB = b.displayName || b.givenName || '';
            return nameA.localeCompare(nameB);
          });
          
          setContacts(contactsWithPhone);
          setShowContactModal(true);
        })
        .catch(error => {
          console.error('Error getting contacts:', error);
          Alert.alert('Error', 'Gagal mengambil daftar kontak');
        });

    } catch (error) {
      console.log('Error open contact picker:', error);
      Alert.alert('Error', 'Terjadi kesalahan: ' + error.message);
    }
  };

  const selectContact = (contact) => {
    if (!contact.phoneNumbers || contact.phoneNumbers.length === 0) {
      Alert.alert('Tidak ada nomor', 'Kontak ini tidak memiliki nomor telepon');
      return;
    }

    let number = contact.phoneNumbers[0].number;
    number = number
      .replace(/\s+/g, '')
      .replace(/-/g, '')
      .replace(/\(/g, '')
      .replace(/\)/g, '')
      .replace(/\+/g, '')
      .replace(/^62/, '0');

    setPhoneNumber(number);
    setShowContactModal(false);
    setSearchContact('');
  };

  const formatPrice = (price) => {
    const priceDouble = parseFloat(price) || 0;
    return `Rp ${priceDouble.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
  };

  const navigateToPayment = (product) => {
    if (!phoneNumber) {
      Alert.alert('Peringatan', 'Masukkan nomor pengguna yang valid');
      return;
    }

    navigation.navigate('PaymentDetailPage', {
      product,
      phoneNumber,
      provider: product.brand_name,
      providerLogo: product.logo_uri,
    });
  };

  const openProductModal = () => {
    setShowProductModal(true);
  };

  const selectProductFromModal = (brandName) => {
    setSelectedProduct(brandName);
    setSelectedProductName(brandName);
    setShowProductModal(false);
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
          <View style={styles.leftSection}>
            {product.logo_uri ? (
              <Image
                source={{ uri: product.logo_uri }}
                style={styles.productLogo}
                resizeMode="contain"
              />
            ) : (
              <View
                style={[
                  styles.productLogoPlaceholder,
                  { backgroundColor: product.backgroundColor || '#2F318B' },
                ]}
              >
                <Text style={styles.productLogoText}>
                  {product.brand_name?.charAt(0) || 'P'}
                </Text>
              </View>
            )}

            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>
                {productName}
              </Text>
              <Text style={styles.productPrice}>{displayPrice}</Text>
            </View>
          </View>

          <View style={styles.verticalDivider} />

          {isAgen ? (
            <View style={styles.rightSection}>
              <View style={{ flexDirection: 'row' }}>
                <View>
                  <Text style={styles.agenLabel}>
                    Anda mendapatkan{'\n'}Harga{' '}
                    <Text style={styles.agenPlatinum}>Agen Platinum</Text>
                  </Text>
                </View>
                <Image
                  source={require('../assets/verified.png')}
                  style={{ width: 20, height: 20, marginLeft: 10 }}
                />
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.rightSection} onPress={() => navigation.push('DaftarAgenPage')}>
              <View>
                <Text style={styles.agenLabel}>
                  Daftar Agen Platinum,{'\n'}dapatkan harga murah
                </Text>
                <View style={{ flexDirection: 'row' }}>
                  <Text style={styles.agenPrice}>{agenPrice}</Text>
                  <View style={styles.arrowContainer}>
                    <Icon name="play" size={14} color="white" />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderProductList = () => {
    if (phoneNumber.length < 5 || !selectedProduct) {
      return (
        <View style={styles.emptyState}>
          <Icon name="card-outline" size={80} color="#E0E0E0" />
          <Text style={styles.emptyStateText}>
            {!selectedProduct
              ? 'Pilih produk terlebih dahulu'
              : 'Silakan masukkan nomor telepon untuk\nmelihat produk yang tersedia'}
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

    if (filteredProducts.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Icon name="cube-outline" size={64} color="#BDBDBD" />
          <Text style={styles.emptyStateText}>
            Tidak ada produk tersedia untuk {selectedProductName}
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
        {filteredProducts.map((product) => renderProductCard(product))}
        <View style={{ height: 20 }} />
      </ScrollView>
    );
  };

  // Filter contacts
  const filteredContacts = contacts.filter(contact => {
    const displayName = contact.displayName || contact.givenName || '';
    const phoneNumber = contact.phoneNumbers?.[0]?.number || '';
    
    return (
      displayName.toLowerCase().includes(searchContact.toLowerCase()) ||
      phoneNumber.includes(searchContact)
    );
  });

  const renderContactItem = ({ item }) => {
    const displayName = item.displayName || item.givenName || 'No Name';
    const phoneNumber = item.phoneNumbers?.[0]?.number || '';
    
    return (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => selectContact(item)}
      >
        <View style={styles.contactAvatar}>
          <Text style={styles.contactAvatarText}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{displayName}</Text>
          <Text style={styles.contactPhone}>{phoneNumber}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderProductModal = () => {
    return (
      <Modal
        visible={showProductModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowProductModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Produk</Text>
              <TouchableOpacity onPress={() => setShowProductModal(false)}>
                <Icon name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={uniqueProductTypes}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => selectProductFromModal(item.brand_name)}
                >
                  <View style={styles.modalItemLeft}>
                    <View style={styles.modalItemIcon}>
                      {item.logo_uri ? (
                        <Image
                          source={{ uri: item.logo_uri }}
                          style={styles.modalItemImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <Text style={styles.modalItemIconText}>
                          {item.brand_name.charAt(0)}
                        </Text>
                      )}
                    </View>

                    <Text style={styles.modalItemText}>{item.brand_name}</Text>
                  </View>

                  <Icon name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.modalDivider} />}
            />
          </View>
        </View>
      </Modal>
    );
  };

  // Contact Modal
  const renderContactModal = () => {
    return (
      <Modal
        visible={showContactModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowContactModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.contactModalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Kontak</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowContactModal(false);
                  setSearchContact('');
                }}
              >
                <Icon name="close" size={28} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari nama atau nomor..."
                placeholderTextColor="#999"
                value={searchContact}
                onChangeText={setSearchContact}
              />
            </View>

            {/* Contact List */}
            <FlatList
              data={filteredContacts}
              renderItem={renderContactItem}
              keyExtractor={(item) => item.recordID}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContactState}>
                  <Icon name="people-outline" size={64} color="#BDBDBD" />
                  <Text style={styles.emptyContactText}>
                    Tidak ada kontak ditemukan
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    );
  };

  return (
  <KeyboardAvoidingView
    style={styles.container}
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
  >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      {/* Content */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Input Section */}
        <View style={styles.inputSection}>
          {/* Product Selector */}
          <Text style={styles.inputLabel}>Pilih Produk</Text>
          <TouchableOpacity style={styles.productSelector} onPress={openProductModal}>
            <Text
              style={[
                styles.productSelectorText,
                !selectedProductName && styles.productSelectorPlaceholder,
              ]}
            >
              {selectedProductName || 'Pilih Produk'}
            </Text>
            <View style={styles.productSelectorRight}>
              <Icon name="chevron-down" size={20} color="#BAB0B0" />
              <Image
                source={require('../assets/search.png')}
                style={styles.searchIcon}
                resizeMode="contain"
              />
            </View>
          </TouchableOpacity>

          {/* Phone Number Input */}
          <Text style={styles.inputLabel}>Masukkan No. Pelanggan</Text>
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
            </View>

            <TouchableOpacity style={styles.contactButton} onPress={openContactPicker}>
              <Image
                source={require('../assets/bookuser.png')}
                style={styles.contactIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Product List */}
        <View style={styles.productListWrapper}>{renderProductList()}</View>
      </ScrollView>

      {/* Product Modal */}
      {renderProductModal()}

      {/* Contact Modal */}
      {renderContactModal()}
    </KeyboardAvoidingView>
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
  productSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(47, 49, 139, 0.3)',
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 20,
  },
  modalItemImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  productSelectorText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000',
    fontFamily: 'Poppins-Regular',
  },
  productSelectorPlaceholder: {
    color: '#BAB0B0',
  },
  productSelectorRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchIcon: {
    width: 20,
    height: 20,
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
    borderTopRightRadius: 50,
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
  productLogo: {
    width: 45,
    height: 55,
    marginRight: 8,
    borderRadius: 8,
  },
  productLogoPlaceholder: {
    width: 45,
    height: 55,
    borderRadius: 12,
    backgroundColor: '#2F318B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  productLogoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Poppins-Bold',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 9,
    color: '#000',
    marginBottom: 0,
    fontFamily: 'Poppins-Regular',
    flexWrap: 'wrap',
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
    marginLeft: 30,
  },
  emptyState: {
    height: '500',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'Poppins-Bold',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalItemIconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Poppins-Bold',
  },
  modalItemText: {
    fontSize: 16,
    color: '#000',
    fontFamily: 'Poppins-Regular',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 20,
  },
  // Contact Modal Styles
  contactModalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    marginHorizontal: 20,
    marginVertical: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    marginLeft: 10,
    fontFamily: 'Poppins-Regular',
    padding: 0,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2F318B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  contactAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Poppins-SemiBold',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
    fontFamily: 'Poppins-Medium',
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins-Regular',
  },
  emptyContactState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyContactText: {
    fontSize: 14,
    color: '#BDBDBD',
    marginTop: 16,
    fontFamily: 'Poppins-Regular',
  },
});