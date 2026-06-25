import React, { useState } from 'react';
import { Leaf, Lock, Globe, Sprout, Smile, ArrowUpRight, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const PAPEIS = [
  { id: 'sponsor', label: 'Empresa Patrocinadora', desc: 'Patrocina e distribui CAU', Icone: Globe, cor: 'text-[#0e7a63]', bg: 'bg-[#0e7a63]/20', borda: 'hover:border-[#0e7a63]' },
  { id: 'colaborador', label: 'Colaborador', desc: 'Resgata benefícios', Icone: Smile, cor: 'text-[#a78f66]', bg: 'bg-[#a78f66]/20', borda: 'hover:border-[#a78f66]' },
  { id: 'producer', label: 'Produtor / Horta', desc: 'Lança métricas locais', Icone: Sprout, cor: 'text-[#158d44]', bg: 'bg-[#158d44]/20', borda: 'hover:border-[#158d44]' },
];

function traduzErro(code) {
  const map = {
    'auth/invalid-email': 'E-mail inválido.',
    'auth/missing-password': 'Informe a senha.',
    'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
    'auth/email-already-in-use': 'Este e-mail já está cadastrado. Tente entrar.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'Conta não encontrada.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco.',
  };
  return map[code] || 'Não foi possível concluir. Verifique os dados e tente novamente.';
}

export default function AuthScreen() {
  const { login, cadastrar } = useAuth();
  const [modo, setModo] = useState('login'); // 'login' | 'cadastro'
  const [role, setRole] = useState('sponsor');
  const [nome, setNome] = useState('');
  const [empresaNome, setEmpresaNome] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErro('');
    setBusy(true);
    try {
      if (modo === 'login') {
        await login(email.trim(), senha);
      } else {
        if (!nome.trim()) throw { code: 'app/nome' };
        if (role === 'colaborador' && !empresaId.trim()) throw { code: 'app/empresaId' };
        await cadastrar({
          email: email.trim(),
          senha,
          nome: nome.trim(),
          role,
          empresaNome: empresaNome.trim(),
          empresaId: empresaId.trim(),
        });
      }
    } catch (err) {
      if (err.code === 'app/nome') setErro('Informe seu nome.');
      else if (err.code === 'app/empresaId') setErro('Informe o código da empresa.');
      else setErro(traduzErro(err.code));
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    'w-full bg-[#161616] border border-[#2a2a2a] text-white rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-[#0e7a63] transition-colors placeholder:text-gray-600';

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-[#050505] relative overflow-hidden p-4">
      <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-[#0e7a63] opacity-20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-[#a78f66] opacity-10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="bg-[#111111] border border-[#2a2a2a] p-7 md:p-10 rounded-3xl w-full max-w-md relative z-10 shadow-2xl">
        <div className="flex flex-col items-center justify-center mb-7">
          <div className="w-16 h-16 bg-gradient-to-br from-[#0d332d] to-[#0e7a63] rounded-2xl flex items-center justify-center shadow-lg shadow-[#0e7a63]/20 mb-4">
            <Leaf size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white text-center" style={{ fontFamily: 'serif' }}>Ambiente Livre</h1>
          <p className="text-[#a78f66] text-xs uppercase tracking-widest font-bold mt-2">Plataforma Global ESG</p>
        </div>

        {/* Alternador Login / Cadastro */}
        <div className="flex bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-1 mb-6">
          {['login', 'cadastro'].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setModo(m); setErro(''); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${modo === m ? 'bg-[#0e7a63] text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
              {m === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          {modo === 'cadastro' && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {PAPEIS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setRole(p.id)}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${role === p.id ? `bg-[#161616] border-current ${p.cor}` : `bg-[#161616] border-[#2a2a2a] text-gray-400 ${p.borda}`}`}
                  >
                    <p.Icone size={18} />
                    <span className="text-[10px] font-semibold leading-tight">{p.label}</span>
                  </button>
                ))}
              </div>

              <input className={inputCls} placeholder={role === 'sponsor' ? 'Seu nome (responsável)' : 'Seu nome'} value={nome} onChange={(e) => setNome(e.target.value)} />

              {role === 'sponsor' && (
                <input className={inputCls} placeholder="Nome da empresa" value={empresaNome} onChange={(e) => setEmpresaNome(e.target.value)} />
              )}
              {role === 'colaborador' && (
                <input className={inputCls} placeholder="Código da empresa" value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} />
              )}
            </>
          )}

          <input type="email" autoComplete="email" className={inputCls} placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" autoComplete={modo === 'login' ? 'current-password' : 'new-password'} className={inputCls} placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} />

          {erro && <p className="text-xs text-red-400 bg-red-900/20 border border-red-900/30 rounded-lg px-3 py-2">{erro}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-[#0e7a63] hover:bg-[#158d44] text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-[#0e7a63]/20 active:scale-[0.98] flex justify-center items-center disabled:opacity-60"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : (
              <>
                {modo === 'login' ? 'Entrar' : 'Criar conta'}
                <ArrowUpRight size={16} className="ml-2" />
              </>
            )}
          </button>
        </form>

        {modo === 'cadastro' && (
          <p className="text-[11px] text-gray-600 mt-5 text-center leading-relaxed">
            Contas de administrador são definidas pela plataforma. Produtores passam por aprovação.
          </p>
        )}
      </div>
    </div>
  );
}
