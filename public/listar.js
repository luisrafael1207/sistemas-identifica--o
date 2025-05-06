// Verifica se o usuário está logado
if (!localStorage.getItem('token')) {
    window.location.href = '/login.html';
  }
  
  document.addEventListener('DOMContentLoaded', function () {
    const filtroInput = document.getElementById('filtro');
  
    // Event listener do campo de filtro
    filtroInput.addEventListener('input', carregarEstudantes);
  
    // Carregamento inicial
    carregarEstudantes();
  
    // Botão de logout
    const botaoSair = document.getElementById('btnSair');
    if (botaoSair) {
      botaoSair.addEventListener('click', () => {
        fetch('http://localhost:3000/auth/logout', {
          credentials: 'include'
        })
        .then(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          sessionStorage.setItem('fromLogout', 'true');
          window.location.href = '/login.html';
        })
        .catch(error => {
          console.error('Erro ao fazer logout:', error);
          alert('Erro ao fazer logout: ' + error.message);
        });
      });
    }
  });
  
  function carregarEstudantes() {
    const filtro = document.getElementById('filtro').value.trim();
    let url = 'http://localhost:3000/estudantes';
    if (filtro) {
      url += `?filtro=${encodeURIComponent(filtro)}`;
    }
  
    fetch(url, {
      credentials: 'include',
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('token') // caso use JWT
      }
    })
    .then(response => response.json())
    .then(data => {
      const tabelaBody = document.querySelector('#tabela-estudantes tbody');
      const mensagemVazio = document.getElementById('mensagem-vazio');
      tabelaBody.innerHTML = '';
  
      if (!data || data.length === 0) {
        mensagemVazio.style.display = 'block';
      } else {
        mensagemVazio.style.display = 'none';
  
        data.forEach(estudante => {
          const row = document.createElement('tr');
          
          row.innerHTML = `
            <td><img src="http://localhost:3000/uploads/${estudante.foto}" alt="Foto de ${estudante.nome}"></td>
            <td>${estudante.nome}</td>
            <td>${estudante.turma}</td>
            <td>
              <div class="action-buttons">
                <button onclick="detalharEstudante(${estudante.id})">Detalhar</button>
                <button class="btn-delete" onclick="deletarEstudante(${estudante.id})">Deletar</button>
              </div>
            </td>
          `;
  
          tabelaBody.appendChild(row);
        });
      }
    })
    .catch(error => {
      console.error('Erro ao carregar estudantes:', error);
      alert('Erro ao carregar estudantes');
    });
  }
  
  function detalharEstudante(id) {
    fetch(`http://localhost:3000/estudantes/${id}`, {
      credentials: 'include'
    })
    .then(response => response.json())
    .then(estudante => {
      document.getElementById('modal-id').textContent = estudante.id;
      document.getElementById('modal-nome').textContent = estudante.nome;
      document.getElementById('modal-turma').textContent = estudante.turma;
      document.getElementById('modal-foto').src = `http://localhost:3000/uploads/${estudante.foto}`;
      document.getElementById('modal').style.display = 'flex';
    })
    .catch(error => {
      console.error('Erro ao buscar detalhes do estudante:', error);
      alert('Erro ao buscar detalhes do estudante');
    });
  }
  
  function fecharModal() {
    document.getElementById('modal').style.display = 'none';
  }
  
  function deletarEstudante(id) {
    if (confirm('Tem certeza que deseja deletar este estudante?')) {
      fetch(`http://localhost:3000/estudantes/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      .then(response => response.json())
      .then(data => {
        alert(data.message || 'Estudante deletado!');
        carregarEstudantes();
      })
      .catch(error => {
        console.error('Erro ao deletar estudante:', error);
        alert('Erro ao deletar estudante');
      });
    }
  }
  