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
  Platform,
  PermissionsAndroid
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL, API_URL_PROD } from '../context/APIUrl';
import { 
  USBPrinter,
  NetPrinter,
  BLEPrinter,
} from '@haroldtran/react-native-thermal-printer';
import RNShare from 'react-native-share';
import ViewShot from 'react-native-view-shot';

export default function TransactionReceiptPage({ route, navigation }) {
  const { product, phoneNumber, provider,isAgenss,  transactionData, providerLogo } = route.params;
const refundLockRef = useRef({});

  const [currentTransactionData, setCurrentTransactionData] = useState(transactionData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshCount, setAutoRefreshCount] = useState(0);
  const maxAutoRefreshAttempts = 20;

  const [loyaltyPointsAdded, setLoyaltyPointsAdded] = useState(new Set());
  const [walletDeducted, setWalletDeducted] = useState(new Set());
  const [fundRefunded, setFundRefunded] = useState(new Set());
const [lockedRefId, setLockedRefId] = useState(null);
  const [isAgen, setIsAgen] = useState(false);
  const [isLoadingAgen, setIsLoadingAgen] = useState(true);
  const [agenData, setAgenData] = useState(null);
  const [correctPriceSaved, setCorrectPriceSaved] = useState(false);


  // Print Modal States
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printPrice, setPrintPrice] = useState('');
  const [storeName, setStoreName] = useState('');
  
  // Printer States
  const [printers, setPrinters] = useState([]);
  const [currentPrinter, setCurrentPrinter] = useState(null);

  const refreshIntervalRef = useRef(null);
  const viewShotRef = useRef(null);


  
  useEffect(() => {
  const initialRefId = transactionData?.ref_id || `OPAY${Date.now().toString().slice(-8)}`;
  setLockedRefId(initialRefId);
}, []);



  useEffect(() => {
    initializePage();
    requestBluetoothPermissions();
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  const requestBluetoothPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        console.log('Bluetooth permissions:', granted);
      } catch (err) {
        console.warn('Permission error:', err);
      }
    }
  };


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



  const saveCorrectPriceOnce = async () => {
  try {
    if (correctPriceSaved) return;

    const refId = getTransactionId();
    const correctPrice = getCorrectPrice();

    console.log("💾 Saving correct price ONLY ONCE:", correctPrice);

    const ok = await updateTransactionStatusInDatabase(
      refId,
      null,
      null,
      null,
      correctPrice
    );

    if (ok) {
      setCorrectPriceSaved(true);
      console.log("✅ Correct price saved once");
    } else {
      console.log("❌ Failed to save correct price");
    }
  } catch (err) {
    console.log("Error saving correct price once:", err);
  }
};


 const initializePage = async () => {
  await checkAgenStatus();  // tunggu isAgen ter-set
  setTimeout(() => {
    saveCorrectPriceOnce(); // jalankan SETELAH state update
  }, 300);
  startAutoRefreshIfNeeded();
};

  const checkAgenStatus = async () => {
  try {
    setIsLoadingAgen(true);

    const userData = await AsyncStorage.getItem("userData");
    if (!userData) return setIsAgen(false);

    const userObj = JSON.parse(userData);

    const response = await axios.get(`${API_URL}/api/users/agen/user/${userObj.id}`);
    console.log("RESPONSE AGEN:", response.data);

    const agen = response.data?.data;

    if (Array.isArray(agen) && agen.length > 0) {
      setIsAgen(true);
      setAgenData(agen[0]);
      setStoreName(agen[0].nama_konter || "");
    } else {
      setIsAgen(false);
    }

  } catch (error) {
    console.log("❌ ERROR CHECK AGEN:", error);
    setIsAgen(false);
  } finally {
    setIsLoadingAgen(false);
  }
};


  const wasDeductedBefore = async (refId) => {
  const key = `deduct_${refId}`;
  const value = await AsyncStorage.getItem(key);
  return value === 'true';
};

const markDeducted = async (refId) => {
  const key = `deduct_${refId}`;
  await AsyncStorage.setItem(key, 'true');
};


  const getCorrectPrice = () => {
    
    console.log('isagensekrang', isAgen);
    
    const typeName = product.type_name?.toLowerCase() || '';

    if (typeName === 'pascabayar') {
      return parseFloat(product.price || '0');
    }

    if (isAgenss) {
      return parseFloat(product.price || '0');
    } else {
      return parseFloat(product.priceTierTwo || '0');
    }
  };





 const addFundToWallet = async (amount, refId) => {
  try {
    console.log("🟡 [REFUND] Checking refund for:", refId);

    // 🔒 LOCK: jika sudah pernah berjalan → blokir
    if (refundLockRef.current[refId]) {
      console.log("⛔ [REFUND] Refund locked, skipping");
      return true;
    }

    // cek storage
    const refundedKey = `refund_${refId}`;
    const refundedBefore = await AsyncStorage.getItem(refundedKey);

    if (refundedBefore === "true") {
      console.log("⚠️ [REFUND] Already refunded (AsyncStorage)");
      refundLockRef.current[refId] = true; // sync lock
      return true;
    }

    // 🔥 → KUNCI agar tidak bisa dipanggil paralel
    refundLockRef.current[refId] = true;

    console.log("🔥 [REFUND] Processing refund:", amount);

    const userData = await AsyncStorage.getItem('userData');
    if (!userData) return false;
    const userObj = JSON.parse(userData);

    const response = await axios.post(`${API_URL}/api/wallet-transactions/add`, {
      customer_id: userObj.id,
      amount: amount,
      referance: refId,
      payment_method: "QRIS",
    });

    if (response.data.success) {
      console.log("🟢 [REFUND] REFUND SUCCESS for:", refId);
      await AsyncStorage.setItem(refundedKey, "true");
      return true;
    } else {
      console.log("❌ [REFUND] API error:", response.data);
      return false;
    }

  } catch (err) {
    console.error("❌ [REFUND] Error:", err);
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
    const userData = await AsyncStorage.getItem('userData');
    const userObj = JSON.parse(userData || '{}');

    try {
      const requestBody = {
        customer_no: phoneNumber,
        buyer_sku_code: product.buyer_sku_code,
        ref_id: getTransactionId(),
        testing: false,
        user_id: userObj.id
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

       
          
          console.log(`Status changed: ${currentStatus} → ${newStatus}`);

         if (newStatus !== currentStatus) {
  console.log(`Status changed: ${currentStatus} → ${newStatus}`);

  const correctPrice = getCorrectPrice();
  const newSn = responseData.digiflazz_response?.data?.sn || "";
  const newMessage = responseData.digiflazz_response?.data?.message || "";

  // 🔥 UPDATE STATUS KE DATABASE
  await updateTransactionStatusInDatabase(
    getTransactionId(),
    newStatus,
    newMessage,
    newSn,
    correctPrice
  )

          if (newStatus === 'SUCCESS' || newStatus === 'SUKSES') {
            stopAutoRefresh();
            setAutoRefreshCount(0);
          } else if (newStatus === 'FAILED' || newStatus === 'GAGAL') {
          if (!refundLockRef.current[getTransactionId()]) {
  await addFundToWallet(correctPrice, getTransactionId());
}
stopAutoRefresh();
            setAutoRefreshCount(0);
          }

          setCurrentTransactionData(responseData);
        }

        if (newStatus !== 'PENDING') {
          console.log('✅ Status is no longer PENDING, stopping auto-refresh');
          stopAutoRefresh();
          setAutoRefreshCount(0);
        } else {
          if (isAutoRefresh) {
            setAutoRefreshCount(prev => {
              const nextCount = prev + 1;
              
              if (nextCount >= maxAutoRefreshAttempts) {
                console.log('⚠️ Max auto-refresh attempts reached, stopping...');
                stopAutoRefresh();
              }
              
              return nextCount;
            });
          }
        }
      
    }
    } catch (error) {
      console.error('Error refreshing transaction:', error.response);
      
      if (isAutoRefresh && autoRefreshCount >= 5) {
        console.log('⚠️ Multiple errors detected, stopping auto-refresh');
        stopAutoRefresh();
      }
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

 const shareReceipt = async () => {
  try {
    const text = generateShareText();
    await Share.share({ message: text });
  } catch (error) {
    console.log('Share error:', error);
    Alert.alert('Gagal', 'Tidak bisa membagikan struk.');
  }
};

const generateShareText = () => {
  const transactionId = getTransactionId();
  const dateTime = formatDateTime(); // hasil "24 Nov 2025 - 11:35"
  const [datePart, timePart] = dateTime.split(" - ");
  const productName = getProductName();
  const status = getTransactionStatus();
  const finalPrice = printPrice ? printPrice : getPrice();

  let text = 
`STRUK TRANSAKSI ${productName}

Tanggal : ${datePart}
Waktu   : ${timePart}
ID Transaksi : ${transactionId}

Status : ${status}

Produk : ${productName}
Nomor  : ${phoneNumber}
Harga  : Rp ${finalPrice}
`;

  // Token PLN (hanya kalau sukses)
  if (isPLNProduct() && isTransactionSuccessful()) {
    const token = extractPLNToken();
    if (token) {
      text += `\nToken PLN : ${token}\n`;
    }
  }

  text += `
Terima kasih telah menggunakan layanan kami`;

  return text;
};



  const handlePrintStruk = () => {
    setShowPrintModal(true);
    setPrintPrice(getPrice());
  };

  // =============== THERMAL PRINTER FUNCTIONS ===============
  
  const scanPrinters = async () => {
    try {
      const devices = await BLEPrinter.init();
      console.log('Found printers:', devices);
      setPrinters(devices);
      
      if (devices.length === 0) {
        Alert.alert('Info', 'Tidak ada printer ditemukan. Pastikan Bluetooth aktif dan printer sudah dinyalakan.');
      }
    } catch (error) {
      console.error('Scan error:', error);
      Alert.alert('Error', 'Gagal mencari printer');
    }
  };

  const connectPrinter = async (printer) => {
    try {
      await BLEPrinter.connectPrinter(printer.inner_mac_address || printer.address);
      setCurrentPrinter(printer);
      Alert.alert('Berhasil', `Terhubung ke ${printer.device_name || printer.name}`);
    } catch (error) {
      console.error('Connect error:', error);
      Alert.alert('Error', 'Gagal terhubung ke printer');
    }
  };

  const printStruk = async () => {
    if (!printPrice) {
      Alert.alert('Error', 'Masukkan harga jual');
      return;
    }

    if (!isAgen && !storeName.trim()) {
      Alert.alert('Error', 'Masukkan nama toko');
      return;
    }

    if (!currentPrinter) {
      await scanPrinters();
      return;
    }

    try {
      const transactionId = getTransactionId();
      const dateTime = formatDateTime();
      const productName = getProductName();
      const buyPrice = getPrice();
      const sellPrice = printPrice;
      const profit = parseFloat(sellPrice.replace(/\./g, '')) - parseFloat(buyPrice.replace(/\./g, ''));
      const displayStoreName = isAgen ? (agenData?.nama_konter || 'Toko Saya') : storeName;

      // Print with column formatting
      await BLEPrinter.printText(`\n`);
      await BLEPrinter.printText(`[C]<font size='big'>${displayStoreName}</font>\n`);
      await BLEPrinter.printText(`[C]${dateTime}\n`);
      await BLEPrinter.printText(`[C]--------------------------------\n`);
      
      // Transaction Info
      await BLEPrinter.printText(`[L]ID: ${transactionId}\n`);
      await BLEPrinter.printText(`[L]Status: ${getTransactionStatus()}\n`);
      await BLEPrinter.printText(`[C]--------------------------------\n`);
      
      // Product Info
      await BLEPrinter.printText(`[L]Produk:\n[L]${productName}\n`);
      await BLEPrinter.printText(`[L]Nomor: ${phoneNumber}\n`);
      await BLEPrinter.printText(`[C]--------------------------------\n`);
      
      // Price columns
      await BLEPrinter.printColumnsText(
        [`Harga Beli`, `Rp ${buyPrice}`],
        [1, 1],
        [BLEPrinter.ALIGN.LEFT, BLEPrinter.ALIGN.RIGHT],
        {}
      );
      
      await BLEPrinter.printColumnsText(
        [`Harga Jual`, `Rp ${sellPrice}`],
        [1, 1],
        [BLEPrinter.ALIGN.LEFT, BLEPrinter.ALIGN.RIGHT],
        {}
      );
      
      await BLEPrinter.printColumnsText(
        [`Keuntungan`, `Rp ${formatPrice(profit.toString())}`],
        [1, 1],
        [BLEPrinter.ALIGN.LEFT, BLEPrinter.ALIGN.RIGHT],
        {}
      );
      
      await BLEPrinter.printText(`[C]--------------------------------\n`);
      
      // Serial Number
      if (getSerialNumber()) {
        await BLEPrinter.printText(`[L]SN:\n`);
        await BLEPrinter.printText(`[L]${getSerialNumber()}\n`);
        await BLEPrinter.printText(`[C]--------------------------------\n`);
      }
      
      // PLN Token
      if (isPLNProduct() && isTransactionSuccessful() && extractPLNToken()) {
        await BLEPrinter.printText(`[C]<font size='big'>TOKEN PLN</font>\n`);
        await BLEPrinter.printText(`[C]<font size='tall'>${extractPLNToken()}</font>\n`);
        await BLEPrinter.printText(`[C]--------------------------------\n`);
      }
      
      // Footer
      await BLEPrinter.printText(`[C]Terima kasih atas\n`);
      await BLEPrinter.printText(`[C]pembelian Anda\n`);
      await BLEPrinter.printText(`[C]Powered by Ditokoku.id\n`);
      await BLEPrinter.printText(`\n\n\n`);

      setShowPrintModal(false);
      setPrintPrice('');
      setStoreName(isAgen ? agenData?.nama_konter || '' : '');
      
      Alert.alert('Berhasil', 'Struk berhasil dicetak');

    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Error', 'Gagal mencetak struk: ' + error.message);
    }
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
        <View style={styles.providerLogoContainer}>
          <Image
            source={providerLogo}
            style={styles.providerLogo}
            resizeMode="contain"
          />
        </View>

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

        <View style={styles.pendingBadge}>
          <View style={styles.pendingIconCircle}>
            <Icon name="time" size={12} color="#FFF" />
          </View>
          <Text style={styles.pendingBadgeText}>Transaksi Pending</Text>
        </View>

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

        <TouchableOpacity
          style={styles.backToHomeButton}
          onPress={() => navigation.replace('Home')}
        >
          <Text style={styles.backToHomeText}>Kembali Ke Beranda</Text>
        </TouchableOpacity>
      </>
    );
  };

  const renderCompletedContent = () => {
    return (
      <>
        <View style={styles.completedCard}>
          <View style={styles.completedCardHeader}>
            <Text style={styles.completedCardHeaderStatus}>
              {isTransactionSuccessful() ? 'Transaksi Berhasil' : 'Transaksi Gagal'}
            </Text>
            <Text style={styles.completedCardHeaderDate}>{formatDateTime()}</Text>
          </View>

          <View style={styles.completedCardBody}>
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

            {renderDetailRow('Nama Produk', getProductName())}
            {renderDivider()}
            {renderDetailRow('Nomor Telepon', phoneNumber)}
            {renderDivider()}
            {renderDetailRow('Harga', `Rp. ${getPrice()}`)}
            {renderDetailRow('Biaya Admin', 'Gratis!', true)}
            {renderDetailRow('Keterangan', getProductName())}
            {renderDivider()}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Pembayaran</Text>
              <Text style={styles.totalValue}>Rp {getPrice()}</Text>
            </View>

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

        <Text style={styles.bottomMessage}>
          {isTransactionSuccessful()
            ? 'Pembayaran anda telah berhasil.\nTerimakasih telah menggunakan O-Payment dari ditokoku.id untuk melakukan transaksi.'
            : 'Pembayaran gagal. Saldo telah dikembalikan ke akun Anda.'}
        </Text>

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

  const renderPrinterSelectionModal = () => {
    return (
      <Modal
        visible={printers ? printers.length > 0 && !currentPrinter : false}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPrinters([])}
      >
        <View style={styles.printModalOverlay}>
          <View style={styles.printModalContent}>
            <View style={styles.printModalHeader}>
              <Text style={styles.printModalTitle}>Pilih Printer</Text>
              <TouchableOpacity onPress={() => setPrinters([])}>
                <Icon name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.printerList}>
              {printers.map((printer, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.printerItem}
                  onPress={() => {
                    connectPrinter(printer);
                    setPrinters([]);
                  }}
                >
                  <Icon name="print" size={24} color="#2F318B" />
                  <View style={styles.printerInfo}>
                    <Text style={styles.printerName}>
                      {printer.device_name || printer.name || 'Unknown Printer'}
                    </Text>
                    <Text style={styles.printerAddress}>
                      {printer.inner_mac_address || printer.address || 'No Address'}
                    </Text>
                  </View>
                  <Icon name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
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

            <ScrollView style={styles.printModalBody}>
              {currentPrinter ? (
                <View style={styles.printerStatusConnected}>
                  <Icon name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.printerStatusText}>
                    Terhubung: {currentPrinter.device_name || currentPrinter.name}
                  </Text>
                  <TouchableOpacity onPress={() => setCurrentPrinter(null)}>
                    <Text style={styles.changePrinterText}>Ganti</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.scanPrinterButton}
                  onPress={scanPrinters}
                >
                  <Icon name="bluetooth" size={20} color="#2F318B" />
                  <Text style={styles.scanPrinterText}>Cari Printer Bluetooth</Text>
                </TouchableOpacity>
              )}

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

              {isAgen && (
                <View style={styles.printInputGroup}>
                  <Text style={styles.printInputLabel}>Nama Toko</Text>
                  <View style={styles.printInputDisabled}>
                    <Text style={styles.printInputDisabledText}>
                      {agenData?.nama_konter || 'Toko Agen'}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.printInputGroup}>
                <Text style={styles.printInputLabel}>Harga Beli</Text>
                <View style={styles.printInputDisabled}>
                  <Text style={styles.printInputDisabledText}>Rp {getPrice()}</Text>
                </View>
              </View>

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
            </ScrollView>

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

            <TouchableOpacity
              style={styles.sharePrintButton}
              onPress={shareReceipt}
            >
              <Icon name="share-social" size={20} color="#FFF" />
              <Text style={styles.sharePrintButtonText}>Share Struk</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <ViewShot ref={viewShotRef} style={{ flex: 1 }} options={{ format: 'png', quality: 0.9 }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {renderHeader()}
          {isTransactionPending() ? renderPendingContent() : renderCompletedContent()}
        </ScrollView>
      </ViewShot>

      {renderPrintModal()}
      {renderPrinterSelectionModal()}
    </View>
  );
}


const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFF' 
  },
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
  sharePrintButton: {
  flexDirection: 'row',
  backgroundColor: '#2196F3',
  borderRadius: 12,
  paddingVertical: 12,
  justifyContent: 'center',
  alignItems: 'center',
  marginTop: 10,
  width: '90%',
  alignSelf: 'center',
  gap: 8,
},
sharePrintButtonText: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#FFF',
  fontFamily: 'Poppins-Bold',
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
  bottomMessage: {
    fontSize: 10,
    color: '#808080',
    textAlign: 'center',
    marginHorizontal: 34,
    marginBottom: 50,
    fontFamily: 'Poppins-Regular',
  },
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
    maxHeight: '80%',
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
  printerList: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  printerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  printerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  printerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Poppins-SemiBold',
  },
  printerAddress: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Poppins-Regular',
  },
  printerStatusConnected: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  printerStatusText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#4CAF50',
    fontFamily: 'Poppins-Medium',
  },
  changePrinterText: {
    fontSize: 14,
    color: '#2F318B',
    fontFamily: 'Poppins-SemiBold',
  },
  scanPrinterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  scanPrinterText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#2F318B',
    fontFamily: 'Poppins-SemiBold',
  },
});