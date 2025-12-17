// app/(app)/entrada-material.tsx

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    TextInput as RNTextInput,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '@/components/Button';
import { syncService } from '@/services/sync';
import { useFocusEffect } from '@react-navigation/native';

const PALETTE = {
    verdePrimario: '#5D7261',
    verdeClaro: '#F0F5F0',
    verdeClaro2: '#E8F0E8',
    terracota: '#B16338',
    branco: '#FFFFFF',
    preto: '#1A1A1A',
    cinza: '#666666',
    cinzaClaro: '#EEEEEE',
    cinzaClaro2: '#F5F5F5',
    erro: '#D32F2F',
    sucesso: '#4CAF50',
};

interface MaterialEntry {
    id: string;
    data: string;
    tipoMaterial: string;
    numeroMTR: string;
    peso: string;
    origem: string;
}

export default function EntradaMaterialScreen() {
    const router = useRouter();
    const [showForm, setShowForm] = useState(false);
    const [showModalNovaOrigem, setShowModalNovaOrigem] = useState(false);
    const [novaOrigemText, setNovaOrigemText] = useState('');
    const [entries, setEntries] = useState<MaterialEntry[]>([]);
    const [origens, setOrigens] = useState(['Sabesp', 'Ambient']);

    const [formData, setFormData] = useState({
        data: new Date().toLocaleDateString('pt-BR'),
        tipoMaterial: 'Biossólido',
        numeroMTR: '',
        peso: '',
        origem: 'Sabesp',
    });

    /*useFocusEffect(
        React.useCallback(() => {
            const sincronizarSeNecessario = async () => {
                try {
                    const temInternet = await syncService.verificarInternet();
                    if (temInternet) {
                        console.log('🌐 Internet detectada - sincronizando...');
                        await syncService.sincronizar();
                    } else {
                        console.log('📵 Sem internet - dados salvos localmente');
                    }
                } catch (error) {
                    console.error('Erro ao sincronizar:', error);
                }
            };

            sincronizarSeNecessario();
        }, [])
    );*/



    // ===== FORMATAR DATA =====
    const formatarData = (text: string) => {
        let formatted = text.replace(/\D/g, '');
        if (formatted.length <= 2) {
            return formatted;
        } else if (formatted.length <= 4) {
            return formatted.slice(0, 2) + '/' + formatted.slice(2);
        } else {
            return formatted.slice(0, 2) + '/' + formatted.slice(2, 4) + '/' + formatted.slice(4, 8);
        }
    };
    // ===== VALIDAR DATA =====
    const validarData = (data: string): boolean => {
        if (data.length !== 10) return false;
        const [dia, mês, ano] = data.split('/').map(Number);
        if (dia < 1 || dia > 31) return false;
        if (mês < 1 || mês > 12) return false;
        if (ano < 2025 || ano > 2100) return false;
        return true;
    };
    // ===== ADICIONAR NOVA ORIGEM =====
    const handleAddNovaOrigem = () => {
        if (!novaOrigemText.trim()) {
            Alert.alert('Erro', 'Digite o nome da origem');
            return;
        }

        if (origens.includes(novaOrigemText)) {
            Alert.alert('Aviso', 'Esta origem já existe');
            setNovaOrigemText('');
            return;
        }

        setOrigens([...origens, novaOrigemText]);
        setFormData({ ...formData, origem: novaOrigemText });
        setNovaOrigemText('');
        setShowModalNovaOrigem(false);
        Alert.alert('Sucesso', `Origem "${novaOrigemText}" adicionada!`);
    };

    // ===== TROCAR TIPO DE MATERIAL =====
    const handleTipoChange = (tipo: string) => {
        setFormData({
            ...formData,
            tipoMaterial: tipo,
            numeroMTR: '',
            origem: 'Sabesp',
        });
    };

    // ===== ADICIONAR MATERIAL =====
    const handleAddMaterial = async () => {
        // Validações obrigatórias
        if (!formData.data.trim()) {
            Alert.alert('Erro', 'Digite a data');
            return;
        }

        if (!validarData(formData.data)) {
            Alert.alert('Erro', 'Data inválida. Use o formato DD/MM/AAAA');
            return;
        }

        if (formData.tipoMaterial === 'Biossólido' && !formData.numeroMTR.trim()) {
            Alert.alert('Erro', 'Digite o número do MTR');
            return;
        }

        if (!formData.peso.trim()) {
            Alert.alert('Erro', 'Digite o peso');
            return;
        }
        if (parseFloat(formData.peso) <= 0) {
            Alert.alert('Erro', 'O peso deve ser maior que zero');
            return;
        }

        const newEntry: MaterialEntry = {
            id: Date.now().toString(),
            data: formData.data,
            tipoMaterial: formData.tipoMaterial,
            numeroMTR: formData.numeroMTR,
            peso: formData.peso,
            origem: formData.origem,
        };

        console.log('💾 ===== SALVANDO NOVO MATERIAL =====');
        console.log('💾 Dados do novo material:', newEntry);

        try {
            // ===== SALVAR NO ASYNCSTORAGE =====
            const registrosExistentes = await AsyncStorage.getItem('materiaisRegistrados');

            console.log('💾 Registros existentes (bruto):', registrosExistentes);

            const materiais = registrosExistentes ? JSON.parse(registrosExistentes) : [];

            console.log('💾 Materiais antes de adicionar:', materiais.length);

            materiais.push(newEntry);

            console.log('💾 Materiais depois de adicionar:', materiais.length);

            await AsyncStorage.setItem('materiaisRegistrados', JSON.stringify(materiais));

            console.log('✅ Material salvo com sucesso no AsyncStorage');

            // ===== ADICIONAR À FILA DE SINCRONIZAÇÃO =====
            await syncService.adicionarFila('material', newEntry);
            console.log('📤 Material adicionado à fila de sincronização');

            // ===== ATUALIZAR ESTADO LOCAL =====
            setEntries([newEntry, ...entries]);

            // ===== RESET DO FORMULÁRIO =====
            setFormData({
                data: new Date().toLocaleDateString('pt-BR'),
                tipoMaterial: 'Biossólido',
                numeroMTR: '',
                peso: '',
                origem: 'Sabesp',
            });

            setShowForm(false);
            Alert.alert(
                'Sucesso! ✅',
                'Material registrado!\n\nOs dados serão sincronizados com o servidor quando você conectar à internet.'
            );
        } catch (error) {
            console.error('❌ Erro ao salvar:', error);
            Alert.alert('Erro', 'Não foi possível salvar o material');
        }
    };
    // ===== CALCULAR TOTAIS =====
    const getTotalBiossólido = () => {
        return entries
            .filter((item) => item.tipoMaterial === 'Biossólido')
            .reduce((acc, item) => acc + (parseFloat(item.peso) || 0), 0);
    };

    const getTotalBagaço = () => {
        return entries
            .filter((item) => item.tipoMaterial === 'Bagaço de Cana')
            .reduce((acc, item) => acc + (parseFloat(item.peso) || 0), 0);
    };

    const getTotalPeso = () => {
        return entries.reduce((acc, item) => acc + (parseFloat(item.peso) || 0), 0);
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* ===== HEADER ===== */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Entrada de Material</Text>
                    <View style={styles.backButton} />
                </View>

                {/* ===== INFO BOX ===== */}
                <View style={styles.infoBox}>
                    <Text style={styles.infoIcon}>🚚</Text>
                    <View style={styles.infoContent}>
                        <Text style={styles.infoTitle}>Registre cada entrada</Text>
                        <Text style={styles.infoText}>Biossólido ou Bagaço de Cana</Text>
                    </View>
                </View>

                {/* ===== STATS ===== */}
                <View style={styles.statsContainer}>
                    <StatBox
                        label="Total Registrado"
                        value={entries.length.toString()}
                        unit="entradas"
                        color={PALETTE.verdePrimario}
                    />
                    <StatBox
                        label="Biossólido"
                        value={getTotalBiossólido().toFixed(1)}
                        unit="ton"
                        color={PALETTE.terracota}
                    />
                    <StatBox
                        label="Bagaço de Cana"
                        value={getTotalBagaço().toFixed(1)}
                        unit="ton"
                        color={PALETTE.sucesso}
                    />
                    <StatBox
                        label="Peso Total"
                        value={getTotalPeso().toFixed(1)}
                        unit="ton"
                        color={PALETTE.cinza}
                    />
                </View>

                {/* ===== FORM SECTION ===== */}
                {showForm ? (
                    <View style={styles.formCard}>
                        <Text style={styles.formTitle}>Registrar Novo Material</Text>

                        {/* DATA SEM DATEPICKER */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Data de Chegada</Text>
                            <View style={styles.inputBox}>
                                <Text style={styles.inputIcon}>📅</Text>
                                <RNTextInput
                                    style={styles.input}
                                    placeholder="DD/MM/AAAA"
                                    value={formData.data}
                                    onChangeText={(text) => {
                                        const formatted = formatarData(text);
                                        setFormData({ ...formData, data: formatted });
                                    }}
                                    maxLength={10}
                                    keyboardType="numeric"
                                />
                            </View>
                            <Text style={styles.hint}>Digite no formato DD/MM/AAAA (a partir de 2025)</Text>
                        </View>

                        {/* TIPO DE MATERIAL */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Tipo de Material</Text>
                            <View style={styles.optionsRow}>
                                {['Biossólido', 'Bagaço de Cana'].map((tipo) => (
                                    <TouchableOpacity
                                        key={tipo}
                                        style={[
                                            styles.optionBtn,
                                            formData.tipoMaterial === tipo && styles.optionBtnActive,
                                        ]}
                                        onPress={() => handleTipoChange(tipo)}
                                    >
                                        <Text
                                            style={[
                                                styles.optionText,
                                                formData.tipoMaterial === tipo &&
                                                styles.optionTextActive,
                                            ]}
                                        >
                                            {tipo === 'Biossólido' ? '💧' : '🌾'} {tipo}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* MTR - APENAS PARA BIOSSÓLIDO */}
                        {formData.tipoMaterial === 'Biossólido' && (
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Número do MTR</Text>
                                <View style={styles.inputBox}>
                                    <Text style={styles.inputIcon}>🔢</Text>
                                    <RNTextInput
                                        style={styles.input}
                                        placeholder="Ex: MTR-2025-0001"
                                        value={formData.numeroMTR}
                                        onChangeText={(text) =>
                                            setFormData({ ...formData, numeroMTR: text })
                                        }
                                    />
                                </View>
                            </View>
                        )}

                        {/* PESO */}
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Peso (Toneladas)</Text>
                            <View style={styles.inputBox}>
                                <Text style={styles.inputIcon}>⚖️</Text>
                                <RNTextInput
                                    style={styles.input}
                                    placeholder="Ex: 15"
                                    value={formData.peso}
                                    onChangeText={(text) =>
                                        setFormData({ ...formData, peso: text })
                                    }
                                    keyboardType="decimal-pad"
                                />
                            </View>
                        </View>

                        {/* ORIGEM - APENAS PARA BIOSSÓLIDO */}
                        {formData.tipoMaterial === 'Biossólido' && (
                            <View style={styles.formGroup}>
                                <View style={styles.labelHeader}>
                                    <Text style={styles.label}>Origem</Text>
                                    <TouchableOpacity
                                        onPress={() => setShowModalNovaOrigem(true)}
                                        style={styles.addOrigemBtn}
                                    >
                                        <Text style={styles.addOrigemIcon}>+</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.optionsColumn}>
                                    {origens.map((origem) => (
                                        <TouchableOpacity
                                            key={origem}
                                            style={[
                                                styles.optionBtn,
                                                formData.origem === origem && styles.optionBtnActive,
                                            ]}
                                            onPress={() =>
                                                setFormData({ ...formData, origem })
                                            }
                                        >
                                            <Text
                                                style={[
                                                    styles.optionText,
                                                    formData.origem === origem &&
                                                    styles.optionTextActive,
                                                ]}
                                            >
                                                {origem}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* BUTTONS */}
                        <View style={styles.buttonGroup}>
                            <Button
                                title="Cancelar"
                                onPress={() => setShowForm(false)}
                                fullWidth
                            />
                            <View style={styles.buttonSpacer} />
                            <Button
                                title="Registrar Material"
                                onPress={handleAddMaterial}
                                fullWidth
                                variant="primary"
                            />
                        </View>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => setShowForm(true)}
                    >
                        <Text style={styles.addBtnIcon}>+</Text>
                        <Text style={styles.addBtnText}>Adicionar Novo Material</Text>
                    </TouchableOpacity>
                )}

                {/* ===== LIST SECTION ===== */}
                <View style={styles.listSection}>
                    <Text style={styles.listTitle}>Últimas Entradas</Text>

                    {entries.length > 0 ? (
                        entries.map((item) => (
                            <MaterialCard key={item.id} item={item} />
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>📭</Text>
                            <Text style={styles.emptyText}>Nenhum material registrado ainda</Text>
                            <Text style={styles.emptySubtext}>
                                Clique em "Adicionar Novo Material" para começar
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* ===== MODAL NOVA ORIGEM ===== */}
            <Modal
                visible={showModalNovaOrigem}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    setNovaOrigemText('');
                    setShowModalNovaOrigem(false);
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Adicionar Nova Origem</Text>

                        <Text style={styles.modalLabel}>Nome da Origem do Biossólido</Text>
                        <View style={styles.modalInputBox}>
                            <Text style={styles.modalIcon}>📍</Text>
                            <RNTextInput
                                style={styles.modalInput}
                                placeholder="Ex: CETESB, ETE Franca, Ambient Ribeirão, etc"
                                value={novaOrigemText}
                                onChangeText={setNovaOrigemText}
                                autoFocus
                                placeholderTextColor={PALETTE.cinza}
                            />
                        </View>

                        <Text style={styles.modalHint}>
                            Digite o nome do local onde vem o biossólido
                        </Text>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalBtnCancelar}
                                onPress={() => {
                                    setNovaOrigemText('');
                                    setShowModalNovaOrigem(false);
                                }}
                            >
                                <Text style={styles.modalBtnCancelarText}>Cancelar</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.modalBtnConfirmar}
                                onPress={handleAddNovaOrigem}
                            >
                                <Text style={styles.modalBtnConfirmarText}>Adicionar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
// ===== MONITORAR INTERNET E SINCRONIZAR =====
// ===== SINCRONIZAR AO ENTRAR NA TELA =====


// ===== COMPONENTE: STAT BOX =====
function StatBox({
    label,
    value,
    unit,
    color,
}: {
    label: string;
    value: string;
    unit: string;
    color: string;
}) {
    return (
        <View style={[styles.statBox, { borderTopColor: color }]}>
            <Text style={styles.statBoxLabel}>{label}</Text>
            <View style={styles.statBoxValue}>
                <Text style={[styles.statBoxNumber, { color }]}>{value}</Text>
                <Text style={styles.statBoxUnit}>{unit}</Text>
            </View>
        </View>
    );
}

// ===== COMPONENTE: MATERIAL CARD =====
function MaterialCard({ item }: { item: MaterialEntry }) {
    const getTipoIcon = (tipo: string) => {
        return tipo === 'Biossólido' ? '💧' : '🌾';
    };

    const getOrigemIcon = (origem: string) => {
        return origem === 'Sabesp' ? '💧' : '🏭';
    };

    return (
        <View style={styles.materialCard}>
            <View style={styles.materialCardHeader}>
                <View style={styles.materialCardLeft}>
                    <Text style={styles.materialCardIcon}>{getTipoIcon(item.tipoMaterial)}</Text>
                    <View style={styles.materialCardInfo}>
                        <Text style={styles.materialCardTitle}>{item.tipoMaterial}</Text>
                        <Text style={styles.materialCardDate}>{item.data}</Text>
                    </View>
                </View>

                {item.tipoMaterial === 'Biossólido' && (
                    <View style={styles.materialCardBadge}>
                        <Text style={styles.materialCardBadgeIcon}>
                            {getOrigemIcon(item.origem)}
                        </Text>
                        <Text style={styles.materialCardBadgeText}>{item.origem}</Text>
                    </View>
                )}
            </View>

            <View style={styles.materialCardDetails}>
                {item.tipoMaterial === 'Biossólido' && (
                    <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>MTR</Text>
                        <Text style={styles.detailValue}>{item.numeroMTR}</Text>
                    </View>
                )}
                <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Peso</Text>
                    <Text style={styles.detailValue}>{item.peso} ton</Text>
                </View>
            </View>
        </View>
    );
}

// ===== STYLES =====
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: PALETTE.verdeClaro,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 30,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: PALETTE.branco,
        borderBottomWidth: 1,
        borderBottomColor: PALETTE.cinzaClaro2,
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
    infoBox: {
        flexDirection: 'row',
        backgroundColor: PALETTE.branco,
        marginHorizontal: 20,
        marginTop: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        borderLeftWidth: 4,
        borderLeftColor: PALETTE.terracota,
    },
    infoIcon: {
        fontSize: 32,
        marginRight: 12,
    },
    infoContent: {
        flex: 1,
    },
    infoTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: PALETTE.preto,
        marginBottom: 4,
    },
    infoText: {
        fontSize: 12,
        color: PALETTE.cinza,
    },
    statsContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
        gap: 10,
    },
    statBox: {
        backgroundColor: PALETTE.branco,
        borderRadius: 12,
        padding: 14,
        borderTopWidth: 3,
    },
    statBoxLabel: {
        fontSize: 11,
        color: PALETTE.cinza,
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statBoxValue: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
    },
    statBoxNumber: {
        fontSize: 22,
        fontWeight: '800',
    },
    statBoxUnit: {
        fontSize: 11,
        color: PALETTE.cinza,
        fontWeight: '600',
    },
    formCard: {
        backgroundColor: PALETTE.branco,
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 16,
        padding: 20,
        borderTopWidth: 3,
        borderTopColor: PALETTE.verdePrimario,
    },
    formTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: PALETTE.preto,
        marginBottom: 20,
    },
    formGroup: {
        marginBottom: 18,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: PALETTE.verdePrimario,
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    labelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PALETTE.cinzaClaro2,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderWidth: 1.5,
        borderColor: PALETTE.verdePrimario,
    },
    inputIcon: {
        fontSize: 18,
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 14,
        color: PALETTE.preto,
        fontWeight: '600',
    },
    hint: {
        fontSize: 11,
        color: PALETTE.cinza,
        fontStyle: 'italic',
        marginTop: 6,
    },
    optionsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    optionsColumn: {
        gap: 10,
    },
    optionBtn: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: PALETTE.cinzaClaro2,
        borderWidth: 1.5,
        borderColor: PALETTE.cinzaClaro2,
        alignItems: 'center',
    },
    optionBtnActive: {
        backgroundColor: PALETTE.verdeClaro2,
        borderColor: PALETTE.verdePrimario,
    },
    optionText: {
        fontSize: 12,
        fontWeight: '600',
        color: PALETTE.cinza,
    },
    optionTextActive: {
        color: PALETTE.verdePrimario,
    },
    addOrigemBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: PALETTE.terracota,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addOrigemIcon: {
        fontSize: 16,
        fontWeight: '700',
        color: PALETTE.branco,
    },
    buttonGroup: {
        marginTop: 20,
    },
    buttonSpacer: {
        height: 10,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 20,
        marginBottom: 20,
        backgroundColor: PALETTE.verdePrimario,
        borderRadius: 12,
        paddingVertical: 14,
        gap: 8,
    },
    addBtnIcon: {
        fontSize: 24,
        fontWeight: '700',
        color: PALETTE.branco,
    },
    addBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: PALETTE.branco,
    },
    listSection: {
        paddingHorizontal: 20,
    },
    listTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: PALETTE.preto,
        marginBottom: 12,
    },
    materialCard: {
        backgroundColor: PALETTE.branco,
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: PALETTE.verdePrimario,
    },
    materialCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    materialCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    materialCardIcon: {
        fontSize: 28,
        marginRight: 12,
    },
    materialCardInfo: {
        flex: 1,
    },
    materialCardTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: PALETTE.preto,
    },
    materialCardDate: {
        fontSize: 11,
        color: PALETTE.cinza,
        marginTop: 2,
    },
    materialCardBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PALETTE.verdeClaro2,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    materialCardBadgeIcon: {
        fontSize: 14,
    },
    materialCardBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: PALETTE.verdePrimario,
    },
    materialCardDetails: {
        flexDirection: 'row',
        gap: 12,
    },
    detailItem: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 10,
        color: PALETTE.cinza,
        fontWeight: '500',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    detailValue: {
        fontSize: 13,
        fontWeight: '700',
        color: PALETTE.preto,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '700',
        color: PALETTE.preto,
        marginBottom: 6,
    },
    emptySubtext: {
        fontSize: 12,
        color: PALETTE.cinza,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalContent: {
        backgroundColor: PALETTE.branco,
        borderRadius: 16,
        padding: 24,
        width: '100%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: PALETTE.preto,
        marginBottom: 20,
        textAlign: 'center',
    },
    modalLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: PALETTE.verdePrimario,
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    modalInputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PALETTE.cinzaClaro2,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderWidth: 1.5,
        borderColor: PALETTE.verdePrimario,
        marginBottom: 12,
    },
    modalIcon: {
        fontSize: 18,
        marginRight: 10,
    },
    modalInput: {
        flex: 1,
        fontSize: 14,
        color: PALETTE.preto,
        fontWeight: '600',
    },
    modalHint: {
        fontSize: 11,
        color: PALETTE.cinza,
        fontStyle: 'italic',
        marginBottom: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalBtnCancelar: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: PALETTE.cinzaClaro2,
        alignItems: 'center',
    },
    modalBtnCancelarText: {
        fontSize: 14,
        fontWeight: '700',
        color: PALETTE.cinza,
    },
    modalBtnConfirmar: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: PALETTE.verdePrimario,
        alignItems: 'center',
    },
    modalBtnConfirmarText: {
        fontSize: 14,
        fontWeight: '700',
        color: PALETTE.branco,
    },
});