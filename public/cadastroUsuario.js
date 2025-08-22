document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('cadastroForm');
  const erroDiv = document.getElementById('erro');
  const resultadoDiv = document.getElementById('resultado');

  function gerarSenha(tamanho = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_-+=';
    let senha = '';
    for (let i = 0; i < tamanho; i++) {
      senha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return senha;
  }

  function gerarEmail(nome) {
    const nomeLimpo = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const partes = nomeLimpo.trim().split(/\s+/);
    if (partes.length < 2) return null;
    return `${partes[0]}.${partes[partes.length - 1]}@ifc.edu.br`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    erroDiv.textContent = '';
    resultadoDiv.style.display = 'none';
    resultadoDiv.textContent = '';

    const btn = form.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Cadastrando...';

    const nome = form.nome.value.trim();
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
    const tipo = 'admin'; // Sempre admin

    try {
      const res = await fetch('http://localhost:3000/auth/cadastrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, senha, tipo }),
        credentials: 'include'
      });

      const data = await res.json();

      if (!res.ok) {
        erroDiv.textContent = data?.message || 'Não foi possível cadastrar o administrador.';
      } else {
        resultadoDiv.style.display = 'block';
        resultadoDiv.textContent =
          `✅ Administrador criado com sucesso!\n\n` +
          `Nome: ${nome}\nEmail: ${email}\nSenha: ${senha}\nTipo: ${tipo}`;
        form.reset();
      }
    } catch (err) {
      erroDiv.textContent = 'Erro de conexão com o servidor.';
      console.error(err);
    }

    btn.disabled = false;
    btn.textContent = 'Gerar email e senha';
  });
});
