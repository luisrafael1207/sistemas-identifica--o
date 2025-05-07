// Verifica se o usuário está logado
if (!localStorage.getItem('token')) {
  window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', function () {
  const filtroInput = document.getElementById('filtro');
  const botaoSair = document.getElementById('btnSair');
  const camera = document.getElementById('camera');
  const video = document.getElementById('video');
  const capturarBtn = document.getElementById('capturar-foto');

  // Filtro ao digitar
  filtroInput.addEventListener('input', carregarEstudantes);

  // Botão de logout
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

  // Inicializa câmera
  if (navigator.mediaDevices && video) {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        video.srcObject = stream;
        video.play();
      })
      .catch(err => {
        console.error("Erro ao acessar a câmera:", err);
      });
  }

  // Captura e envia imagem
  capturarBtn.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob(blob => {
      const formData = new FormData();
      formData.append('imagem', blob, 'foto.jpg');

      fetch('http://localhost:3000/reconhecer', {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('token')
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.nome) {
          alert(`Estudante reconhecido: ${data.nome}`);
        } else {
          alert('Estudante não reconhecido.');
        }
      })
      .catch(error => {
        console.error('Erro no reconhecimento facial:', error);
        alert('Erro no reconhecimento facial');
      });
    }, 'image/jpeg');
  });

  // Carregamento inicial
  carregarEstudantes();
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
      Authorization: 'Bearer ' + localStorage.getItem('token')
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
