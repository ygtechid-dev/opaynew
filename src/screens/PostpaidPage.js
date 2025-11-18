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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../context/APIUrl';
import Contacts from 'react-native-contacts';
import { PermissionsAndroid, Platform } from 'react-native';

export default function PostpaidPage({ navigation, route }) {
  const { title, categoryName } = route.params;

  const [customerNumber, setCustomerNumber] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductName, setSelectedProductName] = useState('');
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [allPostpaidProducts, setAllPostpaidProducts] = useState([]);
  const [uniqueProductTypes, setUniqueProductTypes] = useState([]);
  const [productLogos, setProductLogos] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [billInfo, setBillInfo] = useState(null);
  const [isAgen, setIsAgen] = useState(false);
  const [isLoadingAgen, setIsLoadingAgen] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);

  useEffect(() => {
    console.log('📍 Route Params:', { title, categoryName });
    checkAgenStatus();
    fetchPostpaidProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      filterProductsBySelection();
    } else {
      setFilteredProducts([]);
      setBillInfo(null);
    }
  }, [selectedProduct]);

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

  const fetchPostpaidProducts = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Fetching postpaid products...');
      
      const [productsResponse, newProductsResponse] = await Promise.all([
        axios.get(`${API_URL}/api/products`),
        axios.get(`${API_URL}/api/newproductsppob`),
      ]);

      if (productsResponse.data && newProductsResponse.data) {
        console.log('📦 Total products from API:', productsResponse.data.length);
        
        // Create logo mapping
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

        // Filter produk postpaid
        const postpaidProducts = productsResponse.data.filter(
          (product) => product.product_source === 'postpaid'
        );
        console.log('📦 Postpaid products:', postpaidProducts.length);

        // Filter berdasarkan category_name
        const categoryProducts = postpaidProducts.filter((product) =>
          product.category_name?.toLowerCase().includes(categoryName.toLowerCase())
        );
        console.log(`📦 Products for category "${categoryName}":`, categoryProducts.length);
        
        if (categoryProducts.length > 0) {
          console.log('📋 Sample category product:', {
            id: categoryProducts[0].id,
            product_name: categoryProducts[0].product_name,
            brand_name: categoryProducts[0].brand_name,
            category_name: categoryProducts[0].category_name,
            buyer_sku_code: categoryProducts[0].buyer_sku_code,
          });
        }

        // Combine dengan logo
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
        
        console.log('✅ Postpaid Products with Logo:', productsWithLogo.length);

        setAllPostpaidProducts(productsWithLogo);

        // Get unique brands
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

        console.log('🏷️ Unique Brands:', uniqueBrands.map(b => b.brand_name));
        setUniqueProductTypes(uniqueBrands);
      }
    } catch (error) {
      console.error('❌ Error fetching postpaid products:', error);
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

    console.log('🔍 Filtering products...');
    console.log('Selected Product:', selectedProduct);
    console.log('All Products Count:', allPostpaidProducts.length);

    const filtered = allPostpaidProducts.filter(
      (product) => product.brand_name === selectedProduct
    );

    console.log('✅ Filtered Products Count:', filtered.length);
    if (filtered.length > 0) {
      console.log('📋 First filtered product:', {
        id: filtered[0].id,
        product_name: filtered[0].product_name,
        brand_name: filtered[0].brand_name,
        buyer_sku_code: filtered[0].buyer_sku_code,
      });
    } else {
      console.log('⚠️ No products found for brand:', selectedProduct);
      console.log('Available brands in all products:', 
        [...new Set(allPostpaidProducts.map(p => p.brand_name))]
      );
    }

    setFilteredProducts(filtered);
  };

  const handleCustomerNumberChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setCustomerNumber(cleaned);
    setBillInfo(null);
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

      const contact = await Contacts.openContactPicker();

      if (!contact.phoneNumbers || contact.phoneNumbers.length === 0) {
        Alert.alert('Tidak ada nomor telepon', 'Kontak tidak punya nomor.');
        return;
      }

      let number = contact.phoneNumbers[0].number;
      number = number
        .replace(/\s+/g, '')
        .replace(/-/g, '')
        .replace(/\(/g, '')
        .replace(/\)/g, '')
        .replace(/^\+62/, '0');

      setCustomerNumber(number);
    } catch (error) {
      console.log('Error open contact picker:', error);
    }
  };

  const checkBill = async () => {
    if (!customerNumber || customerNumber.length < 8) {
      Alert.alert('Peringatan', 'Masukkan nomor pelanggan yang valid');
      return;
    }

    if (!selectedProduct) {
      Alert.alert('Peringatan', 'Pilih produk terlebih dahulu');
      return;
    }

    setIsChecking(true);
    setBillInfo(null);
    
    try {
      const selectedProductData = filteredProducts[0];
      
      if (!selectedProductData || !selectedProductData.buyer_sku_code) {
        Alert.alert('Error', 'Produk tidak ditemukan');
        setIsChecking(false);
        return;
      }

      const buyerSkuCode = selectedProductData.buyer_sku_code;
      let response;

      // Cek apakah ini produk PLN
      const isPLN = selectedProductData.category_name?.toLowerCase().includes('pln') ||
                    selectedProductData.brand_name?.toLowerCase().includes('pln');

      if (isPLN) {
        console.log('🔌 Checking PLN bill for:', customerNumber);
        response = await axios.post(`${API_URL}/api/transaction/inquiry-pln`, {
          customer_no: customerNumber,
        });
      } else {
        console.log('📋 Checking postpaid bill:', { customerNumber, buyerSkuCode });
        response = await axios.post(`${API_URL}/api/transaction/inquiry-transaction`, {
          customer_no: customerNumber,
          buyer_sku_code: buyerSkuCode,
          testing: false,
        });
      }

      console.log('📥 Inquiry response:', response.data);

      if (response.data && response.data.success) {
        // Handle PLN response
        if (isPLN && response.data.data) {
          const plnData = response.data.data;
          setBillInfo({
            refId: plnData.ref_id,
            customerName: plnData.customer_name || 'Nama Pelanggan',
            customerNo: plnData.customer_no,
            meterNo: plnData.meter_no || '-',
            subscriberId: plnData.subscriber_id || '-',
            power: plnData.power || '-',
            billAmount: parseFloat(plnData.bill_amount) || 0,
            adminFee: parseFloat(plnData.admin_fee) || 0,
            totalAmount: parseFloat(plnData.total_amount) || 0,
            penalty: parseFloat(plnData.penalty) || 0,
            miscFee: parseFloat(plnData.misc_fee) || 0,
            ppj: parseFloat(plnData.ppj) || 0,
            ppn: parseFloat(plnData.ppn) || 0,
            kwhUsed: plnData.kwh_used || 0,
            dueDate: plnData.due_date || '-',
            period: plnData.period || '-',
            billInfo: plnData.bill_info || [],
            isPLN: true,
          });
        } 
        // Handle general postpaid response
        else if (response.data.digiflazz_response?.data) {
          const responseData = response.data.digiflazz_response.data;
          setBillInfo({
            refId: response.data.ref_id || responseData.ref_id,
            customerName: responseData.customer_name || responseData.nama || 'Nama Pelanggan',
            customerNo: responseData.customer_no || customerNumber,
            billAmount: parseFloat(responseData.price || responseData.selling_price) || 0,
            adminFee: parseFloat(responseData.admin || responseData.admin_fee) || 0,
            totalAmount: parseFloat(responseData.selling_price || responseData.price) || 0,
            dueDate: responseData.due_date || responseData.jatuh_tempo || '-',
            period: responseData.desc?.periode || responseData.period || '-',
            productName: responseData.product_name || selectedProductData.product_name,
            isPLN: false,
          });
        } else {
          throw new Error('Data tagihan tidak valid');
        }

        Alert.alert('Sukses', 'Tagihan berhasil ditemukan');
      } else {
        const errorMessage = response.data?.message || 'Tagihan tidak ditemukan';
        Alert.alert('Info', errorMessage);
        setBillInfo(null);
      }
    } catch (error) {
      console.error('❌ Error checking bill:', error);
      
      let errorMessage = 'Gagal mengecek tagihan';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Error', errorMessage);
      setBillInfo(null);
    } finally {
      setIsChecking(false);
    }
  };

  const formatPrice = (price) => {
    const priceDouble = parseFloat(price) || 0;
    return `Rp ${priceDouble.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
  };

  const navigateToPayment = () => {
    if (!billInfo) {
      Alert.alert('Peringatan', 'Cek tagihan terlebih dahulu');
      return;
    }

    navigation.navigate('PaymentDetailPage', {
      product: {
        ...filteredProducts[0],
        product_name: `${selectedProductName} - ${billInfo.period}`,
        price: billInfo.totalAmount,
      },
      customerNumber,
      provider: selectedProductName,
      providerLogo: filteredProducts[0]?.logo_uri,
      billInfo: billInfo,
      isPostpaid: true,
    });
  };

  const openProductModal = () => {
    setShowProductModal(true);
  };

  const selectProductFromModal = (brandName) => {
    console.log('🎯 Product selected from modal:', brandName);
    setSelectedProduct(brandName);
    setSelectedProductName(brandName);
    setBillInfo(null);
    setShowProductModal(false);
  };

  const renderBillInfo = () => {
    if (!billInfo) return null;

    const displayAdminFee = isAgen ? 0 : billInfo.adminFee;
    const displayTotal = isAgen 
      ? billInfo.billAmount 
      : billInfo.totalAmount;

    return (
      <View style={styles.billInfoCard}>
        <View style={styles.billInfoHeader}>
          <Icon name="document-text" size={24} color="#2F318B" />
          <Text style={styles.billInfoTitle}>Informasi Tagihan</Text>
        </View>

        <View style={styles.billInfoDivider} />

        {/* Customer Info */}
        <View style={styles.billInfoRow}>
          <Text style={styles.billInfoLabel}>Nama Pelanggan</Text>
          <Text style={styles.billInfoValue}>{billInfo.customerName}</Text>
        </View>

        <View style={styles.billInfoRow}>
          <Text style={styles.billInfoLabel}>No. Pelanggan</Text>
          <Text style={styles.billInfoValue}>{billInfo.customerNo || customerNumber}</Text>
        </View>

        {/* PLN Specific Info */}
        {billInfo.isPLN && (
          <>
            {billInfo.meterNo && billInfo.meterNo !== '-' && (
              <View style={styles.billInfoRow}>
                <Text style={styles.billInfoLabel}>No. Meter</Text>
                <Text style={styles.billInfoValue}>{billInfo.meterNo}</Text>
              </View>
            )}
            
            {billInfo.power && billInfo.power !== '-' && (
              <View style={styles.billInfoRow}>
                <Text style={styles.billInfoLabel}>Daya</Text>
                <Text style={styles.billInfoValue}>{billInfo.power}</Text>
              </View>
            )}

            {billInfo.kwhUsed > 0 && (
              <View style={styles.billInfoRow}>
                <Text style={styles.billInfoLabel}>Pemakaian</Text>
                <Text style={styles.billInfoValue}>{billInfo.kwhUsed} kWh</Text>
              </View>
            )}
          </>
        )}

        <View style={styles.billInfoRow}>
          <Text style={styles.billInfoLabel}>Periode</Text>
          <Text style={styles.billInfoValue}>{billInfo.period}</Text>
        </View>

        {billInfo.dueDate && billInfo.dueDate !== '-' && (
          <View style={styles.billInfoRow}>
            <Text style={styles.billInfoLabel}>Jatuh Tempo</Text>
            <Text style={styles.billInfoValue}>{billInfo.dueDate}</Text>
          </View>
        )}

        <View style={styles.billInfoDivider} />

        {/* Billing Details */}
        <View style={styles.billInfoRow}>
          <Text style={styles.billInfoLabel}>Tagihan</Text>
          <Text style={styles.billInfoValueBold}>
            {formatPrice(billInfo.billAmount)}
          </Text>
        </View>

        {/* PLN Additional Fees */}
        {billInfo.isPLN && (
          <>
            {billInfo.penalty > 0 && (
              <View style={styles.billInfoRow}>
                <Text style={styles.billInfoLabel}>Denda</Text>
                <Text style={styles.billInfoValue}>
                  {formatPrice(billInfo.penalty)}
                </Text>
              </View>
            )}

            {billInfo.ppj > 0 && (
              <View style={styles.billInfoRow}>
                <Text style={styles.billInfoLabel}>PPJ</Text>
                <Text style={styles.billInfoValue}>
                  {formatPrice(billInfo.ppj)}
                </Text>
              </View>
            )}

            {billInfo.ppn > 0 && (
              <View style={styles.billInfoRow}>
                <Text style={styles.billInfoLabel}>PPN</Text>
                <Text style={styles.billInfoValue}>
                  {formatPrice(billInfo.ppn)}
                </Text>
              </View>
            )}

            {billInfo.miscFee > 0 && (
              <View style={styles.billInfoRow}>
                <Text style={styles.billInfoLabel}>Biaya Lain</Text>
                <Text style={styles.billInfoValue}>
                  {formatPrice(billInfo.miscFee)}
                </Text>
              </View>
            )}
          </>
        )}

        {!isAgen && displayAdminFee > 0 && (
          <View style={styles.billInfoRow}>
            <Text style={styles.billInfoLabel}>Biaya Admin</Text>
            <Text style={styles.billInfoValue}>
              {formatPrice(displayAdminFee)}
            </Text>
          </View>
        )}

        <View style={styles.billInfoDivider} />

        <View style={styles.billInfoRow}>
          <Text style={styles.billInfoTotalLabel}>Total Bayar</Text>
          <Text style={styles.billInfoTotal}>
            {formatPrice(displayTotal)}
          </Text>
        </View>

        {isAgen && (
          <View style={styles.agenBadge}>
            <Image
              source={require('../assets/verified.png')}
              style={styles.agenBadgeIcon}
            />
            <Text style={styles.agenBadgeText}>
              Harga Agen Platinum - Bebas Biaya Admin
            </Text>
          </View>
        )}

        {/* Ref ID untuk tracking */}
        {billInfo.refId && (
          <View style={styles.refIdContainer}>
            <Text style={styles.refIdLabel}>Ref ID: </Text>
            <Text style={styles.refIdValue}>{billInfo.refId}</Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.payButton}
          onPress={navigateToPayment}
        >
          <Text style={styles.payButtonText}>Bayar Sekarang</Text>
        </TouchableOpacity>
      </View>
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

  return (
    <View style={styles.container}>
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

          {/* Customer Number Input */}
          <Text style={styles.inputLabel}>Masukkan Nomor Pelanggan</Text>
          <View style={styles.inputRow}>
            <View style={styles.phoneInputContainer}>
              <TextInput
                style={styles.phoneInput}
                placeholder="Nomor Pelanggan / ID Pelanggan"
                placeholderTextColor="#BAB0B0"
                value={customerNumber}
                onChangeText={handleCustomerNumberChange}
                keyboardType="numeric"
                maxLength={20}
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

          {/* Check Bill Button */}
          {selectedProduct && customerNumber.length >= 8 && (
            <TouchableOpacity 
              style={styles.checkButton}
              onPress={checkBill}
              disabled={isChecking}
            >
              {isChecking ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Icon name="search" size={20} color="#FFF" />
                  <Text style={styles.checkButtonText}>Cek Tagihan</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Bill Info Section */}
        {billInfo && (
          <View style={styles.billInfoWrapper}>
            {renderBillInfo()}
          </View>
        )}

        {/* Empty State */}
        {!selectedProduct && (
          <View style={styles.emptyState}>
            <Icon name="card-outline" size={80} color="#E0E0E0" />
            <Text style={styles.emptyStateText}>
              Pilih produk terlebih dahulu untuk melanjutkan
            </Text>
          </View>
        )}

        {selectedProduct && !billInfo && !isChecking && (
          <View style={styles.emptyState}>
            <Icon name="document-text-outline" size={80} color="#E0E0E0" />
            <Text style={styles.emptyStateText}>
              Masukkan nomor pelanggan dan cek tagihan
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Product Modal */}
      {renderProductModal()}
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
    marginBottom: 20,
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
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2F318B',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 10,
  },
  checkButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Poppins-SemiBold',
  },
  billInfoWrapper: {
    padding: 20,
    paddingTop: 0,
  },
  billInfoCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  billInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  billInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2F318B',
    marginLeft: 12,
    fontFamily: 'Poppins-SemiBold',
  },
  billInfoDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  billInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  billInfoLabel: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins-Regular',
  },
  billInfoValue: {
    fontSize: 14,
    color: '#000',
    fontFamily: 'Poppins-Regular',
  },
  billInfoValueBold: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Poppins-SemiBold',
  },
  billInfoTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Poppins-SemiBold',
  },
  billInfoTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2F318B',
    fontFamily: 'Poppins-Bold',
  },
  agenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  agenBadgeIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  agenBadgeText: {
    fontSize: 12,
    color: '#2F318B',
    flex: 1,
    fontFamily: 'Poppins-SemiBold',
  },
  refIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  refIdLabel: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'Poppins-Regular',
  },
  refIdValue: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Poppins-SemiBold',
  },
  payButton: {
    backgroundColor: '#2F318B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Poppins-SemiBold',
  },
  emptyState: {
      height: '500',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#BDBDBD',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 20,
    fontFamily: 'Poppins-Regular',
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
  modalItemImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
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
});