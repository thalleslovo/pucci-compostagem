import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const PALETTE = {
  verdePrimario: '#5D7261',
  verdeClaro: '#F0F5F0',
  branco: '#FFFFFF',
  preto: '#1A1A1A',
  cinza: '#666666',
};

export default function MedicaoTemperaturaScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medição de Temperatura</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        <Text style={styles.emoji}>🌡️</Text>
        <Text style={styles.title}>Em Desenvolvimento</Text>
        <Text style={styles.subtitle}>
          Esta funcionalidade será implementada em breve
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.verdeClaro,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: PALETTE.branco,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    fontWeight: '700',
    color: PALETTE.verdePrimario,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PALETTE.preto,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: PALETTE.preto,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: PALETTE.cinza,
    textAlign: 'center',
  },
});