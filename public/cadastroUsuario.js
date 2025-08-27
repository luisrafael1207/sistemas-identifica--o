document.addEventListener('DOMContentLoaded', () => {
  // -------------------------
  // Elementos do DOM
  // -------------------------
  const senhaForm = document.getElementById('senhaForm');
  const senhaInput = document.getElementById('senhaConfig');
  const erroSenhaDiv = document.getElementById('erroSenha');

  const cadastroForm = document.getElementById('cadastroForm');
  const erroDiv = document.getElementById('erro');
  const resultadoDiv = document.getElementById('resultado');
  const btnLogin = document.getElementById('btnLogin');

  // -------------------------
  // Verificar token JWT e tipo do usuário
  // -------------------------
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Acesso negado! Faça login primeiro.');
    window.location.href = 'login.html';
    return;
  }

  const parseJwt = (jwt) => {
    try {
      const base64Url = jwt.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(decodeURIComponent(atob(base64).split('').map(c =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join('')));
    } catch {
      return null;
    }
  };

  const payload = parseJwt(token);
  if (!payload || payload.tipo !== 'admin') {
    alert('Acesso negado! Apenas administradores podem acessar esta página.');
    window.location.href = 'dashboard.html';
    return;
  }

  // -------------------------
  // Botão para ir para login
  // -------------------------
  btnLogin.addEventListener('click', () => window.location.href = 'login.html');

  // -------------------------
  // Validação da senha de configuração via backend
  // -------------------------
  senhaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    erroSenhaDiv.textContent = '';

    try {
      const res = await fetch('/auth/check-config-pass', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: senhaInput.value })
      });

      const data = await res.json();

      if (!res.ok) {
        erroSenhaDiv.textContent = data?.message || 'Senha incorreta!';
        return;
      }

      // senha correta → exibe formulário de cadastro
      cadastroForm.style.display = 'block';
      senhaForm.style.display = 'none';
    } catch (err) {
      erroSenhaDiv.textContent = 'Erro de conexão com o servidor.';
      console.error(err);
    }
  });

  // -------------------------
  // Funções utilitárias
  // -------------------------
  const gerarSenha = (tamanho = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_-+=';
    return Array.from({ length: tamanho }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  };

  const gerarEmail = (nome) => {
    const nomeLimpo = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const partes = nomeLimpo.trim().split(/\s+/);
    if (partes.length < 2) return null;
    return `${partes[0]}.${partes[partes.length - 1]}@ifc.edu.br`;
  };

  // -------------------------
  // Evento submit do formulário de cadastro
  // -------------------------
  cadastroForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    erroDiv.textContent = '';
    resultadoDiv.style.display = 'none';
    resultadoDiv.textContent = '';

    const btn = cadastroForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Cadastrando...';

    const nome = cadastroForm.nome.value.trim();
    if (!nome) {
      erroDiv.textContent = 'Informe o nome completo.';
      btn.disabled = false;
      btn.textContent = 'Gerar email e senha';
      return;
    }

    const email = gerarEmail(nome);
    if (!email) {
      erroDiv.textContent = 'Por favor, informe nome completo (nome e sobrenome).';
      btn.disabled = false;
      btn.textContent = 'Gerar email e senha';
      return;
    }

    const senha = gerarSenha();
    const tipo = 'admin';

    try {
      const res = await fetch('/auth/cadastrar', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nome, email, senha, tipo }),
      });

      const data = await res.json();

      if (!res.ok) {
        erroDiv.textContent = data?.message || 'Não foi possível cadastrar o administrador.';
      } else {
        resultadoDiv.style.display = 'block';
        resultadoDiv.textContent =
          `✅ Administrador criado com sucesso!\n\n` +
          `Nome: ${nome}\nEmail: ${email}\nSenha: ${senha}\nTipo: ${tipo}`;
        cadastroForm.reset();
      }
    } catch (err) {
      erroDiv.textContent = 'Erro de conexão com o servidor.';
      console.error(err);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Gerar email e senha';
    }
  });
});
