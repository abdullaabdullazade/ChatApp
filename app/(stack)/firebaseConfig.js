// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getMessaging, getToken } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyDZgALFpxEQ2Nf-2BNlkokQVgO-3ktJVNc",
  authDomain: "chatapp-40574.firebaseapp.com",
  databaseURL: "https://chatapp-40574-default-rtdb.firebaseio.com",
  projectId: "chatapp-40574",
  storageBucket: "chatapp-40574.firebasestorage.app",
  messagingSenderId: "745736489767",
  appId: "1:745736489767:web:bd9ab0218452d743dc3702",
  measurementId: "G-7HF9REJRN1"
};

const firebase = initializeApp(firebaseConfig);
const database = getDatabase(firebase);

export { database, firebase };
