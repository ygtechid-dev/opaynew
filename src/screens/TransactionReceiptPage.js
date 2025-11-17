import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Share,
  Clipboard,
  Modal,
  TextInput,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL, API_URL_PROD } from '../context/APIUrl';
// import RNHTMLtoPDF from 'react-native-html-to-pdf';
// import FileViewer from 'react-native-file-viewer';

export default function TransactionReceiptPage({ route, navigation }) {
  const { product, phoneNumber, provider, transactionData, providerLogo } = route.params;

  const [currentTransactionData, setCurrentTransactionData] = useState(transactionData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshCount, setAutoRefreshCount] = useState(0);
  const maxAutoRefreshAttempts = 20;

  const [loyaltyPointsAdded, setLoyaltyPointsAdded] = useState(new Set());
  const [walletDeducted, setWalletDeducted] = useState(new Set());
  const [fundRefunded, setFundRefunded] = useState(new Set());

  const [isAgen, setIsAgen] = useState(false);
  const [isLoadingAgen, setIsLoadingAgen] = useState(true);
  const [agenData, setAgenData] = useState(null);

  // Print Modal States
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printPrice, setPrintPrice] = useState('');
  const [storeName, setStoreName] = useState('');

  const refreshIntervalRef = useRef(null);
  const viewShotRef = useRef(null);

  useEffect(() => {
    initializePage();
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  const initializePage = async () => {
    await checkAgenStatus();
    await deductWalletOnPending();
    startAutoRefreshIfNeeded();
  };

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

      console.log('Agen Status Response:', response.data);

      if (response.data && response.data.length > 0) {
        setIsAgen(true);
        setAgenData(response.data[0]);
        setStoreName(response.data[0].nama_toko || '');
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

  const getCorrectPrice = () => {
    const typeName = product.type_name?.toLowerCase() || '';

    if (typeName === 'pascabayar') {
      return parseFloat(product.price || '0');
    }

    if (isAgen) {
      return parseFloat(product.price || '0');
    } else {
      return parseFloat(product.priceTierTwo || product.price || '0');
    }
  };

  const deductWalletOnPending = async () => {
    const status = getTransactionStatus();
    if (status === 'PENDING') {
      const correctPrice = getCorrectPrice();
      const refId = getTransactionId();

      if (!walletDeducted.has(refId)) {
        console.log('💳 Transaction is PENDING - Deducting wallet...');
        const deductSuccess = await deductWalletBalance(correctPrice, refId);

        if (deductSuccess) {
          console.log('✅ Wallet deducted successfully');
        }
      }
    }
  };

  const deductWalletBalance = async (amount, refId) => {
    try {
      if (walletDeducted.has(refId)) {
        return true;
      }

     const userData = await AsyncStorage.getItem('userData');
const userObj = JSON.parse(userData || '{}');

const response = await axios.post(`${API_URL}/api/deduct-saldo/deduct`, {
  user_id: userObj.id,   
  amount: amount,
  transaction_type: 'ppob_payment',
  reference: refId,
});

      if (response.data) {
        setWalletDeducted(prev => new Set([...prev, refId]));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deducting wallet:', error);
      return false;
    }
  };

  const addFundToWallet = async (amount, refId) => {
    try {
      if (fundRefunded.has(refId)) {
        return true;
      }

      const userData = await AsyncStorage.getItem('userData');
      if (!userData) return false;

      const userObj = JSON.parse(userData);

      const response = await axios.post(`${API_URL}/api/wallet/add`, {
        customer_id: userObj.id,
        amount: amount,
        referance: refId,
        payment_method: 'QRIS',
      });

      if (response.data.success) {
        setFundRefunded(prev => new Set([...prev, refId]));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error adding fund:', error);
      return false;
    }
  };

  const addLoyaltyPoints = async (refId, nominalPoint) => {
    try {
      if (loyaltyPointsAdded.has(refId)) {
        return true;
      }

      const userData = await AsyncStorage.getItem('userData');
      if (!userData) return false;

      const userObj = JSON.parse(userData);

      const response = await axios.post(`${API_URL}/api/loyalty/add`, {
        point: nominalPoint,
        user_id: userObj.id,
        ref_id: refId,
        source: 'ppob_transaction',
        type: 'add',
      });

      if (response.data.success) {
        setLoyaltyPointsAdded(prev => new Set([...prev, refId]));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error adding loyalty points:', error);
      return false;
    }
  };

  const startAutoRefreshIfNeeded = () => {
    if (isTransactionPending() && autoRefreshCount < maxAutoRefreshAttempts) {
      refreshIntervalRef.current = setInterval(() => {
        refreshTransactionStatus(true);
      }, 3000);
    }
  };

  const stopAutoRefresh = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  };

  const refreshTransactionStatus = async (isAutoRefresh = false) => {
    if (isRefreshing) return;

    setIsRefreshing(true);

    try {
      const requestBody = {
        customer_no: phoneNumber,
        buyer_sku_code: product.buyer_sku_code,
        ref_id: getTransactionId(),
        testing: false,
      };

      const response = await axios.post(
        `${API_URL_PROD}/api/check-transaction`,
        requestBody
      );

      if (response.data) {
        const responseData = response.data;
        let newStatus = 'PENDING';

        if (responseData.digiflazz_response?.data?.status) {
          newStatus = responseData.digiflazz_response.data.status.toUpperCase();
        }

        const currentStatus = getTransactionStatus();

        if (newStatus !== currentStatus) {
          console.log(`Status changed: ${currentStatus} → ${newStatus}`);

          const correctPrice = getCorrectPrice();

          if (newStatus === 'SUCCESS' || newStatus === 'SUKSES') {
            // Add loyalty points
            const nominalPoint = product.nominal_point || 10;
            await addLoyaltyPoints(getTransactionId(), nominalPoint);

            Alert.alert('Sukses', 'Transaksi berhasil!');
          } else if (newStatus === 'FAILED' || newStatus === 'GAGAL') {
            // Refund
            await addFundToWallet(correctPrice, getTransactionId());
            Alert.alert('Gagal', 'Transaksi gagal, saldo dikembalikan');
          }

          setCurrentTransactionData(responseData);
        }

        if (isAutoRefresh) {
          setAutoRefreshCount(prev => prev + 1);
        }

        if (!isTransactionPending()) {
          stopAutoRefresh();
        }
      }
    } catch (error) {
      console.error('Error refreshing transaction:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getTransactionId = () => {
    if (currentTransactionData?.ref_id) {
      return currentTransactionData.ref_id;
    }
    return `OPAY${Date.now().toString().slice(-8)}`;
  };

  const formatDateTime = () => {
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const day = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();
    return `${hours}:${minutes} • ${day} ${month} ${year}`;
  };

  const getTransactionStatus = () => {
    if (!currentTransactionData) return 'SUCCESS';

    if (currentTransactionData.digiflazz_response?.data?.status) {
      return currentTransactionData.digiflazz_response.data.status.toUpperCase();
    }

    return currentTransactionData.transaction_status?.toUpperCase() || 'PENDING';
  };

  const isTransactionSuccessful = () => {
    const status = getTransactionStatus();
    return status === 'SUCCESS' || status === 'SUKSES';
  };

  const isTransactionPending = () => {
    return getTransactionStatus() === 'PENDING';
  };

  const isTransactionFailed = () => {
    const status = getTransactionStatus();
    return status === 'FAILED' || status === 'GAGAL';
  };

  const getProductName = () => {
    return currentTransactionData?.product?.name || product.product_name || '';
  };

  const getPrice = () => {
    if (currentTransactionData?.product?.price) {
      return formatPrice(currentTransactionData.product.price.toString());
    }
    return formatPrice(getCorrectPrice().toString());
  };

  const formatPrice = (price) => {
    const priceDouble = parseFloat(price) || 0;
    return priceDouble.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const getSerialNumber = () => {
    return currentTransactionData?.digiflazz_response?.data?.sn || '';
  };

  const extractPLNToken = () => {
    const sn = getSerialNumber();
    if (!sn) return '';

    const parts = sn.split('/');
    return parts[0]?.trim() || '';
  };

  const isPLNProduct = () => {
    const productName = getProductName().toUpperCase();
    const buyerSkuCode = product.buyer_sku_code?.toUpperCase() || '';

    return (
      productName.includes('PLN') ||
      productName.includes('TOKEN') ||
      productName.includes('LISTRIK') ||
      buyerSkuCode.includes('PLN')
    );
  };

  const copyToClipboard = (text) => {
    Clipboard.setString(text);
    Alert.alert('Berhasil', `${text} disalin ke clipboard`);
  };

  const shareReceipt = () => {
    const transactionId = getTransactionId();
    const dateTime = formatDateTime();
    const price = getPrice();
    const productName = getProductName();
    const status = getTransactionStatus();

    let statusEmoji = '⏳';
    if (isTransactionSuccessful()) statusEmoji = '✅';
    if (isTransactionFailed()) statusEmoji = '❌';

    let shareText = `
🧾 STRUK TRANSAKSI ${productName}

📅 ${dateTime}
🆔 ID Transaksi: ${transactionId}

${statusEmoji} ${status}

📦 Produk: ${productName}
📱 Nomor: ${phoneNumber}
💰 Harga: Rp ${price}
`;

    if (isPLNProduct() && isTransactionSuccessful()) {
      const token = extractPLNToken();
      if (token) {
        shareText += `\n🔑 Token PLN: ${token}`;
      }
    }

    shareText += '\n\nTerima kasih telah menggunakan layanan kami!';

    Share.share({ message: shareText });
  };

  const handlePrintStruk = () => {
    // setShowPrintModal(true);
    // setPrintPrice(getPrice());
  };

  const generatePrintHTML = (sellPrice) => {
    const transactionId = getTransactionId();
    const dateTime = formatDateTime();
    const productName = getProductName();
    const buyPrice = getPrice();
    const profit = parseFloat(sellPrice.replace(/\./g, '')) - parseFloat(buyPrice.replace(/\./g, ''));
    const displayStoreName = isAgen ? (agenData?.nama_toko || 'Toko Saya') : storeName;

    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      padding: 10px;
      max-width: 280px;
    }
    .header {
      text-align: center;
      margin-bottom: 10px;
      border-bottom: 1px dashed #000;
      padding-bottom: 10px;
    }
    .store-name {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .section {
      margin-bottom: 10px;
      border-bottom: 1px dashed #000;
      padding-bottom: 10px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    .label {
      font-weight: normal;
    }
    .value {
      font-weight: bold;
      text-align: right;
    }
    .total {
      font-size: 14px;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      margin-top: 10px;
      font-size: 10px;
    }
    .profit {
      color: #2F318B;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="store-name">${displayStoreName}</div>
    <div>${dateTime}</div>
  </div>

  <div class="section">
    <div class="row">
      <span class="label">ID Transaksi:</span>
      <span class="value">${transactionId}</span>
    </div>
    <div class="row">
      <span class="label">Status:</span>
      <span class="value">${getTransactionStatus()}</span>
    </div>
  </div>

  <div class="section">
    <div class="row">
      <span class="label">Produk:</span>
      <span class="value">${productName}</span>
    </div>
    <div class="row">
      <span class="label">Nomor:</span>
      <span class="value">${phoneNumber}</span>
    </div>
  </div>

  <div class="section">
    <div class="row">
      <span class="label">Harga Beli:</span>
      <span class="value">Rp ${buyPrice}</span>
    </div>
    <div class="row">
      <span class="label">Harga Jual:</span>
      <span class="value">Rp ${sellPrice}</span>
    </div>
    <div class="row">
      <span class="label">Keuntungan:</span>
      <span class="value profit">Rp ${formatPrice(profit.toString())}</span>
    </div>
  </div>
`;

    if (getSerialNumber()) {
      html += `
  <div class="section">
    <div class="row">
      <span class="label">SN:</span>
    </div>
    <div class="value" style="word-wrap: break-word; text-align: left; margin-top: 5px;">
      ${getSerialNumber()}
    </div>
  </div>
`;
    }

    if (isPLNProduct() && isTransactionSuccessful() && extractPLNToken()) {
      html += `
  <div class="section">
    <div class="row">
      <span class="label">Token PLN:</span>
    </div>
    <div class="value" style="font-size: 16px; text-align: center; margin-top: 5px; letter-spacing: 2px;">
      ${extractPLNToken()}
    </div>
  </div>
`;
    }

    html += `
  <div class="footer">
    <p>Terima kasih atas pembelian Anda</p>
    <p>Powered by Ditokoku.id</p>
  </div>
</body>
</html>
`;

    return html;
  };

 const printStruk = async () => {
//   if (!printPrice) {
//     Alert.alert('Error', 'Masukkan harga jual');
//     return;
//   }

//   if (!isAgen && !storeName.trim()) {
//     Alert.alert('Error', 'Masukkan nama toko');
//     return;
//   }

//   try {
//     const html = generatePrintHTML(printPrice);

//     // Generate PDF
//     const options = {
//       html,
//       fileName: `struk_${getTransactionId()}`,
//       directory: 'Documents',
//     };

//     const file = await RNHTMLtoPDF.convert(options);

//     console.log('PDF generated:', file.filePath);

//     // Buka PDF untuk print / share
//     await FileViewer.open(file.filePath, { showOpenWithDialog: true });

//     setShowPrintModal(false);
//     setPrintPrice('');
//     setStoreName(isAgen ? agenData?.nama_toko || '' : '');

//   } catch (error) {
//     console.error('Error printing:', error);
//     Alert.alert('Error', 'Gagal mencetak struk');
//   }
};



  const renderHeader = () => {
    if (isTransactionPending()) {
      return (
        <View style={styles.pendingHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <View style={styles.backButtonCircle}>
              <Icon name="arrow-back" size={20} color="#FFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.pendingHeaderTitle}>Struk Transaksi</Text>
          <TouchableOpacity
            onPress={() => refreshTransactionStatus()}
            disabled={isRefreshing}
          >
            <View style={styles.refreshButtonCircle}>
              {isRefreshing ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Icon name="refresh" size={20} color="#FFF" />
              )}
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.completedHeader}>
        <Text style={styles.completedHeaderTitle}>
          {isTransactionSuccessful() ? 'Pembayaran Berhasil' : 'Pembayaran Gagal'}
        </Text>
        <TouchableOpacity
          style={styles.downloadIconButton}
          onPress={() => copyToClipboard(getTransactionId())}
        >
          <Image
            source={require('../assets/downicon.png')}
            style={styles.downloadIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderPendingContent = () => {
    return (
      <>
        {/* Provider Logo */}
        <View style={styles.providerLogoContainer}>
          <Image
            source={providerLogo}
            style={styles.providerLogo}
            resizeMode="contain"
          />
        </View>

        {/* Transaction Card */}
        <View style={styles.pendingCardWrapper}>
          <View style={styles.pendingCardHeader}>
            <Text style={styles.pendingCardDate}>{formatDateTime()}</Text>
            <View style={styles.transactionIdRow}>
              <Text style={styles.transactionId}>{getTransactionId()}</Text>
              <TouchableOpacity onPress={() => copyToClipboard(getTransactionId())}>
                <Icon name="copy" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.pendingCardBody}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Nama Produk</Text>
              <Text style={styles.detailValue} numberOfLines={2}>
                {getProductName()}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Nomor Pelanggan</Text>
              <Text style={styles.detailValue}>{phoneNumber}</Text>
            </View>
          </View>
        </View>

        {/* Pending Status Badge */}
        <View style={styles.pendingBadge}>
          <View style={styles.pendingIconCircle}>
            <Icon name="time" size={12} color="#FFF" />
          </View>
          <Text style={styles.pendingBadgeText}>Transaksi Pending</Text>
        </View>

        {/* Pending Info Box */}
        <View style={styles.pendingInfoBox}>
          <Text style={styles.pendingInfoText}>
            Transaksi sedang diproses.{'\n'}
            Saldo telah dipotong dan akan dikembalikan jika transaksi gagal.{'\n'}
            Status akan diperbarui otomatis setiap 3 detik
          </Text>
          <Text style={styles.pendingInfoText}>
            Auto refresh aktif ({autoRefreshCount}/{maxAutoRefreshAttempts})
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.helpButton}>
            <Image
              source={require('../assets/waicon.png')}
              style={styles.waIcon}
              resizeMode="contain"
            />
            <Text style={styles.helpButtonText}>Bantuan</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareButton} onPress={shareReceipt}>
            <Icon name="share-social" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Back to Home */}
        <TouchableOpacity
          style={styles.backToHomeButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.backToHomeText}>Kembali Ke Beranda</Text>
        </TouchableOpacity>
      </>
    );
  };

  const renderCompletedContent = () => {
    return (
      <>
        {/* Transaction Card */}
        <View style={styles.completedCard}>
          {/* Card Header */}
          <View style={styles.completedCardHeader}>
            <Text style={styles.completedCardHeaderStatus}>
              {isTransactionSuccessful() ? 'Transaksi Berhasil' : 'Transaksi Gagal'}
            </Text>
            <Text style={styles.completedCardHeaderDate}>{formatDateTime()}</Text>
          </View>

          {/* Card Body */}
          <View style={styles.completedCardBody}>
            {/* Success/Failed Icon */}
            {isTransactionSuccessful() ? (
              <Image
                source={require('../assets/successtrx.png')}
                style={styles.statusIcon}
                resizeMode="contain"
              />
            ) : (
              <Image
                source={require('../assets/failedtrx.png')}
                style={styles.statusIcon}
                resizeMode="contain"
              />
            )}

            {/* Detail Rows */}
            {renderDetailRow('Nama Produk', getProductName())}
            {renderDivider()}
            {renderDetailRow('Nomor Telepon', phoneNumber)}
            {renderDivider()}
            {renderDetailRow('Harga', `Rp. ${getPrice()}`)}
            {renderDetailRow('Biaya Admin', 'Gratis!', true)}
            {renderDetailRow('Keterangan', getProductName())}
            {renderDivider()}

            {/* Total Row */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Pembayaran</Text>
              <Text style={styles.totalValue}>Rp {getPrice()}</Text>
            </View>

            {/* Serial Number */}
            {isTransactionSuccessful() && getSerialNumber() && (
              <>
                {renderDivider()}
                <View style={styles.snBox}>
                  <View style={styles.snHeader}>
                    <Icon name="receipt" size={20} color="#4CAF50" />
                    <Text style={styles.snTitle}>Kode SN</Text>
                  </View>
                  <View style={styles.snContentRow}>
                    <Text style={styles.snText}>{getSerialNumber()}</Text>
                    <TouchableOpacity
                      style={styles.snCopyButton}
                      onPress={() => copyToClipboard(getSerialNumber())}
                    >
                      <Icon name="copy" size={16} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}

            {/* PLN Token */}
            {isPLNProduct() && isTransactionSuccessful() && extractPLNToken() && (
              <>
                {renderDivider()}
                <View style={styles.plnBox}>
                  <View style={styles.plnHeader}>
                    <Icon name="flash" size={20} color="#FFA726" />
                    <Text style={styles.plnTitle}>Token PLN</Text>
                  </View>
                  <View style={styles.plnContentRow}>
                    <Text style={styles.plnToken}>{extractPLNToken()}</Text>
                    <TouchableOpacity
                      style={styles.plnCopyButton}
                      onPress={() => copyToClipboard(extractPLNToken())}
                    >
                      <Icon name="copy" size={16} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Bottom Message */}
        <Text style={styles.bottomMessage}>
          {isTransactionSuccessful()
            ? 'Pembayaran anda telah berhasil.\nTerimakasih telah menggunakan O-Payment dari ditokoku.id untuk melakukan transaksi.'
            : 'Pembayaran gagal. Saldo telah dikembalikan ke akun Anda.'}
        </Text>

        {/* Action Buttons */}
        <View style={styles.completedActionButtons}>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.homeButtonText}>Kembali ke Beranda</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareButtonCompleted} onPress={shareReceipt}>
            <Icon name="share-social" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Print Button - Only show for successful transactions */}
        {isTransactionSuccessful() && (
          <TouchableOpacity style={styles.printButton} onPress={handlePrintStruk}>
            <Icon name="print" size={20} color="#FFF" />
            <Text style={styles.printButtonText}>Cetak Struk</Text>
          </TouchableOpacity>
        )}
      </>
    );
  };

  const renderDetailRow = (label, value, isGreen = false) => {
    return (
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, isGreen && styles.greenText]} numberOfLines={3}>
          {value}
        </Text>
      </View>
    );
  };

  const renderDivider = () => {
    return <View style={styles.divider} />;
  };

  const renderPrintModal = () => {
    return (
      <Modal
        visible={showPrintModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPrintModal(false)}
      >
        <View style={styles.printModalOverlay}>
          <View style={styles.printModalContent}>
            <View style={styles.printModalHeader}>
              <Text style={styles.printModalTitle}>Cetak Struk</Text>
              <TouchableOpacity onPress={() => setShowPrintModal(false)}>
                <Icon name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.printModalBody}>
              {/* Store Name Input - Only if not Agen */}
              {!isAgen && (
                <View style={styles.printInputGroup}>
                  <Text style={styles.printInputLabel}>Nama Toko</Text>
                  <TextInput
                    style={styles.printInput}
                    placeholder="Masukkan nama toko"
                    value={storeName}
                    onChangeText={setStoreName}
                  />
                </View>
              )}

              {/* Agen Store Name Display */}
              {isAgen && (
                <View style={styles.printInputGroup}>
                  <Text style={styles.printInputLabel}>Nama Toko</Text>
                  <View style={styles.printInputDisabled}>
                    <Text style={styles.printInputDisabledText}>
                      {agenData?.nama_toko || 'Toko Agen'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Buy Price Display */}
              <View style={styles.printInputGroup}>
                <Text style={styles.printInputLabel}>Harga Beli</Text>
                <View style={styles.printInputDisabled}>
                  <Text style={styles.printInputDisabledText}>Rp {getPrice()}</Text>
                </View>
              </View>

              {/* Sell Price Input */}
              <View style={styles.printInputGroup}>
                <Text style={styles.printInputLabel}>Harga Jual</Text>
                <TextInput
                  style={styles.printInput}
                  placeholder="Masukkan harga jual"
                  value={printPrice}
                  onChangeText={setPrintPrice}
                  keyboardType="numeric"
                />
              </View>

              {/* Profit Display */}
              {printPrice && (
                <View style={styles.profitBox}>
                  <Text style={styles.profitLabel}>Keuntungan:</Text>
                  <Text style={styles.profitValue}>
                    Rp{' '}
                    {formatPrice(
                      (
                        parseFloat(printPrice.replace(/\./g, '')) -
                        parseFloat(getPrice().replace(/\./g, ''))
                      ).toString()
                    )}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.printModalFooter}>
              <TouchableOpacity
                style={styles.printModalCancelButton}
                onPress={() => setShowPrintModal(false)}
              >
                <Text style={styles.printModalCancelText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.printModalPrintButton} onPress={printStruk}>
                <Icon name="print" size={20} color="#FFF" />
                <Text style={styles.printModalPrintText}>Cetak</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderHeader()}
        {isTransactionPending() ? renderPendingContent() : renderCompletedContent()}
      </ScrollView>

      {renderPrintModal()}
    </View>
  );

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },

  // ===== HEADER STYLES =====
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 30,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Poppins-Bold',
  },
  refreshButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedHeader: {
    alignItems: 'center',
    paddingTop: 46,
    paddingBottom: 50,
    position: 'relative',
  },
  completedHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    fontFamily: 'Poppins-Bold',
  },
  downloadIconButton: {
    position: 'absolute',
    right: 16,
    top: 46,
  },
  downloadIcon: {
    width: 18,
    height: 18,
  },

  // ===== PENDING CONTENT STYLES =====
  providerLogoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  providerLogo: {
    width: 46,
    height: 62,
  },
  pendingCardWrapper: {
    marginHorizontal: 34,
    marginBottom: 23,
  },
  pendingCardHeader: {
    backgroundColor: '#2F318B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 19,
    paddingBottom: 80,
    paddingHorizontal: 20,
  },
  pendingCardDate: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: 'Poppins-Bold',
  },
  transactionIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: -20
  },
  transactionId: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 6,
    fontFamily: 'Poppins-Bold',
  },
  pendingCardBody: {
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginTop: -60,
    paddingTop: 13,
    paddingBottom: 11,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 39,
    marginBottom: 9,
  },
  pendingIconCircle: {
    width: 21,
    height: 21,
    borderRadius: 10.5,
    backgroundColor: '#F9A021',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 7,
  },
  pendingBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F9A021',
    fontFamily: 'Poppins-Bold',
  },
  pendingInfoBox: {
    marginHorizontal: 34,
    marginBottom: 100,
    backgroundColor: '#FFF2DF',
    borderWidth: 1,
    borderColor: '#FF9400',
    borderRadius: 15,
    paddingVertical: 16,
    paddingHorizontal: 41,
  },
  pendingInfoText: {
    fontSize: 11,
    color: '#F89506',
    marginBottom: 9,
    fontFamily: 'Poppins-Regular',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    marginHorizontal: 33,
    marginTop: 8,
    marginBottom: 4,
  },
  helpButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#2F318B',
    borderRadius: 20,
    paddingVertical: 11,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#14142B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },
  waIcon: {
    width: 29,
    height: 29,
    marginRight: 6,
  },
  helpButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Poppins-Bold',
  },
  shareButton: {
    width: 50,
    height: 50,
    backgroundColor: '#2F318B',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#14142B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },
  backToHomeButton: {
    alignSelf: 'center',
    marginBottom: 39,
  },
  backToHomeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2F318B',
    fontFamily: 'Poppins-Bold',
  },

  // ===== COMPLETED CONTENT STYLES =====
  completedCard: {
    marginHorizontal: 34,
    marginBottom: 31,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  completedCardHeader: {
    backgroundColor: '#2F318B',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  completedCardHeaderStatus: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFF',
    fontFamily: 'Poppins-Medium',
  },
  completedCardHeaderDate: {
    fontSize: 10,
    fontWeight: '500',
    color: '#FFF',
    fontFamily: 'Poppins-Medium',
  },
  completedCardBody: {
    backgroundColor: '#FFF',
    paddingTop: 15,
    paddingBottom: 29,
    paddingHorizontal: 12,
  },
  statusIcon: {
    width: 150,
    height: 150,
    alignSelf: 'center',
    marginBottom: 42,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
    marginHorizontal: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#000',
    flex: 2,
    fontFamily: 'Poppins-Regular',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
    flex: 3,
    textAlign: 'right',
    fontFamily: 'Poppins-Bold',
  },
  greenText: {
    color: '#72A677',
  },
  divider: {
    height: 1,
    backgroundColor: '#D9D9D9',
    marginBottom: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 8,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'Poppins-Bold',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'Poppins-Bold',
  },

  // ===== SN BOX STYLES =====
  snBox: {
    marginVertical: 15,
    marginHorizontal: 8,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 8,
  },
  snHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  snTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 8,
    fontFamily: 'Poppins-Bold',
  },
  snContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  snText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000',
    flex: 1,
    fontFamily: 'Poppins-Medium',
  },
  snCopyButton: {
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 6,
    marginLeft: 8,
  },

  // ===== PLN BOX STYLES =====
  plnBox: {
    marginVertical: 15,
    marginHorizontal: 8,
    padding: 12,
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFA726',
    borderRadius: 8,
  },
  plnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  plnTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 8,
    fontFamily: 'Poppins-Bold',
  },
  plnContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  plnToken: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 1.5,
    flex: 1,
    fontFamily: 'Poppins-Bold',
  },
  plnCopyButton: {
    backgroundColor: '#FFA726',
    padding: 8,
    borderRadius: 6,
    marginLeft: 8,
  },

  // ===== BOTTOM MESSAGE =====
  bottomMessage: {
    fontSize: 10,
    color: '#808080',
    textAlign: 'center',
    marginHorizontal: 34,
    marginBottom: 50,
    fontFamily: 'Poppins-Regular',
  },

  // ===== COMPLETED ACTION BUTTONS =====
  completedActionButtons: {
    flexDirection: 'row',
    marginHorizontal: 33,
    marginBottom: 20,
  },
  homeButton: {
    flex: 1,
    backgroundColor: '#2F318B',
    borderRadius: 20,
    paddingVertical: 13,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#14142B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },
  homeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Poppins-Bold',
  },
  shareButtonCompleted: {
    width: 50,
    height: 50,
    backgroundColor: '#2F318B',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#14142B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },

  // ===== PRINT BUTTON =====
  printButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    marginHorizontal: 33,
    marginBottom: 60,
    borderRadius: 20,
    paddingVertical: 13,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  printButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 8,
    fontFamily: 'Poppins-Bold',
  },

  // ===== PRINT MODAL STYLES =====
  printModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  printModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  printModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  printModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'Poppins-Bold',
  },
  printModalBody: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  printInputGroup: {
    marginBottom: 16,
  },
  printInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
    fontFamily: 'Poppins-Medium',
  },
  printInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#000',
    fontFamily: 'Poppins-Regular',
  },
  printInputDisabled: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  printInputDisabledText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Poppins-Medium',
  },
  profitBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  profitLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    fontFamily: 'Poppins-Medium',
  },
  profitValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    fontFamily: 'Poppins-Bold',
  },
  printModalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  printModalCancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2F318B',
    borderRadius: 12,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  printModalCancelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2F318B',
    fontFamily: 'Poppins-Bold',
  },
  printModalPrintButton: {
    flex: 1,
    backgroundColor: '#2F318B',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  printModalPrintText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Poppins-Bold',
  },
});
