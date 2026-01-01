import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Modal,
  Alert,
  TextInput,
  FlatList,
  Clipboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL, API_URL_PROD } from '../context/APIUrl';



export default function AllTransactionPage({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState('Semua');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  const [isAgen, setIsAgen] = useState(false);
  const [isLoadingAgen, setIsLoadingAgen] = useState(true);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  const [refreshingTransactions, setRefreshingTransactions] = useState(new Set());
  const [loyaltyPointsAdded, setLoyaltyPointsAdded] = useState(new Set());
  const [fundRefunded, setFundRefunded] = useState(new Set());

  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const autoRefreshInterval = useRef(null);

  const statusOptions = ['Semua', 'Success', 'Pending', 'Failed'];
  const categoryOptions = ['Semua', 'Pulsa', 'Data', 'PLN', 'Game', 'Lainnya'];

  useEffect(() => {
    checkAgenStatus();
    loadTransactions(true);

    return () => {
      stopAutoRefresh();
    };
  }, []);

  useEffect(() => {
    if (autoRefreshEnabled) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }

    return () => {
      stopAutoRefresh();
    };
  }, [autoRefreshEnabled, transactions]);

  // Auto Refresh Functions
  const startAutoRefresh = () => {
    stopAutoRefresh();
    autoRefreshInterval.current = setInterval(() => {
      autoRefreshPendingTransactions();
    }, 3000);
  };

  const stopAutoRefresh = () => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
      autoRefreshInterval.current = null;
    }
  };

  const autoRefreshPendingTransactions = () => {
    const pendingTransactions = transactions.filter(
      (t) => t.status.toLowerCase() === 'pending' && !refreshingTransactions.has(t.refId)
    );

    pendingTransactions.forEach((transaction) => {
      refreshSingleTransaction(transaction, true);
    });
  };

  // Check Agen Status
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

      setIsAgen(response.data.status === true && response.data.data?.length > 0);
      setIsLoadingAgen(false);
    } catch (error) {
      setIsAgen(false);
      setIsLoadingAgen(false);
    }
  };

  // Load Transactions
  const loadTransactions = async (refresh = false) => {
    try {
      if (refresh) {
        setIsLoading(true);
        setErrorMessage(null);
        setTransactions([]);
      }

      const userJson = await AsyncStorage.getItem('userData');
      if (!userJson) {
        setErrorMessage('Silakan login terlebih dahulu');
        setIsLoading(false);
        return;
      }

      const userObj = JSON.parse(userJson);
      console.log('User ID:', userObj.id);

      const response = await axios.get(`${API_URL}/api/order-transaction`);
      console.log('📋 Transactions API Response:', response.data);

      if (response.data && Array.isArray(response.data.data)) {
        const list = response.data.data;

        // Filter transaksi berdasarkan user ID
        const userTransactions = list.filter(
          (transaction) => transaction.user?.id == userObj.id
        );

        // Sort by created_at descending (newest first)
        const sortedTransactions = userTransactions.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        // Transform data ke format yang sesuai
        const transformedTransactions = sortedTransactions.map((item) => ({
          id: item.id || 0,
          refId: item.ref_id || '',
          productName: item.product?.name || '',
          categoryName: item.product?.category || '',
          brandName: item.product?.brand || '',
          customerNo: item.customer_no || '',
          price: parseFloat(item.ppob_details?.price || item.product?.price || '0'),
          status: item.status || 'PENDING',
          message: item.ppob_details?.message || '',
          sn: item.ppob_details?.serial_number || '',
          createdAt: item.created_at || new Date().toISOString(),
          buyerSkuCode: item.buyer_sku_code || '',
        }));

        setTransactions(transformedTransactions);
      } else {
        setTransactions([]);
      }

      setIsLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('❌ Error loading transactions:', error);
      setErrorMessage(`Error: ${error.message}`);
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions(true);
  };

  // Get Product Data
  const getProductData = async (buyerSkuCode) => {
    try {
      const response = await axios.get(`${API_URL}/api/products`, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.status === 200) {
        const products = response.data;
        const product = products.find((p) => p.buyer_sku_code === buyerSkuCode);
        return product || null;
      }
    } catch (error) {
      console.error('Error fetching product data:', error);
    }
    return null;
  };

  // Get Correct Price
  const getCorrectPriceForTransaction = (transaction, productData) => {
    if (!productData) {
      return transaction.price;
    }

    const typeName = productData.type_name?.toString().toLowerCase() || '';

    if (typeName === 'pascabayar') {
      return parseFloat(productData.price?.toString() || '0') || transaction.price;
    }

    if (isAgen) {
      return parseFloat(productData.price?.toString() || '0') || transaction.price;
    } else {
      return (
        parseFloat(
          productData.priceTierTwo?.toString() || productData.price?.toString() || '0'
        ) || transaction.price
      );
    }
  };

  // Get Nominal Point
  const getNominalPointFromProducts = async (buyerSkuCode) => {
    try {
      const response = await axios.get(`${API_URL}/api/products`, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.status === 200) {
        const products = response.data;
        const product = products.find((p) => p.buyer_sku_code === buyerSkuCode);

        if (product && product.nominal_point) {
          return parseInt(product.nominal_point.toString()) || 0;
        }
      }
    } catch (error) {
      console.error('Error fetching nominal point:', error);
    }
    return 10;
  };

  // Add Fund to Wallet (Refund)
  const addFundToWallet = async (amount, refId) => {
  try {
    console.log("🟡 [REFUND] Checking refund for:", refId);

    // 1️⃣ CEK STATE (dalam sesi)
    if (fundRefunded.has(refId)) {
      console.log("⚠️ [REFUND] Already refunded (state)");
      return true;
    }

    // 2️⃣ CEK ASYNCSTORAGE (persisten)
    const refundedKey = `refund_${refId}`;
    const refundedBefore = await AsyncStorage.getItem(refundedKey);

    if (refundedBefore === "true") {
      console.log("⚠️ [REFUND] Already refunded (AsyncStorage)");
      // Sinkronisasi state agar UI aware
      setFundRefunded(prev => new Set([...prev, refId]));
      return true;
    }

    console.log("🔥 [REFUND] Processing refund:", amount);

    // 3️⃣ Ambil user
    const userData = await AsyncStorage.getItem('userData');
    if (!userData) return false;

    const userObj = JSON.parse(userData);

    // 4️⃣ Panggil API untuk refund
    const response = await axios.post(`${API_URL}/api/wallet-transactions/add`, {
      customer_id: userObj.id,
      amount: amount,
      referance: refId,
      payment_method: 'QRIS',
    });

    if (response.data.success) {
      console.log("🟢 [REFUND] Refund SUCCESS for:", refId);

      // Simpan ke STATE + STORAGE
      setFundRefunded(prev => new Set([...prev, refId]));
      await AsyncStorage.setItem(refundedKey, "true");

      return true;
    } else {
      console.log("❌ [REFUND] API refund failed:", response.data);
      return false;
    }

  } catch (error) {
    console.error("❌ [REFUND] Error during refund:", error.response?.data || error);
    return false;
  }
};


  // Add Loyalty Points
  const addLoyaltyPoints = async (refId, nominalPoint) => {
    try {
      if (loyaltyPointsAdded.has(refId)) {
        console.log('Loyalty points already added for transaction:', refId);
        return true;
      }

      const userJson = await AsyncStorage.getItem('userData');
      if (!userJson) {
        console.log('User data is null, cannot add loyalty points');
        return false;
      }

      const userObj = JSON.parse(userJson);
      const userId = userObj.id;

      const response = await axios.post(
        `${API_URL}/api/add-loyalty-point`,
        {
          point: nominalPoint,
          user_id: parseInt(userId),
          ref_id: refId,
          source: 'ppob_transaction',
          type: 'add',
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200) {
        console.log('Loyalty points added successfully:', nominalPoint, 'points for', refId);
        setLoyaltyPointsAdded((prev) => new Set(prev).add(refId));
        return true;
      } else {
        console.log('Failed to add loyalty points:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Error adding loyalty points:', error);
      return false;
    }
  };

  // Update Transaction Status in Database
 const updateTransactionStatusInDatabase = async (
  refId,
  status,
  message,
  sn,
  price
) => {
  try {
    const body = {};

    if (status) body.status = status;
    if (message) body.message = message;
    if (sn) body.serial_number = sn;
    if (price) body.price = price;

    // Buyer_last_saldo default (bisa diisi sesuai kebutuhan)
    body.buyer_last_saldo = 0;

    console.log("🔥 Update PPOB Payload FE:", body);

    const response = await axios.put(
      `${API_URL}/api/order-transaction/${refId}`,
      body,
      { headers: { 'Content-Type': 'application/json' } }
    );

    console.log("🟢 Update PPOB Response:", response.data);

    return response.data.success === true;
  } catch (error) {
    console.error('❌ Error updating transaction status FE:', error.response?.data || error);
    return false;
  }
};


  // Refresh Single Transaction
  const refreshSingleTransaction = async (transaction, isAutoRefresh = false) => {
    if (refreshingTransactions.has(transaction.refId)) return;

    setRefreshingTransactions((prev) => new Set(prev).add(transaction.refId));
   const userJson = await AsyncStorage.getItem('userData');
    

      const userObj = JSON.parse(userJson);
      const userId = userObj.id;
    try {
      const response = await axios.post(
        `${API_URL_PROD}/api/check-transaction`,
        {
          customer_no: transaction.customerNo,
          buyer_sku_code: transaction.buyerSkuCode || '',
          ref_id: transaction.refId,
          testing: false,
          user_id: userId
        },
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (response.status === 200) {
        const responseData = response.data;

        let newStatus = 'PENDING';
        let newMessage = null;
        let newSn = null;

        if (responseData.digiflazz_response?.data) {
          const data = responseData.digiflazz_response.data;
          newStatus = data.status?.toString().toUpperCase() || 'PENDING';
          newMessage = data.message?.toString();
          newSn = data.sn?.toString();
        } else if (responseData.transaction_status) {
          newStatus = responseData.transaction_status.toString().toUpperCase();
        }

        if (newStatus !== transaction.status.toUpperCase()) {
          console.log(
            `🔄 Status changed from ${transaction.status} to ${newStatus} for ${transaction.refId}`
          );

          const productData = await getProductData(transaction.buyerSkuCode || '');
          const correctPrice = getCorrectPriceForTransaction(transaction, productData);

          await updateTransactionStatusInDatabase(
            transaction.refId,
            newStatus,
            newMessage,
            newSn,
            correctPrice
          );

          // FLOW BARU
          if (newStatus === 'SUCCESS' || newStatus === 'SUKSES') {
            console.log('✅ Transaction SUCCESS - No action needed (already deducted)');

            // Hanya tambahkan loyalty points
            if (!loyaltyPointsAdded.has(transaction.refId)) {
              console.log('✅ Starting loyalty points process for', transaction.refId);
              try {
                const nominalPoint = await getNominalPointFromProducts(
                  transaction.buyerSkuCode || ''
                );
                console.log('🎁 Nominal point retrieved:', nominalPoint);

                if (nominalPoint > 0) {
                  console.log('💎 Adding', nominalPoint, 'loyalty points for', transaction.refId);
              
                } else {
                  console.log('⚠️ Nominal point is 0 or negative, skipping loyalty points');
                }
              } catch (error) {
                console.error('❌ Error adding loyalty points:', error);
              }
            }
          } else if (newStatus === 'FAILED' || newStatus === 'GAGAL') {
            console.log('❌ Transaction FAILED - Refunding amount...');

            if (!fundRefunded.has(transaction.refId)) {
              console.log('💰 Refunding', correctPrice, 'to wallet...');
              const refundSuccess = await addFundToWallet(correctPrice, transaction.refId);

              if (refundSuccess) {
                console.log('✅ Fund refunded successfully');

                if (!isAutoRefresh) {
                  Alert.alert(
                    'Refund Berhasil',
                    `Rp${formatCurrency(correctPrice)} telah dikembalikan ke saldo Anda`
                  );
                }
              } else {
                console.log('⚠️ Failed to refund');
              }
            }
          }

          // Update transaction in list
          setTransactions((prev) =>
            prev.map((t) =>
              t.refId === transaction.refId
                ? {
                    ...t,
                    status: newStatus,
                    message: newMessage || t.message,
                    sn: newSn || t.sn,
                  }
                : t
            )
          );

          if (!isAutoRefresh) {
            let message = `Status transaksi diperbarui: ${newStatus}`;
            if (newStatus === 'SUCCESS' || newStatus === 'SUKSES') {
              message = 'Transaksi berhasil!';
            } else if (newStatus === 'FAILED' || newStatus === 'GAGAL') {
              message = 'Transaksi gagal, saldo telah dikembalikan';
            }
            // Alert.alert('Info', message);
          }
        }
      }
    } catch (error) {
      if (!isAutoRefresh) {
        Alert.alert('Error', `Error mengecek status: ${error.message}`);
      }
    } finally {
      setRefreshingTransactions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(transaction.refId);
        return newSet;
      });
    }
  };

  // Check if PLN Product
  const isPLNProduct = (transaction) => {
    const productName = transaction.productName.toUpperCase();
    const buyerSkuCode = transaction.buyerSkuCode?.toUpperCase() || '';

    return (
      productName.includes('PLN') ||
      productName.includes('TOKEN') ||
      productName.includes('LISTRIK') ||
      buyerSkuCode.includes('PLN')
    );
  };

  // Extract PLN Token
  const extractPLNToken = (sn) => {
    if (!sn) return '';
    const parts = sn.split('/');
    if (parts.length > 0) {
      return parts[0].trim();
    }
    return '';
  };

  // Filter Transactions
  const getFilteredTransactions = () => {
    return transactions.filter((transaction) => {
      const statusMatch =
        selectedStatus === 'Semua' ||
        transaction.status.toLowerCase() === selectedStatus.toLowerCase();

      const categoryMatch =
        selectedCategory === 'Semua' || transaction.categoryName === selectedCategory;

      const searchMatch =
        searchQuery === '' ||
        transaction.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.customerNo.includes(searchQuery) ||
        transaction.refId.toLowerCase().includes(searchQuery.toLowerCase());

      return statusMatch && categoryMatch && searchMatch;
    });
  };

  // Format Currency
  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount);
    return numAmount.toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  // Format Date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Agu',
      'Sep',
      'Okt',
      'Nov',
      'Des',
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} ${date
      .getHours()
      .toString()
      .padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // Get Status Color
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'success':
      case 'sukses':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'failed':
      case 'gagal':
        return '#EF4444';
      default:
        return '#9CA3AF';
    }
  };

  // Render Shimmer Loading
  const renderShimmerLoading = () => {
    return (
      <View>
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={styles.transactionCard}>
            <View style={styles.shimmerIcon} />
            <View style={styles.transactionContent}>
              <View style={styles.shimmerLine} />
              <View style={[styles.shimmerLine, { width: '60%', marginTop: 8 }]} />
            </View>
            <View style={[styles.shimmerLine, { width: 80 }]} />
          </View>
        ))}
      </View>
    );
  };

  // Render Error State
  const renderErrorState = () => {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={styles.errorText}>{errorMessage}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => loadTransactions(true)}
        >
          <Text style={styles.retryButtonText}>Coba Lagi</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render Empty State
  const renderEmptyState = () => {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="receipt-outline" size={64} color="#9CA3AF" />
        <Text style={styles.emptyText}>Belum ada transaksi</Text>
        <Text style={styles.emptySubText}>Transaksi Anda akan muncul di sini</Text>
      </View>
    );
  };

  // Render Transaction Item
  const renderTransactionItem = ({ item: transaction }) => {
    const isRefreshing = refreshingTransactions.has(transaction.refId);
    const isPending = transaction.status.toLowerCase() === 'pending';
    const statusColor = getStatusColor(transaction.status);

    return (
      <TouchableOpacity
        style={styles.transactionCard}
        onPress={() => {
          setSelectedTransaction(transaction);
          setDetailModalVisible(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.transactionRow}>
          {/* Icon */}
          <View
            style={[styles.iconContainer, { backgroundColor: `${statusColor}20` }]}
          >
            <Icon
              name={
                transaction.status.toLowerCase() === 'success' ||
                transaction.status.toLowerCase() === 'sukses'
                  ? 'checkmark-circle'
                  : transaction.status.toLowerCase() === 'pending'
                  ? 'time'
                  : 'close-circle'
              }
              size={24}
              color={statusColor}
            />
          </View>

          {/* Transaction Details */}
          <View style={styles.transactionContent}>
            <Text style={styles.transactionTitle} numberOfLines={2}>
              {transaction.productName}
            </Text>
            <Text style={styles.transactionCategory}>{transaction.categoryName}</Text>
            <Text style={styles.transactionCustomer}>
              No. {transaction.customerNo}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
              <Icon
                name={
                  transaction.status.toLowerCase() === 'success' ||
                  transaction.status.toLowerCase() === 'sukses'
                    ? 'checkmark-circle'
                    : transaction.status.toLowerCase() === 'pending'
                    ? 'time'
                    : 'close-circle'
                }
                size={12}
                color={statusColor}
              />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {transaction.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Amount */}
          <View style={styles.amountContainer}>
            <Text style={[styles.amountText, { color: statusColor }]}>
              Rp{formatCurrency(transaction.price)}
            </Text>
            <Text style={styles.dateText}>{formatDate(transaction.createdAt)}</Text>
          </View>
        </View>

        {/* Check Status Button */}
        {isPending && (
          <>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.checkStatusButton}
              onPress={(e) => {
                e.stopPropagation();
                refreshSingleTransaction(transaction);
              }}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <ActivityIndicator size="small" color="#F59E0B" />
              ) : (
                <Icon name="refresh" size={18} color="#F59E0B" />
              )}
              <Text style={styles.checkStatusText}>
                {isRefreshing ? 'Mengecek...' : 'Cek Status'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </TouchableOpacity>
    );
  };

  // Render Detail Modal
  const renderDetailModal = () => {
    if (!selectedTransaction) return null;

    const statusColor = getStatusColor(selectedTransaction.status);
    const isPending = selectedTransaction.status.toLowerCase() === 'pending';
    const isPLN = isPLNProduct(selectedTransaction);

    return (
      <Modal
        visible={detailModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Detail Transaksi</Text>
                <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                  <Icon name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* Status Icon */}
              <View style={styles.statusIconContainer}>
                <View
                  style={[
                    styles.statusIconCircle,
                    { backgroundColor: `${statusColor}20` },
                  ]}
                >
                  <Icon
                    name={
                      selectedTransaction.status.toLowerCase() === 'success' ||
                      selectedTransaction.status.toLowerCase() === 'sukses'
                        ? 'checkmark-circle'
                        : selectedTransaction.status.toLowerCase() === 'pending'
                        ? 'time'
                        : 'close-circle'
                    }
                    size={40}
                    color={statusColor}
                  />
                </View>
                <Text style={[styles.statusTitle, { color: statusColor }]}>
                  {selectedTransaction.status.toUpperCase()}
                </Text>
              </View>

              {/* Transaction Details */}
              <View style={styles.detailsContainer}>
                {renderDetailRow('Produk', selectedTransaction.productName)}
                {renderDetailRow('Kategori', selectedTransaction.categoryName)}
                {renderDetailRow('Brand', selectedTransaction.brandName)}
                {renderDetailRow('No. Pelanggan', selectedTransaction.customerNo)}
                {renderDetailRow(
                  'Harga',
                  `Rp${formatCurrency(selectedTransaction.price)}`
                )}
                {renderDetailRow('Status', selectedTransaction.status.toUpperCase())}
                {renderDetailRow('Ref ID', selectedTransaction.refId)}
                {selectedTransaction.message && selectedTransaction.message !== '' && (
                  renderDetailRow('Pesan', selectedTransaction.message)
                )}
                {selectedTransaction.sn && selectedTransaction.sn !== '' && (
                  renderDetailRow(
                    isPLN ? 'Token Listrik' : 'Serial Number',
                    isPLN
                      ? extractPLNToken(selectedTransaction.sn)
                      : selectedTransaction.sn,
                    true
                  )
                )}
                {renderDetailRow('Tanggal', formatDate(selectedTransaction.createdAt))}
              </View>

              {/* Buttons */}
              {isPending && (
                <TouchableOpacity
                  style={styles.modalCheckButton}
                  onPress={() => {
                    setDetailModalVisible(false);
                    refreshSingleTransaction(selectedTransaction);
                  }}
                >
                  <Icon name="refresh" size={20} color="#F59E0B" />
                  <Text style={styles.modalCheckButtonText}>Cek Status Terbaru</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setDetailModalVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>Tutup</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // Render Detail Row
  const renderDetailRow = (label, value, copyable = false) => {
    return (
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}</Text>
        <View style={styles.detailValueContainer}>
          <Text style={styles.detailValue}>{value}</Text>
          {copyable && (
            <TouchableOpacity
              onPress={() => {
                Clipboard.setString(value);
                Alert.alert('Sukses', 'Disalin ke clipboard');
              }}
            >
              <Icon name="copy-outline" size={20} color="#396EB0" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Render Filter Modal
  const renderFilterModal = () => {
    return (
      <Modal
        visible={filterModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filter Transaksi</Text>
                <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                  <Icon name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* Status Filter */}
              <Text style={styles.filterSectionTitle}>Status</Text>
              <View style={styles.filterChipsContainer}>
                {statusOptions.map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterChip,
                      selectedStatus === status && styles.filterChipSelected,
                    ]}
                    onPress={() => setSelectedStatus(status)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedStatus === status && styles.filterChipTextSelected,
                      ]}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Category Filter */}
              <Text style={styles.filterSectionTitle}>Kategori</Text>
              <View style={styles.filterChipsContainer}>
                {categoryOptions.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.filterChip,
                      selectedCategory === category && styles.filterChipSelected,
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedCategory === category && styles.filterChipTextSelected,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Buttons */}
              <View style={styles.filterButtonsContainer}>
                <TouchableOpacity
                  style={styles.filterResetButton}
                  onPress={() => {
                    setSelectedStatus('Semua');
                    setSelectedCategory('Semua');
                    setFilterModalVisible(false);
                  }}
                >
                  <Text style={styles.filterResetButtonText}>Reset</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.filterApplyButton}
                  onPress={() => setFilterModalVisible(false)}
                >
                  <Text style={styles.filterApplyButtonText}>Terapkan</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const filteredTransactions = getFilteredTransactions();
  const pendingCount = transactions.filter((t) => t.status.toLowerCase() === 'pending')
    .length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Semua Transaksi</Text>
          {pendingCount > 0 && (
            <Text style={styles.headerSubtitle}>
              {pendingCount} transaksi pending (auto-refresh{' '}
              {autoRefreshEnabled ? 'aktif' : 'non-aktif'})
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setFilterModalVisible(true)}
            style={styles.headerButton}
          >
            <Icon name="filter" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setAutoRefreshEnabled(!autoRefreshEnabled);
              Alert.alert(
                'Info',
                autoRefreshEnabled
                  ? 'Auto-refresh dihentikan'
                  : 'Auto-refresh diaktifkan'
              );
            }}
            style={styles.headerButton}
          >
            <Icon
              name={autoRefreshEnabled ? 'pause' : 'play'}
              size={24}
              color="#FFF"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari transaksi..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Active Filters */}
      {(selectedStatus !== 'Semua' || selectedCategory !== 'Semua') && (
        <View style={styles.activeFiltersContainer}>
          {selectedStatus !== 'Semua' && (
            <View style={styles.activeFilterChip}>
              <Text style={styles.activeFilterText}>Status: {selectedStatus}</Text>
              <TouchableOpacity onPress={() => setSelectedStatus('Semua')}>
                <Icon name="close" size={16} color="#396EB0" />
              </TouchableOpacity>
            </View>
          )}
          {selectedCategory !== 'Semua' && (
            <View style={styles.activeFilterChip}>
              <Text style={styles.activeFilterText}>
                Kategori: {selectedCategory}
              </Text>
              <TouchableOpacity onPress={() => setSelectedCategory('Semua')}>
                <Icon name="close" size={16} color="#396EB0" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Transaction List */}
      {isLoading ? (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {renderShimmerLoading()}
        </ScrollView>
      ) : errorMessage ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {renderErrorState()}
        </ScrollView>
      ) : filteredTransactions.length === 0 ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {renderEmptyState()}
        </ScrollView>
      ) : (
        <FlatList
          data={filteredTransactions}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* Detail Modal */}
      {renderDetailModal()}

      {/* Filter Modal */}
      {renderFilterModal()}
    </SafeAreaView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
    backgroundColor: '#396EB0',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Poppins-Bold',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#FFF',
    opacity: 0.8,
    fontFamily: 'Poppins-Regular',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    fontFamily: 'Poppins-Regular',
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 8,
  },
  activeFilterText: {
    fontSize: 12,
    color: '#396EB0',
    fontFamily: 'Poppins-Medium',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  listContent: {
    padding: 16,
  },
  transactionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionContent: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
    fontFamily: 'Poppins-Bold',
  },
  transactionCategory: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 2,
    fontFamily: 'Poppins-Regular',
  },
  transactionCustomer: {
    fontSize: 12,
    color: '#9E9E9E',
    marginBottom: 6,
    fontFamily: 'Poppins-Regular',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Poppins-Bold',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
    fontFamily: 'Poppins-Bold',
  },
  dateText: {
    fontSize: 11,
    color: '#9E9E9E',
    fontFamily: 'Poppins-Regular',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
  },
  checkStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    gap: 8,
  },
  checkStatusText: {
    fontSize: 13,
    color: '#F59E0B',
    fontFamily: 'Poppins-Medium',
  },
  shimmerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E0E0',
    marginRight: 12,
  },
  shimmerLine: {
    height: 14,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
  },
  errorContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  errorText: {
    fontSize: 14,
    color: '#757575',
    marginTop: 16,
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },
  retryButton: {
    backgroundColor: '#396EB0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: 'bold',
    fontFamily: 'Poppins-Bold',
  },
  emptyContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyText: {
    fontSize: 16,
    color: '#000',
    marginTop: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  emptySubText: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 8,
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
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'Poppins-Bold',
  },
  statusIconContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  statusIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Poppins-Bold',
  },
  detailsContainer: {
    marginBottom: 24,
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 13,
    color: '#757575',
    marginBottom: 4,
    fontFamily: 'Poppins-Regular',
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    fontFamily: 'Poppins-SemiBold',
  },
  modalCheckButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  modalCheckButtonText: {
    fontSize: 14,
    color: '#F59E0B',
    fontFamily: 'Poppins-Medium',
  },
  modalCloseButton: {
    backgroundColor: '#396EB0',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Poppins-Bold',
  },
  filterSectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 12,
    fontFamily: 'Poppins-Bold',
  },
  filterChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  filterChipSelected: {
    backgroundColor: '#396EB0',
    borderColor: '#396EB0',
  },
  filterChipText: {
    fontSize: 13,
    color: '#757575',
    fontFamily: 'Poppins-Medium',
  },
  filterChipTextSelected: {
    color: '#FFF',
  },
  filterButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  filterResetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#396EB0',
    alignItems: 'center',
  },
  filterResetButtonText: {
    fontSize: 14,
    color: '#396EB0',
    fontWeight: 'bold',
    fontFamily: 'Poppins-Bold',
  },
  filterApplyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#396EB0',
    alignItems: 'center',
  },
  filterApplyButtonText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: 'bold',
    fontFamily: 'Poppins-Bold',
  },
});