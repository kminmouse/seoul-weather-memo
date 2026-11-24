import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAHPY9glfANM0F4m0HEq6n2HCIuEYFLh7I",
  authDomain: "dustmq-bc374.firebaseapp.com",
  projectId: "dustmq-bc374",
  storageBucket: "dustmq-bc374.firebasestorage.app",
  messagingSenderId: "935428323590",
  appId: "1:935428323590:web:6c94e7bab1f0d595d00687"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);