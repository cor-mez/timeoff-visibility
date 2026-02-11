import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDOcV0zSPVO6aEH83ZESNLlK0xGz5ysKgM",
  authDomain: "timeoffboard.firebaseapp.com",
  databaseURL: "https://timeoffboard-default-rtdb.firebaseio.com",
  projectId: "timeoffboard",
  storageBucket: "timeoffboard.firebasestorage.app",
  messagingSenderId: "397367205583",
  appId: "1:397367205583:web:edc3bb09106818b98461ba",
  measurementId: "G-DHL311KGYQ",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
