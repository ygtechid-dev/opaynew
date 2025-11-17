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
  const [snkData, setSnkData] = useState([]);
  const [isLoadingSnk, setIsLoadingSnk] = useState(true);

  // ✅ Fetch SNK data saat component mount
  useEffect(() => {
    fetchSnkData();
  }, []);

  const fetchSnkData = async () => {
    setIsLoadingSnk(true);
    console.log('🔄 Fetching SNK data...');

    try {
      const response = await axios.get(`${API_URL}/api/snk-agen`);

      console.log('SNK Response:', response.data);

      if (response.data.status === true && response.data.data) {
        console.log('✅ SNK data loaded:', response.data.data.length, 'sections');
        setSnkData(response.data.data);
      } else {
        console.log('⚠️ SNK data empty or invalid');
        setSnkData([]);
      }
    } catch (error) {
      console.error('❌ Error fetching SNK:', error);
      Alert.alert(
        'Error',
        'Gagal memuat data Syarat & Ketentuan. Silakan coba lagi.',
        [
          {
            text: 'Retry',
            onPress: () => fetchSnkData(),
          },
          {
            text: 'Batal',
            onPress: () => navigation.goBack(),
            style: 'cancel',
          },
        ]
      );
    } finally {
      setIsLoadingSnk(false);
      console.log('✅ SNK loading finished');
    }
  };

  const isCloseToBottom = ({ layoutMeasurement, contentOffset, contentSize }) => {
    const paddingToBottom = 50;
    return (
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom
    );
  };

  const handleScroll = ({ nativeEvent }) => {
    if (isCloseToBottom(nativeEvent) && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
      console.log('✅ User scrolled to bottom');
    }
  };

  const formatCurrency = (amount) => {
    const number = parseInt(amount) || 0;
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleAgree = () => {
    console.log('✅ User agreed to terms');
    navigation.goBack();
    if (onAgree) {
      onAgree();
    }
  };

  const handleCancel = () => {
    console.log('❌ User cancelled');
    navigation.goBack();
  };

  const renderSection = (title, items) => {
    return (
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
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
          <Icon name="close" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Syarat & Ketentuan</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.divider} />

      {/* Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={400}
        showsVerticalScrollIndicator={true}
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
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchSnkData}
            >
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
                {renderSection(
                  `${section.order}. ${section.title}`,
                  section.items
                )}
              </View>
            ))}

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Icon
                name="information-circle-outline"
                size={20}
                color="#1976D2"
                style={styles.infoIcon}
              />
              <Text style={styles.infoText}>
                Dengan mendaftar sebagai Agen Platinum Opayment, Anda dianggap
                telah menyetujui seluruh syarat dan ketentuan yang berlaku serta
                bersedia isi saldo minimal Rp {formatCurrency(minTopup)}.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom Button Section */}
      {!isLoadingSnk && snkData.length > 0 && (
        <View style={styles.bottomSection}>
          {/* Scroll Indicator */}
          {!hasScrolledToBottom && (
            <View style={styles.scrollIndicator}>
              <Icon name="arrow-down" size={20} color="#F57C00" />
              <Text style={styles.scrollIndicatorText}>
                Scroll ke bawah untuk membaca semua ketentuan
              </Text>
            </View>
          )}

          {/* Agree Button */}
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

          {/* Cancel Button */}
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Batalkan</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'Poppins-Bold',
  },
  headerSpacer: {
    width: 32,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    fontSize: 14,
    color: '#757575',
    marginTop: 16,
    fontFamily: 'Poppins-Regular',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 16,
    marginBottom: 20,
    fontFamily: 'Poppins-Regular',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  retryButtonText: {
    fontSize: 14,
    color: '#2F318B',
    marginLeft: 8,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    lineHeight: 32,
    letterSpacing: 0.3,
    marginBottom: 30,
    fontFamily: 'Poppins-Bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
    fontFamily: 'Poppins-Bold',
  },
  itemRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#757575',
    marginTop: 8,
    marginRight: 8,
  },
  itemText: {
    flex: 1,
    fontSize: 14,
    color: '#424242',
    lineHeight: 21,
    fontFamily: 'Poppins-Regular',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#90CAF9',
    padding: 16,
    marginTop: 20,
    marginBottom: 30,
  },
  infoIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#0D47A1',
    lineHeight: 18,
    fontFamily: 'Poppins-Medium',
  },
  bottomSection: {
    padding: 20,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  scrollIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB74D',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  scrollIndicatorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#E65100',
    marginLeft: 8,
    fontFamily: 'Poppins-Medium',
  },
  agreeButton: {
    backgroundColor: '#2F318B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  agreeButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  agreeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Poppins-SemiBold',
  },
  agreeButtonTextDisabled: {
    color: '#9E9E9E',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9E9E9E',
    fontFamily: 'Poppins-Medium',
  },
});