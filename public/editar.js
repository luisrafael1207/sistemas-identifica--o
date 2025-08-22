document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const alunoId = urlParams.get('id');

    if (!alunoId) {
        alert('ID do aluno não encontrado.');
        window.location.href = 'listar.html';
        return;
    }

    // Elementos
    const nomeInput = document.getElementById('nome');
    const emailInput = document.getElementById('email');
    const notaInput = document.getElementById('nota');
    const softSkillsSelect = document.getElementById('softSkills');
    const salvarBtn = document.getElementById('salvarBtn');
    const mensagem = document.getElementById('mensagem');
    const spinner = document.getElementById('spinner');

    const video = document.getElementById('cameraStream');
    const preview = document.getElementById('preview');
    const abrirCamera = document.getElementById('abrirCamera');
    const capturarFoto = document.getElementById('capturarFoto');
    const pararCamera = document.getElementById('pararCamera');
    const resetarFoto = document.getElementById('resetarFoto');
    const fotoInput = document.getElementById('foto');

    let stream = null;
    let fotoBlob = null;

    const softSkills = [
        "Trabalho em Equipe",
        "Comunicação",
        "Liderança",
        "Criatividade",
        "Responsabilidade",
        "Flexibilidade",
        "Motivação"
    ];

    // Atualiza os botões da câmera
    const atualizarBotoes = (estado) => {
        switch (estado) {
            case 'inicial':
                abrirCamera.style.display = 'inline-block';
                capturarFoto.style.display = 'none';
                pararCamera.style.display = 'none';
                resetarFoto.style.display = 'none';
                video.style.display = 'none';
                preview.style.display = 'none';
                break;
            case 'cameraAberta':
                abrirCamera.style.display = 'none';
                capturarFoto.style.display = 'inline-block';
                pararCamera.style.display = 'inline-block';
                resetarFoto.style.display = 'none';
                video.style.display = 'block';
                preview.style.display = 'none';
                break;
            case 'fotoCapturada':
                abrirCamera.style.display = 'inline-block';
                capturarFoto.style.display = 'none';
                pararCamera.style.display = 'none';
                resetarFoto.style.display = 'inline-block';
                video.style.display = 'none';
                preview.style.display = 'block';
                break;
        }
    };

    atualizarBotoes('inicial');

    // --- Carregar dados do aluno ---
    try {
        const res = await fetch(`http://localhost:3000/estudantes/${alunoId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erro ao buscar aluno');
        const aluno = await res.json();

        nomeInput.value = aluno.nome || '';
        emailInput.value = aluno.email || '';
        notaInput.value = aluno.nota ?? '';
        softSkillsSelect.value = aluno.softSkill || '';
        if (aluno.foto) {
            preview.src = aluno.foto;
            preview.style.display = 'block';
        }
    } catch (err) {
        console.error(err);
        alert('Erro ao carregar os dados do aluno.');
        window.location.href = 'listar.html';
        return;
    }

    // --- Abrir câmera ---
    abrirCamera.addEventListener('click', async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            atualizarBotoes('cameraAberta');
        } catch (err) {
            console.error('Erro ao acessar a câmera:', err);
            alert('Não foi possível acessar a câmera.');
        }
    });

    // --- Capturar foto ---
    capturarFoto.addEventListener('click', () => {
        if (!stream) return;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
            fotoBlob = blob;
            preview.src = URL.createObjectURL(blob);
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                stream = null;
                video.srcObject = null;
            }
            atualizarBotoes('fotoCapturada');
        }, 'image/jpeg');
    });

    // --- Parar câmera ---
    pararCamera.addEventListener('click', () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        video.srcObject = null;
        atualizarBotoes('inicial');
    });

    // --- Resetar foto ---
    resetarFoto.addEventListener('click', () => {
        fotoBlob = null;
        preview.src = '';
        fotoInput.value = '';
        atualizarBotoes('inicial');
    });

    // --- Seleção de arquivo ---
    fotoInput.addEventListener('change', () => {
        if (fotoInput.files.length > 0) {
            fotoBlob = fotoInput.files[0];
            preview.src = URL.createObjectURL(fotoBlob);
            preview.style.display = 'block';
            atualizarBotoes('fotoCapturada');
        }
    });

    // --- Salvar alterações ---
    salvarBtn.addEventListener('click', async () => {
        const nome = nomeInput.value.trim();
        const email = emailInput.value.trim();
        const nota = notaInput.value.trim();
        const softSkill = softSkillsSelect.value;

        if (!nome || !email) {
            mensagem.textContent = 'Nome e email são obrigatórios.';
            mensagem.style.color = 'red';
            return;
        }

        if (nota !== '' && (isNaN(nota) || nota < 0 || nota > 10)) {
            mensagem.textContent = 'A nota deve ser entre 0 e 10.';
            mensagem.style.color = 'red';
            return;
        }

        salvarBtn.disabled = true;
        spinner.style.display = 'inline-block';
        mensagem.textContent = '';

        try {
            const formData = new FormData();
            formData.append('nome', nome);
            formData.append('email', email);
            formData.append('nota', nota);
            formData.append('softSkill', softSkill);
            if (fotoBlob) formData.append('foto', fotoBlob, 'foto.jpg');

            const res = await fetch(`http://localhost:3000/estudantes/${alunoId}`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Erro ao salvar alterações');

            mensagem.textContent = 'Alterações salvas com sucesso!';
            mensagem.style.color = 'lightgreen';
            setTimeout(() => window.location.href = 'listar.html', 1500);
        } catch (err) {
            console.error(err);
            mensagem.textContent = err.message || 'Erro ao salvar alterações';
            mensagem.style.color = 'red';
        } finally {
            salvarBtn.disabled = false;
            spinner.style.display = 'none';
        }
    });
});
