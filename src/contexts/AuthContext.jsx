import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const AuthContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [perfil, setPerfil] = useState(null); // doc usuarios/{uid}: { role, nome, empresaId, ... }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setFirebaseUser(u);
      if (u) {
        try {
          const snap = await getDoc(doc(db, 'usuarios', u.uid));
          setPerfil(snap.exists() ? { uid: u.uid, ...snap.data() } : null);
        } catch {
          setPerfil(null);
        }
      } else {
        setPerfil(null);
      }
      setLoading(false);
    });
  }, []);

  const login = (email, senha) => signInWithEmailAndPassword(auth, email, senha);

  const logout = () => signOut(auth);

  // Cria a conta de auth + os documentos no Firestore conforme o papel.
  const cadastrar = async ({ email, senha, nome, role, empresaNome, empresaId }) => {
    const cred = await createUserWithEmailAndPassword(auth, email, senha);
    const uid = cred.user.uid;
    const base = { nome, role, criadoEm: serverTimestamp() };

    if (role === 'sponsor') {
      // empresaId = uid do dono (simples e único nesta fase)
      await setDoc(doc(db, 'empresas', uid), {
        nome: empresaNome || nome,
        ownerUid: uid,
        cauSaldo: 0,
        criadoEm: serverTimestamp(),
      });
      await setDoc(doc(db, 'usuarios', uid), { ...base, empresaId: uid });
    } else if (role === 'colaborador') {
      await setDoc(doc(db, 'usuarios', uid), { ...base, empresaId: empresaId || null });
      // vínculo do colaborador com a empresa (recebe/gasta CAU aqui; saldo travado por regra)
      if (empresaId) {
        await setDoc(doc(db, 'empresas', empresaId, 'colaboradores', uid), {
          nome,
          cargo: '',
          pontuacao: 0,
          saldo: 0,
          criadoEm: serverTimestamp(),
        });
      }
    } else if (role === 'producer') {
      await setDoc(doc(db, 'hortas', uid), {
        nome,
        ownerUid: uid,
        status: 'pendente',
        criadoEm: serverTimestamp(),
      });
      await setDoc(doc(db, 'usuarios', uid), { ...base, hortaId: uid });
    }

    const snap = await getDoc(doc(db, 'usuarios', uid));
    setPerfil(snap.exists() ? { uid, ...snap.data() } : null);
    return cred;
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, perfil, loading, login, logout, cadastrar }}>
      {children}
    </AuthContext.Provider>
  );
}
