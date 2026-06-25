/**
 * Cloud Functions do brota-esg — operações de CAU.
 *
 * Princípio: o saldo de CAU (empresa.cauSaldo e colaborador.saldo) e o
 * ledger NUNCA são escritos pelo cliente. Toda movimentação passa por estas
 * funções, que rodam com o Admin SDK (ignoram as regras) e usam transações
 * para garantir atomicidade. As regras do Firestore negam escrita direta
 * desses campos pelo cliente.
 *
 * Região: southamerica-east1 (mesma do Firestore).
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

const REGION = 'southamerica-east1';

// Catálogo autoritativo (o custo em CAU é definido aqui, no servidor).
// O cliente envia apenas o itemId; o custo vem daqui — não do cliente.
const CATALOGO = {
  cesta: { nome: 'Cesta de Orgânicos da Horta', custo: 8 },
  mudas: { nome: 'Kit de Mudas e Adubo', custo: 5 },
  vale: { nome: 'Vale-Compras Ambiente Livre', custo: 10 },
  composteira: { nome: 'Composteira Doméstica', custo: 20 },
  dayoff: { nome: 'Day-off (Folga Remunerada)', custo: 30 },
  saida: { nome: 'Saída Antecipada', custo: 12 },
};

async function getPerfil(uid) {
  const snap = await db.doc(`usuarios/${uid}`).get();
  return snap.exists ? snap.data() : null;
}

/**
 * adquirirCau — credita CAU adquiridos a uma empresa.
 * Restrito ao ADMIN (representa a confirmação do patrocínio pela plataforma;
 * quando houver pagamento via Stripe, o webhook chamará esta lógica).
 */
exports.adquirirCau = onCall({ region: REGION }, async (req) => {
  const uid = req.auth && req.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Faça login.');

  const perfil = await getPerfil(uid);
  if (!perfil || perfil.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Apenas a plataforma pode creditar CAU.');
  }

  const empresaId = String(req.data && req.data.empresaId || '');
  const qtd = Math.floor(Number(req.data && req.data.qtd));
  if (!empresaId) throw new HttpsError('invalid-argument', 'Informe a empresa.');
  if (!qtd || qtd < 1) throw new HttpsError('invalid-argument', 'Quantidade inválida.');

  const empRef = db.doc(`empresas/${empresaId}`);
  return db.runTransaction(async (tx) => {
    const empSnap = await tx.get(empRef);
    if (!empSnap.exists) throw new HttpsError('not-found', 'Empresa não encontrada.');
    const saldoAtual = empSnap.data().cauSaldo || 0;

    tx.update(empRef, { cauSaldo: saldoAtual + qtd });
    tx.set(db.collection('cauLedger').doc(), {
      tipo: 'aquisicao',
      empresaId,
      qtd,
      saldoApos: saldoAtual + qtd,
      por: uid,
      criadoEm: FieldValue.serverTimestamp(),
    });
    return { ok: true, cauSaldo: saldoAtual + qtd };
  });
});

/**
 * distribuirCauPorPontuacao — distribui CAU da empresa entre seus
 * colaboradores, proporcionalmente à pontuação de cada um.
 * Restrito ao DONO da empresa (role 'sponsor').
 */
exports.distribuirCauPorPontuacao = onCall({ region: REGION }, async (req) => {
  const uid = req.auth && req.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Faça login.');

  const perfil = await getPerfil(uid);
  if (!perfil || perfil.role !== 'sponsor' || !perfil.empresaId) {
    throw new HttpsError('permission-denied', 'Apenas a empresa pode distribuir.');
  }
  const empresaId = perfil.empresaId;

  const qtd = Math.floor(Number(req.data && req.data.qtd));
  if (!qtd || qtd < 1) throw new HttpsError('invalid-argument', 'Quantidade inválida.');

  const empRef = db.doc(`empresas/${empresaId}`);
  const colabsRef = db.collection(`empresas/${empresaId}/colaboradores`);

  return db.runTransaction(async (tx) => {
    const empSnap = await tx.get(empRef);
    const cauSaldo = (empSnap.exists && empSnap.data().cauSaldo) || 0;
    if (qtd > cauSaldo) {
      throw new HttpsError('failed-precondition', `Saldo insuficiente: ${cauSaldo} CAU disponíveis.`);
    }

    const colabsSnap = await tx.get(colabsRef);
    const totalPts = colabsSnap.docs.reduce((s, d) => s + (d.data().pontuacao || 0), 0);
    if (totalPts <= 0) {
      throw new HttpsError('failed-precondition', 'Nenhum colaborador com pontuação.');
    }

    let distribuido = 0;
    const updates = [];
    for (const d of colabsSnap.docs) {
      const pts = d.data().pontuacao || 0;
      const aloc = Math.floor((qtd * pts) / totalPts);
      if (aloc > 0) {
        updates.push({ ref: d.ref, novoSaldo: (d.data().saldo || 0) + aloc });
        distribuido += aloc;
      }
    }

    tx.update(empRef, { cauSaldo: cauSaldo - distribuido });
    for (const u of updates) tx.update(u.ref, { saldo: u.novoSaldo });
    tx.set(db.collection('cauLedger').doc(), {
      tipo: 'distribuicao',
      empresaId,
      qtd: distribuido,
      colaboradores: updates.length,
      por: uid,
      criadoEm: FieldValue.serverTimestamp(),
    });

    return { ok: true, distribuido, colaboradores: updates.length };
  });
});

/**
 * resgatarBeneficio — colaborador troca CAU por um item do catálogo.
 * O custo vem do CATALOGO no servidor; o cliente só envia o itemId.
 */
exports.resgatarBeneficio = onCall({ region: REGION }, async (req) => {
  const uid = req.auth && req.auth.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Faça login.');

  const perfil = await getPerfil(uid);
  if (!perfil || perfil.role !== 'colaborador' || !perfil.empresaId) {
    throw new HttpsError('permission-denied', 'Apenas colaboradores podem resgatar.');
  }
  const empresaId = perfil.empresaId;

  const itemId = String(req.data && req.data.itemId || '');
  const item = CATALOGO[itemId];
  if (!item) throw new HttpsError('invalid-argument', 'Item inválido.');

  const colabRef = db.doc(`empresas/${empresaId}/colaboradores/${uid}`);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(colabRef);
    if (!snap.exists) throw new HttpsError('not-found', 'Cadastro de colaborador não encontrado.');
    const saldo = snap.data().saldo || 0;
    if (saldo < item.custo) {
      throw new HttpsError('failed-precondition', `Saldo insuficiente: precisa de ${item.custo} CAU.`);
    }

    tx.update(colabRef, { saldo: saldo - item.custo });
    tx.set(db.collection('resgates').doc(), {
      colabId: uid,
      empresaId,
      itemId,
      nome: item.nome,
      custo: item.custo,
      status: 'solicitado',
      criadoEm: FieldValue.serverTimestamp(),
    });
    tx.set(db.collection('cauLedger').doc(), {
      tipo: 'resgate',
      empresaId,
      colabId: uid,
      itemId,
      qtd: item.custo,
      criadoEm: FieldValue.serverTimestamp(),
    });

    return { ok: true, saldo: saldo - item.custo, item: item.nome };
  });
});
