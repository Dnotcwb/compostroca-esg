// Serviço de CAU — chama as Cloud Functions (movimentação segura) e
// fornece assinaturas em tempo real do Firestore (somente leitura no cliente).
import { httpsCallable } from 'firebase/functions';
import { doc, collection, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { functions, db } from './firebase';

// --- Cloud Functions (gravações de saldo passam por aqui) ---
const fnAdquirir = httpsCallable(functions, 'adquirirCau');
const fnDistribuir = httpsCallable(functions, 'distribuirCauPorPontuacao');
const fnResgatar = httpsCallable(functions, 'resgatarBeneficio');

export async function adquirirCau(empresaId, qtd) {
  const r = await fnAdquirir({ empresaId, qtd });
  return r.data;
}
export async function distribuirCauPorPontuacao(qtd) {
  const r = await fnDistribuir({ qtd });
  return r.data;
}
export async function resgatarBeneficio(itemId) {
  const r = await fnResgatar({ itemId });
  return r.data;
}

// --- Leituras em tempo real ---
export function ouvirEmpresa(empresaId, cb) {
  return onSnapshot(doc(db, 'empresas', empresaId), (snap) => {
    cb(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}
export function ouvirColaboradores(empresaId, cb) {
  return onSnapshot(collection(db, 'empresas', empresaId, 'colaboradores'), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}
export function ouvirColaborador(empresaId, colabId, cb) {
  return onSnapshot(doc(db, 'empresas', empresaId, 'colaboradores', colabId), (snap) => {
    cb(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

// --- Escritas permitidas ao cliente (NÃO mexem em saldo) ---
// Empresa cria/edita colaborador (nome, cargo, pontuação). saldo é travado por regra.
export async function salvarColaborador(empresaId, colabId, dados) {
  await setDoc(
    doc(db, 'empresas', empresaId, 'colaboradores', colabId),
    { ...dados, criadoEm: serverTimestamp() },
    { merge: true }
  );
}
export async function atualizarPontuacao(empresaId, colabId, pontuacao) {
  await updateDoc(doc(db, 'empresas', empresaId, 'colaboradores', colabId), { pontuacao });
}
