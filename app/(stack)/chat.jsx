import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, SafeAreaView, StatusBar, Alert } from 'react-native';
import { ref, onValue, push, remove, update, onDisconnect, set, get } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from './firebaseConfig';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import * as ScreenCapture from 'expo-screen-capture';

export default function Chat() {
  const router = useRouter();
  const { user, chatId } = useLocalSearchParams();
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [recipient, setRecipient] = useState('');
  const [editingMessageKey, setEditingMessageKey] = useState(null);
  const scrollViewRef = useRef();
  const [onlineStatus, setOnlineStatus] = useState({});
  const typingTimeoutRef = useRef(null);
  const [typingUser, setTypingUser] = useState(null);

  ScreenCapture.preventScreenCaptureAsync();
  useEffect(() => {
    return () => {
      ScreenCapture.allowScreenCaptureAsync();
    };
  }, []);

  useEffect(() => {
    const participants = chatId.split('_');
    const recipient = participants.find(participant => participant !== user);
    setRecipient(recipient);

    const messagesRef = ref(database, `messages/${chatId}`);
    onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      const parsedMessages = data ? Object.entries(data).map(([key, value]) => ({ key, ...value })) : [];
      setMessages(parsedMessages);

      parsedMessages.forEach(async msg => {
        if (msg.role !== user && !msg.read) {
          const messageRef = ref(database, `messages/${chatId}/${msg.key}`);
          await update(messageRef, { read: true, readTimestamp: Date.now() });
        }
      });

      scrollViewRef.current?.scrollToEnd({ animated: true });
    });

    const userStatusDatabaseRef = ref(database, `status/${user}`);
    const recipientStatusDatabaseRef = ref(database, `status/${recipient}`);

    set(userStatusDatabaseRef, true);
    onDisconnect(userStatusDatabaseRef).set(false);

    onValue(recipientStatusDatabaseRef, (snapshot) => {
      setOnlineStatus({ [recipient]: snapshot.val() });
    });
    const typingRef = ref(database, `typing/${chatId}/${recipient}`);
    onValue(typingRef, (snapshot) => {
      const isTyping = snapshot.val();
      if (isTyping) {
        setTypingUser(`${recipient} typing...`);
      } else {
        setTypingUser(null);
      }
    });

    return () => {
      set(userStatusDatabaseRef, false);
    };
  }, [chatId]);

  const handleInputChange = (text) => {
    setInputText(text);
    const typingRef = ref(database, `typing/${chatId}/${user}`);

    if (text.trim() === '') {
      set(typingRef, false);
      clearTimeout(typingTimeoutRef.current);
    } else {
      set(typingRef, true);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        set(typingRef, false);
      }, 2000);
    }
  };

  const sendMessage = async () => {
    if (inputText.trim() === '') return;

    const newMessage = { role: user, content: inputText, timestamp: Date.now(), sentTimestamp: Date.now(), edited: false, read: false };
    const messagesRef = ref(database, `messages/${chatId}`);
    await push(messagesRef, newMessage);

    setInputText('');
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const deleteMessage = (key, messageRole) => {
    if (messageRole !== user) {
      Alert.alert('Delete error. ');
      return;
    }

    Alert.alert(
      'Delete message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            const messageRef = ref(database, `messages/${chatId}/${key}`);
            await remove(messageRef);
          }
        }
      ],
      { cancelable: true }
    );
  };

  const editMessage = (key, messageRole, currentContent) => {
    if (messageRole !== user) {
      Alert.alert('Edit error. ');
      return;
    }

    setEditingMessageKey(key);
    setInputText(currentContent);
  };

  const updateMessage = async () => {
    const messageRef = ref(database, `messages/${chatId}/${editingMessageKey}`);
    const snapshot = await get(messageRef);
    const messageData = snapshot.val();

    if (messageData.edited) {
      Alert.alert('You can only edit a message once.');
      setEditingMessageKey(null);
      setInputText('');
      return;
    }

    await update(messageRef, { content: inputText, edited: true });
    setEditingMessageKey(null);
    setInputText('');
  };

  const logout = async () => {
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('chatId');
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>
          {recipient} <Text style={{ color: onlineStatus[recipient] ? 'green' : 'red' }}>{onlineStatus[recipient] ? '(Onlayn)' : '(Offline)'}</Text>
        </Text>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <MaterialIcons name="logout" size={24} color="white" />
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.chatContainer}
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg) => (
          <View key={msg.key} style={msg.role === user ? styles.userMessage : styles.otherMessage}>
            <Text><Text style={{ fontWeight: 'bold', color: msg.role === user ? "#D1D7DB" : "#25D366" }}>{msg.role}</Text>: </Text>
            <Text style={styles.messageContent}>{msg.content}</Text>
            <Text style={styles.timestampText}>Sent: {new Date(msg.sentTimestamp).toLocaleString()}</Text>
            {msg.read && <Text style={styles.timestampText}>Read: {new Date(msg.readTimestamp).toLocaleString()}</Text>}
            {msg.edited && <Text style={styles.editedText}>(edited)</Text>}
            {msg.role === user && msg.read && <Text style={styles.readText}>(read)</Text>}
            {msg.role === user && (
              <View style={styles.actionsContainer}>
                <TouchableOpacity onPress={() => editMessage(msg.key, msg.role, msg.content)} style={styles.editButton}>
                  <Feather name="edit" size={16} color="#00A884" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteMessage(msg.key, msg.role)} style={styles.deleteButton}>
                  <MaterialIcons name="delete" size={16} color="#F44336" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
      {typingUser && <Text style={styles.typingStatus}>{typingUser}</Text>}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={handleInputChange}
          placeholder="Type a message..."
          placeholderTextColor={'gray'}
        />
        <TouchableOpacity onPress={editingMessageKey ? updateMessage : sendMessage} style={styles.sendButton}>
          <Ionicons name={editingMessageKey ? "checkmark" : "send"} size={24} color="white" />
        </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#1F2C34',
    borderBottomWidth: 1,
    borderBottomColor: '#2A3942',
  },
  headerText: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#E9EBEB',
  },
  logoutButton: {
    padding: 5,
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#005C4B',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 0,
    marginBottom: 8,
    padding: 10,
    maxWidth: '75%',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#202C33',
    color: 'white',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderBottomLeftRadius: 0,
    marginBottom: 8,
    padding: 10,
    maxWidth: '75%',
  },
  timestampText: {
    fontSize: 11,
    color: '#8696A0',
    marginTop: 3,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A3942',
    borderRadius: 25,
    margin: 10,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#E9EBEB',
  },
  sendButton: {
    backgroundColor: '#25D366',
    borderRadius: 20,
    padding: 10,
    marginLeft: 8,
  },
  editedText: {
    fontStyle: 'italic',
    color: '#8696A0',
    fontSize: 12,
  },
  readText: {
    fontStyle: 'italic',
    color: '#8696A0',
    fontSize: 12,
  },
  typingStatus: {
    textAlign: 'center',
    color: '#8696A0',
    fontSize: 13,
    paddingBottom: 5,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  deleteButton: {
    marginLeft: 5,
  },
  editButton: {
    marginRight: 5,
  },
  messageContent: {
    fontSize: 15,
    color: '#E9EBEB',
    lineHeight: 20,
  },

});
