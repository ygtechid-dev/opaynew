import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../context/APIUrl';

export default function SetNewPinScreen({ route, navigation }) {
  const { userId, onSuccess } = route.params;
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [isConfirmMode, setIsConfirmMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const maxPinLength = 6;

  const onNumberPressed = (number) => {
    if (isProcessing) return;

    if (!isConfirmMode) {
      if (newPin.length < maxPinLength) {
        const updatedPin = newPin + number;
        setNewPin(updatedPin);

        if (updatedPin.length === maxPinLength) {
          setTimeout(() => {
            setIsConfirmMode(true);
          }, 300);
        }
      }
    } else {
      if (confirmNewPin.length < maxPinLength) {
        const updatedConfirmPin = confirmNewPin + number;
        setConfirmNewPin(updatedConfirmPin);

        if (updatedConfirmPin.length === maxPinLength) {
          setTimeout(() => {
            checkPinMatch(newPin, updatedConfirmPin);
          }, 300);
        }
      }
    }
  };

  const onDeletePressed = () => {
    if (isProcessing) return;

    if (isConfirmMode) {
      if (confirmNewPin.length > 0) {
        setConfirmNewPin(confirmNewPin.slice(0, -1));
      }
    } else {
      if (newPin.length > 0) {
        setNewPin(newPin.slice(0, -1));
      }
    }
  };

  const checkPinMatch = async (original, confirm) => {
    if (original === confirm) {
      await saveNewPin(original);
    } else {
      Alert.alert('PIN Tidak Cocok', 'PIN yang Anda masukkan tidak sama');
      setNewPin('');
      setConfirmNewPin('');
      setIsConfirmMode(false);
    }
  };

  const saveNewPin = async (pin) => {
    setIsProcessing(true);

    try {
      const response = await axios.put(`${API_URL}/api/pin/update`, {
        user_id: userId,
        new_pin: pin,
      });

      if (response.data.success) {
        Alert.alert('PIN Berhasil Diubah', 'PIN Anda telah berhasil diubah', [
          {
            text: 'OK',
            onPress: () => {
              if (onSuccess) onSuccess();
              navigation.goBack();
            },
          },
        ]);
      } else {
        Alert.alert('Error', response.data.error || 'Gagal mengubah PIN');
      }
    } catch (error) {
      console.error('Update PIN Error:', error);
      Alert.alert('Error', 'Gagal mengubah PIN');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderNumberButton = (number) => {
    return (
      <TouchableOpacity
        key={number}
        style={styles.numberButton}
        onPress={() => onNumberPressed(number)}
        disabled={isProcessing}
        activeOpacity={0.7}
      >
        <Text
          style={[styles.numberButtonText, isProcessing && styles.disabledText]}
        >
          {number}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderDeleteButton = () => {
    return (
      <TouchableOpacity
        style={styles.numberButton}
        onPress={onDeletePressed}
        disabled={isProcessing}
        activeOpacity={0.7}
      >
        <Icon
          name="backspace-outline"
          size={24}
          color={isProcessing ? '#BDBDBD' : '#FFF'}
        />
      </TouchableOpacity>
    );
  };

  const currentPin = isConfirmMode ? confirmNewPin : newPin;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          disabled={isProcessing}
        >
          <Icon name="close" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isConfirmMode ? 'Ulangi PIN Baru' : 'Buat PIN Baru'}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Subtitle */}
      <Text style={styles.subtitle}>
        {isConfirmMode
          ? 'Masukkan kembali PIN baru Anda'
          : 'Masukkan PIN baru 6 digit'}
      </Text>

      {/* PIN Dots */}
      <View style={styles.pinDotsContainer}>
        {Array.from({ length: maxPinLength }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              index < currentPin.length && styles.pinDotFilled,
            ]}
          />
        ))}
      </View>

      {/* Number Pad */}
      <View style={styles.numberPad}>
        {[0, 1, 2].map((row) => (
          <View key={row} style={styles.numberRow}>
            {[1, 2, 3].map((col) => {
              const number = (row * 3 + col).toString();
              return renderNumberButton(number);
            })}
          </View>
        ))}

        <View style={styles.numberRow}>
          <View style={styles.numberButton} />
          {renderNumberButton('0')}
          {renderDeleteButton()}
        </View>
      </View>

      {isProcessing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFF" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2F318B',
    paddingVertical: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Poppins-Bold',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 40,
    fontFamily: 'Poppins-Regular',
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 60,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  pinDotFilled: {
    backgroundColor: '#FFF',
  },
  numberPad: {
    paddingHorizontal: 40,
  },
  numberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  numberButton: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Poppins-SemiBold',
  },
  disabledText: {
    opacity: 0.5,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(47, 49, 139, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});