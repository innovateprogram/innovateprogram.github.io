// Firebase Web SDK configuration for the Innovate screens.
// These client values identify the Firebase project; database rules and Firebase Auth
// are responsible for protecting writes.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getDatabase, ref, onValue, set, update } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDEsmdqWZ2lU7MpnXCjD12aQViUDb4dqA",
  authDomain: "innovateprogram-fd00c.firebaseapp.com",
  databaseURL: "https://innovateprogram-fd00c-default-rtdb.firebaseio.com",
  projectId: "innovateprogram-fd00c",
  storageBucket: "innovateprogram-fd00c.firebasestorage.app",
  messagingSenderId: "1006945173823",
  appId: "1:1006945173823:web:cfb0fb311ec6af860b938a"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export { ref, onValue, set, update, onAuthStateChanged, signInWithEmailAndPassword, signOut };
