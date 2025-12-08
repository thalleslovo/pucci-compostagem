import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TextInput } from '@/components/TextInput';
import { Button } from '@/components/Button';
import { authService } from '@/services/auth';

const PALETTE = {
  verdePrimario: '#5D7261',
  verdeClaro: '#F0F5F0',
  verdeClaro2: '#E8F0E8',
  verdeHover: '#4F6154',
  verdeSuave: '#7A8A7E',
  terracota: '#B16338',
  terracotaClaro: '#F5E8E0',
  branco: '#FFFFFF',
  preto: '#1A1A1A',
  cinza: '#666666',
  cinzaClaro: '#EEEEEE',
  erro: '#D32F2F',
  sucesso: '#4CAF50',
};

export default function LoginScreen() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasPIN, setHasPIN] = useState<boolean | null>(null);
  const [pinError, setPinError] = useState('');
  const [newPinError, setNewPinError] = useState('');
  const [confirmPinError, setConfirmPinError] = useState('');

  useEffect(() => {
    checkPIN();
  }, []);

  const checkPIN = async () => {
    try {
      const exists = await authService.hasPIN();
      setHasPIN(exists);
    } catch (error) {
      Alert.alert('Erro', 'Erro ao inicializar');
    }
  };

  const validatePIN = (value: string): boolean => {
    if (!value) {
      setPinError('Digite seu PIN');
      return false;
    }
    if (!/^\d{4,6}$/.test(value)) {
      setPinError('PIN deve ter 4 a 6 dígitos');
      return false;
    }
    setPinError('');
    return true;
  };

  const validateNewPIN = (newValue: string, confirmValue: string): boolean => {
    if (!newValue) {
      setNewPinError('Digite um PIN');
      return false;
    }
    if (!/^\d{4,6}$/.test(newValue)) {
      setNewPinError('PIN deve ter 4 a 6 dígitos');
      return false;
    }
    setNewPinError('');

    if (!confirmValue) {
      setConfirmPinError('Confirme seu PIN');
      return false;
    }
    if (newValue !== confirmValue) {
      setConfirmPinError('PINs não correspondem');
      return false;
    }
    setConfirmPinError('');
    return true;
  };

  // ===== FUNÇÃO CORRIGIDA: Salvar Operador =====
  const handleLogin = async () => {
    if (!validatePIN(pin)) return;

    setLoading(true);
    try {
      const isValid = await authService.validatePIN(pin);
      if (isValid) {
        // ✅ SALVAR OPERADOR NO ASYNCSTORAGE
        const operador = {
          id: 'operador-001',
          nome: 'Pucci Ambiental',
          pin: pin,
          logadoEm: new Date().toISOString(),
        };

        await AsyncStorage.setItem('operadorLogado', JSON.stringify(operador));
        console.log('✅ Operador salvo no AsyncStorage:', operador.nome);

        router.replace('/(app)');
      } else {
        Alert.alert('Erro', 'PIN incorreto');
        setPin('');
      }
    } catch (error) {
      console.error('❌ Erro ao fazer login:', error);
      Alert.alert('Erro', 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePIN = async () => {
    if (!validateNewPIN(newPin, confirmPin)) return;

    setLoading(true);
    try {
      await authService.setPIN(newPin);
      Alert.alert('Sucesso', 'PIN criado!');
      setNewPin('');
      setConfirmPin('');
      setHasPIN(true);
    } catch (error) {
      Alert.alert('Erro', 'Erro ao criar PIN');
    } finally {
      setLoading(false);
    }
  };

  if (hasPIN === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PALETTE.verdePrimario} />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.decoration} />

          <View style={styles.heroSection}>
            <View style={styles.logoBox}>
              <Text style={styles.logoEmoji}>🌱</Text>
            </View>
            <Text style={styles.mainTitle}>Campos Solo</Text>
            <Text style={styles.mainSubtitle}>Gestão Inteligente de Leiras </Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.mainContent}>
            {hasPIN ? (
              <LoginView
                pin={pin}
                pinError={pinError}
                loading={loading}
                onPinChange={(text) => {
                  const filtered = text.replace(/[^0-9]/g, '').slice(0, 6);
                  setPin(filtered);
                  setPinError('');
                }}
                onLogin={handleLogin}
              />
            ) : (
              <CreatePINView
                newPin={newPin}
                confirmPin={confirmPin}
                newPinError={newPinError}
                confirmPinError={confirmPinError}
                loading={loading}
                onNewPinChange={(text) => {
                  const filtered = text.replace(/[^0-9]/g, '').slice(0, 6);
                  setNewPin(filtered);
                  setNewPinError('');
                }}
                onConfirmPinChange={(text) => {
                  const filtered = text.replace(/[^0-9]/g, '').slice(0, 6);
                  setConfirmPin(filtered);
                  setConfirmPinError('');
                }}
                onCreatePIN={handleCreatePIN}
              />
            )}
          </View>

          <View style={styles.footerSection}>
            <Text style={styles.footerText}>© 2025 Campos Solo</Text>
            <Text style={styles.footerSubtext}>Gestão Agrícola Inteligente</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface LoginViewProps {
  pin: string;
  pinError: string;
  loading: boolean;
  onPinChange: (text: string) => void;
  onLogin: () => void;
}

function LoginView({ pin, pinError, loading, onPinChange, onLogin }: LoginViewProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>🔐</Text>
        </View>
        <View style={styles.headerTexts}>
          <Text style={styles.cardTitle}>Bem-vindo de Volta</Text>
          <Text style={styles.cardSubtitle}>Acesse seu sistema seguro</Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.formArea}>
        <Text style={styles.label}>PIN de Segurança</Text>
        <View style={styles.inputBox}>
          <Text style={styles.inputIcon}>🔑</Text>
          <TextInput
            label=""
            placeholder="• • • •"
            value={pin}
            onChangeText={onPinChange}
            keyboardType="number-pad"
            maxLength={6}
            secureTextEntry
            error={pinError}
          />
        </View>
        {pinError && <Text style={styles.errorMessage}>{pinError}</Text>}

        {pin.length > 0 && !pinError && (
          <View style={styles.pinIndicator}>
            {[...Array(6)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.pinDot,
                  i < pin.length && styles.pinDotActive,
                ]}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title={loading ? 'Entrando...' : 'Entrar no Sistema'}
          onPress={onLogin}
          loading={loading}
          disabled={loading || pin.length < 4}
          fullWidth
        />
      </View>
    </View>
  );
}

interface CreatePINViewProps {
  newPin: string;
  confirmPin: string;
  newPinError: string;
  confirmPinError: string;
  loading: boolean;
  onNewPinChange: (text: string) => void;
  onConfirmPinChange: (text: string) => void;
  onCreatePIN: () => void;
}

function CreatePINView({
  newPin,
  confirmPin,
  newPinError,
  confirmPinError,
  loading,
  onNewPinChange,
  onConfirmPinChange,
  onCreatePIN,
}: CreatePINViewProps) {
  const strengthPercent = newPin.length < 4 ? 33 : newPin.length < 6 ? 66 : 100;
  const strengthColor =
    newPin.length < 4 ? PALETTE.terracota : PALETTE.verdePrimario;
  const strengthLabel =
    newPin.length < 4 ? 'Fraco' : newPin.length < 6 ? 'Médio' : 'Forte';

  const pinsMatch = newPin === confirmPin && newPin.length >= 4;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>✨</Text>
        </View>
        <View style={styles.headerTexts}>
          <Text style={styles.cardTitle}>Configure Seu Acesso</Text>
          <Text style={styles.cardSubtitle}>Crie um PIN único e seguro</Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.formArea}>
        <Text style={styles.label}>Novo PIN (4-6 dígitos)</Text>
        <View style={styles.inputBox}>
          <Text style={styles.inputIcon}>🔑</Text>
          <TextInput
            label=""
            placeholder="• • • •"
            value={newPin}
            onChangeText={onNewPinChange}
            keyboardType="number-pad"
            maxLength={6}
            secureTextEntry
            error={newPinError}
          />
        </View>
        {newPinError && <Text style={styles.errorMessage}>{newPinError}</Text>}

        {newPin.length > 0 && (
          <View style={styles.strengthContainer}>
            <View style={styles.strengthBar}>
              <View
                style={[
                  styles.strengthFill,
                  { width: `${strengthPercent}%`, backgroundColor: strengthColor },
                ]}
              />
            </View>
            <Text style={styles.strengthLabel}>Força: {strengthLabel}</Text>
          </View>
        )}

        <Text style={[styles.label, { marginTop: 20 }]}>Confirmar PIN</Text>
        <View style={styles.inputBox}>
          <Text style={styles.inputIcon}>✓</Text>
          <TextInput
            label=""
            placeholder="• • • •"
            value={confirmPin}
            onChangeText={onConfirmPinChange}
            keyboardType="number-pad"
            maxLength={6}
            secureTextEntry
            error={confirmPinError}
          />
        </View>
        {confirmPinError && <Text style={styles.errorMessage}>{confirmPinError}</Text>}

        {pinsMatch && (
          <View style={styles.successContainer}>
            <Text style={styles.successEmoji}>✓</Text>
            <Text style={styles.successText}>PINs coincidem!</Text>
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title={loading ? 'Criando PIN...' : 'Criar PIN'}
          onPress={onCreatePIN}
          loading={loading}
          disabled={loading || newPin.length < 4 || confirmPin.length < 4}
          fullWidth
          variant="primary"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.branco,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: PALETTE.verdePrimario,
    fontWeight: '600',
  },
  decoration: {
    height: 140,
    backgroundColor: PALETTE.verdePrimario,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: -50,
    paddingHorizontal: 20,
    marginBottom: 30,
    zIndex: 10,
  },
  logoBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: PALETTE.branco,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PALETTE.verdePrimario,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 20,
  },
  logoEmoji: {
    fontSize: 52,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: PALETTE.preto,
    marginBottom: 6,
    textAlign: 'center',
  },
  mainSubtitle: {
    fontSize: 15,
    color: PALETTE.cinza,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
  },
  divider: {
    width: 50,
    height: 3,
    backgroundColor: PALETTE.terracota,
    borderRadius: 1.5,
  },
  mainContent: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  card: {
    backgroundColor: PALETTE.verdeClaro2,
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: PALETTE.verdeClaro,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: PALETTE.branco,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: PALETTE.verdePrimario,
  },
  headerIconText: {
    fontSize: 28,
  },
  headerTexts: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: PALETTE.verdePrimario,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: PALETTE.cinza,
    fontWeight: '500',
  },
  cardDivider: {
    height: 1,
    backgroundColor: PALETTE.verdeClaro,
    marginBottom: 20,
  },
  formArea: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE.verdePrimario,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.branco,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: PALETTE.verdePrimario,
    marginBottom: 10,
  },
  inputIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  errorMessage: {
    fontSize: 12,
    color: PALETTE.erro,
    fontWeight: '600',
    marginBottom: 10,
  },
  pinIndicator: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 10,
  },
  pinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PALETTE.verdeClaro,
    borderWidth: 1,
    borderColor: PALETTE.verdePrimario,
  },
  pinDotActive: {
    backgroundColor: PALETTE.verdePrimario,
  },
  strengthContainer: {
    marginTop: 12,
  },
  strengthBar: {
    height: 6,
    backgroundColor: PALETTE.verdeClaro,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 3,
  },
  strengthLabel: {
    fontSize: 11,
    color: PALETTE.cinza,
    fontWeight: '600',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.branco,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: PALETTE.sucesso,
  },
  successEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  successText: {
    fontSize: 12,
    color: PALETTE.sucesso,
    fontWeight: '600',
  },
  buttonContainer: {
    marginTop: 12,
  },
  footerSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE.verdePrimario,
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: PALETTE.cinza,
    fontWeight: '500',
  },
});