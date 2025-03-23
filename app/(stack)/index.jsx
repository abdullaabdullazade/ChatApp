import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Alert, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { ref, onValue } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from './firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import Checkbox from "expo-checkbox";
import * as LocalAuthentication from 'expo-local-authentication';

export default function Index() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [chatNumber, setChatNumber] = useState('');
  const [validPasswords, setValidPasswords] = useState({});
  const [chatPairs, setChatPairs] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const checkLogin = async () => {
      const user = await AsyncStorage.getItem('user');
      const chatId = await AsyncStorage.getItem('chatId');
      if (user && chatId) {
        const hasBiometrics = await LocalAuthentication.hasHardwareAsync();
        const isBiometricEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (hasBiometrics && isBiometricEnrolled) {
          const biometricAuth = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Daxil olmaq üçün doğrulayın',
          });

          if (biometricAuth.success) {
            router.push(`/chat?user=${user}&chatId=${chatId}`);
          }
        } else {
          router.push(`/chat?user=${user}&chatId=${chatId}`);
        }
      }
    };

    checkLogin();

    const passwordsRef = ref(database, 'passwords');
    onValue(passwordsRef, (snapshot) => {
      const data = snapshot.val();
      setValidPasswords(data || {});
    });

    const chatPairsRef = ref(database, 'chatPairs');
    onValue(chatPairsRef, (snapshot) => {
      const data = snapshot.val();
      setChatPairs(data || {});
    });
  }, []);

  const handleLoginAndChatSelection = async () => {
    const userEntry = Object.entries(validPasswords).find(([key, value]) => value === password);
    if (!userEntry) {
      Alert.alert('Wrong password');
      return;
    }

    const user = userEntry[0];
    const chatId = chatPairs[chatNumber];
    if (!chatId) {
      Alert.alert('Wrong chat id.');
      return;
    }

    if (rememberMe) {
      await AsyncStorage.setItem('user', user);
      await AsyncStorage.setItem('chatId', chatId);
    }

    const hasBiometrics = await LocalAuthentication.hasHardwareAsync();
    const isBiometricEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (hasBiometrics && isBiometricEnrolled) {
      const biometricAuth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Daxil olmaq üçün doğrulayın',
      });

      if (biometricAuth.success) {
        router.replace(`/chat?user=${user}&chatId=${chatId}`);
      } else {
        Alert.alert('Biometric authentication failed');
      }
    } else {
      router.replace(`/chat?user=${user}&chatId=${chatId}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.loginContainer}>
        <Text style={styles.loginTitle}> Login </Text>
        <Text style={styles.loginSubtitle}>Welcome, it is nice to see you! </Text>
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>🔒 Password:</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="gray" />
          </TouchableOpacity>
        </View>
        <View style={styles.chatId}>
          <Text style={styles.label}>💬 Chat ID:</Text>
          <TextInput
            style={styles.input}
            value={chatNumber}
            onChangeText={setChatNumber}
            placeholder="Enter your chat ID"
            keyboardType="numeric"
          />
          <View style={styles.checkboxContainer}>
            <Checkbox
              value={rememberMe}
              onValueChange={setRememberMe}
              color={rememberMe ? '#4630EB' : undefined}
            />
            <Text style={styles.checkboxLabel}> Save credentials </Text>
          </View>
          <TouchableOpacity style={styles.button} onPress={handleLoginAndChatSelection}>
            <Text style={styles.buttonText}>🚀 Log in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121B22',
    paddingTop: StatusBar.currentHeight,
  },
  loginContainer: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  loginTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#E9EBEB',
  },
  loginSubtitle: {
    fontSize: 16,
    color: '#8696A0',
  },
  inputContainer: {
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 16,
    color: '#E9EBEB',
    marginBottom: 5,
  },
  chatId: {
    height: 180,
  },
  input: {
    flex: 1,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeIcon: {
    position: 'absolute',
    right: 10,
    justifyContent: 'center',
    alignContent: 'center',
    alignItems: 'center',
    top: 11,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkboxLabel: {
    paddingLeft: 10,
    color: '#E9EBEB'
  },
  button: {
    backgroundColor: '#00A884',
    padding: 15,
    borderRadius: 30,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
