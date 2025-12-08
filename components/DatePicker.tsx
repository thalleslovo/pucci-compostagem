// components/DatePicker.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ViewStyle,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '@/utils/constants';
import { Button } from './Button';

interface DatePickerProps {
  label?: string;
  value: Date;
  onDateChange: (date: Date) => void;
  error?: string;
  containerStyle?: ViewStyle;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  onDateChange,
  error,
  containerStyle,
  required = false,
  minDate,
  maxDate,
  placeholder = 'Selecione uma data',
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(value);

  const hasError = !!error;
  const borderColor = hasError ? COLORS.danger : COLORS.border;

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const handleConfirm = () => {
    onDateChange(tempDate);
    setShowPicker(false);
  };

  const handleCancel = () => {
    setTempDate(value);
    setShowPicker(false);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>
      )}

      <Pressable
        style={[
          styles.input,
          {
            borderColor,
            backgroundColor: COLORS.white,
          },
          hasError && styles.inputError,
        ]}
        onPress={() => setShowPicker(true)}
      >
        <Text
          style={[
            styles.dateText,
            !value && styles.placeholder,
          ]}
        >
          {value ? formatDate(value) : placeholder}
        </Text>

        <Text style={styles.icon}>📅</Text>
      </Pressable>

      {error && <Text style={styles.error}>{error}</Text>}

      {showPicker && (
        <Modal
          transparent
          animationType="slide"
          visible={showPicker}
          onRequestClose={handleCancel}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Selecione a Data</Text>
              </View>

              {/* DateTimePicker */}
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={minDate}
                  maximumDate={maxDate}
                  locale="pt-BR"
                  textColor={COLORS.text}
                />
              </View>

              {/* Data Selecionada */}
              <View style={styles.selectedDateContainer}>
                <Text style={styles.selectedDateLabel}>Data Selecionada:</Text>
                <Text style={styles.selectedDate}>
                  {formatDate(tempDate)}
                </Text>
              </View>

              {/* Botões */}
              <View style={styles.buttonsContainer}>
                <View style={styles.buttonWrapper}>
                  <Button
                    title="Cancelar"
                    variant="secondary"
                    onPress={handleCancel}
                    fullWidth
                  />
                </View>

                <View style={styles.buttonWrapper}>
                  <Button
                    title="Confirmar"
                    variant="primary"
                    onPress={handleConfirm}
                    fullWidth
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  required: {
    color: COLORS.danger,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
  },
  inputError: {
    borderColor: COLORS.danger,
    backgroundColor: '#FFEBEE',
  },
  dateText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  placeholder: {
    color: COLORS.gray,
  },
  icon: {
    fontSize: 20,
  },
  error: {
    marginTop: 6,
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  modalHeader: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  pickerContainer: {
    height: 200,
    justifyContent: 'center',
    marginBottom: 16,
  },
  selectedDateContainer: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  selectedDateLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 4,
  },
  selectedDate: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonWrapper: {
    flex: 1,
  },
});