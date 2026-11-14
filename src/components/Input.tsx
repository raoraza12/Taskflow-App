import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography } from '../constants/colors';
import { useApp } from '../context/AppContext';
import { THEMES } from '../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  isPassword?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  inputStyle,
  secureTextEntry,
  isPassword,
  ...props
}) => {
  const isPasswordField = Boolean(secureTextEntry || isPassword);
  const [isSecure, setIsSecure] = useState<boolean>(isPasswordField);

  useEffect(() => {
    setIsSecure(Boolean(secureTextEntry || isPassword));
  }, [secureTextEntry, isPassword]);

  let activeTheme = THEMES.snow;
  try {
    const app = useApp();
    if (app?.theme && THEMES[app.theme]) {
      activeTheme = THEMES[app.theme];
    }
  } catch {}

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: activeTheme.colors.text }]}>{label}</Text>}
      <View style={styles.inputWrapper}>
        <TextInput
          placeholderTextColor={activeTheme.colors.subtext}
          secureTextEntry={isPasswordField ? isSecure : false}
          style={[
            styles.input,
            {
              backgroundColor: activeTheme.colors.bgElevated,
              borderColor: activeTheme.colors.border,
              color: activeTheme.colors.text,
              borderRadius: activeTheme.btnRadius,
            },
            isPasswordField ? styles.inputPasswordPadding : null,
            error ? styles.inputError : null,
            props.multiline ? styles.multiline : null,
            inputStyle,
          ]}
          {...props}
        />
        {isPasswordField && (
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setIsSecure((prev) => !prev)}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={isSecure ? 'Show password' : 'Hide password'}
          >
            <Ionicons
              name={isSecure ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={activeTheme.colors.subtext}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
    width: '100%',
  },
  label: {
    color: Colors.text,
    fontSize: Typography.body,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  inputWrapper: {
    position: 'relative',
    width: '100%',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.md,
    color: Colors.text,
    fontSize: Typography.body,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    width: '100%',
  },
  inputPasswordPadding: {
    paddingRight: 44,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
    zIndex: 2,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: Colors.danger,
    fontSize: Typography.sm,
    marginTop: Spacing.xs,
  },
});
