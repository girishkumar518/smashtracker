import React, { ReactNode } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator, View } from 'react-native';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}

export default function Button({ onPress, title, variant = 'primary', size = 'medium', style, textStyle, loading = false, disabled = false, icon }: ButtonProps) {
  const getBackgroundColor = () => {
    if (disabled) return '#CBD5E0';
    switch (variant) {
      case 'primary': return '#38A169';
      case 'secondary': return '#3182CE';
      case 'danger': return '#E53E3E';
      case 'outline': return 'transparent';
      default: return '#38A169';
    }
  };

  const getTextColor = () => {
    if (variant === 'outline') return '#38A169';
    return 'white';
  };

  const getBorder = () => {
    if (variant === 'outline') return { borderWidth: 1, borderColor: '#38A169' };
    return {};
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small': return { paddingVertical: 8, paddingHorizontal: 12 };
      case 'large': return { paddingVertical: 16, paddingHorizontal: 32 };
      default: return { paddingVertical: 12, paddingHorizontal: 24 };
    }
  };

  const getTextSize = () => {
     switch (size) {
       case 'small': return 14;
       case 'large': return 18;
       default: return 16;
     }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        getBorder(),
        getSizeStyles(),
        style,
      ]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.text, { color: getTextColor(), fontSize: getTextSize() }, textStyle]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
});
