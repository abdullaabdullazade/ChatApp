// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getMessaging, getToken } from 'firebase/messaging';

const firebaseConfig = {
 
};

const firebase = initializeApp(firebaseConfig);
const database = getDatabase(firebase);

export { database, firebase };
