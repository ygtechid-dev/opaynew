import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function TopUpPage({ navigation }) {
  // Data metode pembayaran
  const paymentMethods = [
    // Virtual Account
    {
      category: 'Virtual Account',
      methods: [
        {
          name: 'BCA Virtual Account',
          code: 'BCAVA',
          logo: require('../assets/bca_logo.png'),
        },
        {
          name: 'BRI Virtual Account',
          code: 'BRIVA',
          logo: require('../assets/bri_logo.png'),
        },
        {
          name: 'BNI Virtual Account',
          code: 'BNIVA',
          logo: require('../assets/bni_logo.png'),
        },
        {
          name: 'Mandiri Virtual Account',
          code: 'MANDIRIVA',
          logo: require('../assets/mandiri_logo.png'),
        },
        {
          name: 'Permata Virtual Account',
          code: 'PERMATAVA',
          logo: require('../assets/permata_logo.jpg'),
        },
        {
          name: 'BSI Virtual Account',
          code: 'BSIVA',
          logo: require('../assets/bsi_logo.png'),
        },
        {
          name: 'CIMB Virtual Account',
          code: 'CIMBVA',
          logo: require('../assets/cimb_logo.png'),
        },
        {
          name: 'Muamalat Virtual Account',
          code: 'MUAMALATVA',
          logo: require('../assets/muamalat_logo.jpg'),
        },
        {
          name: 'Danamon Virtual Account',
          code: 'DANAMONVA',
          logo: require('../assets/danamon_logo.png'),
        },
        {
          name: 'OCBC NISP Virtual Account',
          code: 'OCBCVA',
          logo: require('../assets/ocbc_logo.png'),
        },
        {
          name: 'Bank Lain',
          code: 'BANKLAIN',
          logo: require('../assets/banklain_logo.png'),
        },
      ],
    },
    // Convenience Store
    {
      category: 'Convenience Store',
      methods: [
        {
          name: 'Alfamart',
          code: 'ALFAMART',
          logo: require('../assets/alfamart_logo.png'),
        },
        {
          name: 'Indomaret',
          code: 'INDOMARET',
          logo: require('../assets/indomaret_logo.png'),
        },
        {
          name: 'Alfamidi',
          code: 'ALFAMIDI',
          logo: require('../assets/alfamidi_logo.png'),
        },
      ],
    },
    // E-Wallet
    {
      category: 'E-Wallet',
      methods: [
        {
          name: 'QRIS',
          code: 'QRIS',
          logo: require('../assets/qris_logo.png'),
        },
      ],
    },
  ];

  const handleSelectPaymentMethod = (method) => {
    navigation.navigate('TopUpAmountPage', {
      paymentMethod: method.name,
      paymentCode: method.code,
      logoPath: method.logo,
      isFromAgentRegistration: false,
    });
  };

  const renderPaymentMethodItem = (method, isLast) => {
    return (
      <TouchableOpacity
        key={method.code}
        style={[
          styles.paymentMethodItem,
          !isLast && styles.paymentMethodItemBorder,
        ]}
        onPress={() => handleSelectPaymentMethod(method)}
        activeOpacity={0.7}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={method.logo}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Name */}
        <Text style={styles.methodName}>{method.name}</Text>

        {/* Arrow */}
        <Icon name="chevron-forward" size={16} color="#BDBDBD" />
      </TouchableOpacity>
    );
  };

  const renderPaymentCategory = (category) => {
    return (
      <View key={category.category} style={styles.categoryContainer}>
        {/* Category Title */}
        <Text style={styles.categoryTitle}>{category.category}</Text>

        {/* Methods Container */}
        <View style={styles.methodsContainer}>
          {category.methods.map((method, index) =>
            renderPaymentMethodItem(
              method,
              index === category.methods.length - 1
            )
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image
            source={require('../assets/goback.png')}
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Isi Saldo</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Header */}
        <View style={styles.infoCard}>
          <View style={styles.iconCircle}>
            <Icon name="wallet" size={28} color="#1976D2" />
          </View>

          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>Pilih Metode Pembayaran</Text>
            <Text style={styles.infoSubtitle}>
              Pilih metode pembayaran untuk mengisi saldo
            </Text>
          </View>
        </View>

        {/* Payment Methods */}
        {paymentMethods.map((category) => renderPaymentCategory(category))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: '#FFF',
  },
  backIcon: {
    width: 31,
    height: 31,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Poppins-Bold',
  },
  headerSpacer: {
    width: 31,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
    fontFamily: 'Poppins-Bold',
  },
  infoSubtitle: {
    fontSize: 14,
    color: '#757575',
    fontFamily: 'Poppins-Regular',
  },
  categoryContainer: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
    fontFamily: 'Poppins-Bold',
  },
  methodsContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  paymentMethodItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  logoContainer: {
    width: 50,
    height: 50,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  logo: {
    width: 40,
    height: 40,
  },
  methodName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    fontFamily: 'Poppins-Medium',
  },
});