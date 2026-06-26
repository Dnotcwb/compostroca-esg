// Inicialização do Firebase (scaffold pronto para a Fase 1).
// Ainda NÃO é usado pelo App — a UI continua em dados mockados nesta Fase 0.
// Na Fase 1, importaremos `auth`/`db` daqui para substituir os mocks.
//
// A config vem de variáveis VITE_ (ver .env.example). Enquanto o .env não
// estiver preenchido, este módulo simplesmente não é importado, então o app
// roda normalmente sem credenciais.

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
// Functions na mesma região do Firestore (southamerica-east1)
export const functions = getFunctions(app, 'southamerica-east1');
