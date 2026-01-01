import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import { API_URL } from '../context/APIUrl';

export default function TermsConditionsPage({ route, navigation }) {
  const { minTopup, onAgree } = route.params;

  const scrollViewRef = useRef(null);

  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [bottomHeight, setBottomHeight] = useState(120); // ⬅️ NEW: tinggi bottom otomatis
  const [snkData, setSnkData] = useState([]);
  const [isLoadingSnk, setIsLoadingSnk] = useState(true);

  useEffect(() => {
    fetchSnkData();
  }, []);

  const fetchSnkData = async () => {
    setIsLoadingSnk(true);
    try {
      const response = await axios.get(`${API_URL}/api/snk-agen`);
      if (response.data.status === true && response.data.data) {
        setSnkData(response.data.data);
      } else {
        setSnkData([]);
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Gagal memuat data Syarat & Ketentuan.',
        [
          { text: 'Retry', onPress: () => fetchSnkData() },
          { text: 'Batal', onPress: () => navigation.goBack(), style: 'cancel' },
        ]
      );
    } finally {
      setIsLoadingSnk(false);
    }
  };

  // FIX — scroll detector paling akurat
  const isCloseToBottom = ({ layoutMeasurement, contentOffset, contentSize }) => {
    return layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
  };

  const handleScroll = ({ nativeEvent }) => {
    if (isCloseToBottom(nativeEvent)) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAgree = () => {
    navigation.goBack();
    if (onAgree) onAgree();
  };

  const handleCancel = () => navigation.goBack();

  const formatCurrency = (amount) =>
    (parseInt(amount) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  const renderSection = (title, items) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item, index) => (
        <View key={index} style={styles.itemRow}>
          <View style={styles.bullet} />
          <Text style={styles.itemText}>{item}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
          <Icon name="close" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Syarat & Ketentuan</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.divider} />

      {/* CONTENT */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomHeight / 2 }  // ⬅️ FIX SCROLL
        ]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {isLoadingSnk ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2F318B" />
            <Text style={styles.loadingText}>Memuat Syarat & Ketentuan...</Text>
          </View>
        ) : snkData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="document-text-outline" size={64} color="#BDBDBD" />
            <Text style={styles.emptyText}>Tidak ada data SNK</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchSnkData}>
              <Icon name="refresh" size={20} color="#2F318B" />
              <Text style={styles.retryButtonText}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.mainTitle}>
              Syarat & Ketentuan{'\n'}Agen Platinum Opayment
            </Text>

            {snkData.map((section, index) => (
              <View key={index}>
                {renderSection(`${section.order}. ${section.title}`, section.items)}
              </View>
            ))}

            <View style={styles.infoBox}>
              <Icon
                name="information-circle-outline"
                size={20}
                color="#1976D2"
                style={styles.infoIcon}
              />
              <Text style={styles.infoText}>
                Dengan mendaftar sebagai Agen Platinum Opayment, Anda menyetujui
                seluruh syarat dan wajib topup minimal Rp {formatCurrency(minTopup)}.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* BOTTOM SECTION */}
      {!isLoadingSnk && snkData.length > 0 && (
        <View
          style={styles.bottomSection}
          onLayout={(e) => setBottomHeight(e.nativeEvent.layout.height)} // ⬅️ FIX
        >
          {!hasScrolledToBottom && (
            <View style={styles.scrollIndicator}>
              <Icon name="arrow-down" size={20} color="#F57C00" />
              <Text style={styles.scrollIndicatorText}>
                Scroll ke bawah untuk membaca semua ketentuan
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.agreeButton,
              !hasScrolledToBottom && styles.agreeButtonDisabled,
            ]}
            onPress={handleAgree}
            disabled={!hasScrolledToBottom}
          >
            <Text
              style={[
                styles.agreeButtonText,
                !hasScrolledToBottom && styles.agreeButtonTextDisabled,
              ]}
            >
              Setuju dan Lanjutkan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Batalkan</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
  },
  closeButton: { padding: 4 },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'Poppins-Bold',
  },
  headerSpacer: { width: 32 },

  divider: { height: 1, backgroundColor: '#E0E0E0' },

  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },

  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100,
  },
  loadingText: { fontSize: 14, color: '#757575', marginTop: 16 },

  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100,
  },
  emptyText: { fontSize: 14, marginTop: 16 },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: { marginLeft: 8, color: '#2F318B', fontWeight: '600' },

  mainTitle: {
    fontSize: 24, fontWeight: 'bold', marginBottom: 30, color: '#000',
  },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  itemRow: { flexDirection: 'row', marginBottom: 8 },
  bullet: {
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: '#757575', marginTop: 8, marginRight: 8,
  },
  itemText: { flex: 1, fontSize: 14, color: '#424242' },

  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  infoIcon: { marginRight: 8 },
  infoText: { flex: 1, color: '#0D47A1', fontSize: 13 },

  bottomSection: {
    padding: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },

  scrollIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  scrollIndicatorText: { marginLeft: 8, color: '#E65100', fontSize: 13 },

  agreeButton: {
    backgroundColor: '#2F318B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  agreeButtonDisabled: { backgroundColor: '#E0E0E0' },
  agreeButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  agreeButtonTextDisabled: { color: '#AAA' },

  cancelButton: { paddingVertical: 12, alignItems: 'center' },
  cancelButtonText: { color: '#9E9E9E', fontSize: 16 },
});

