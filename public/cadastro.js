document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        mostrarToast("Você precisa estar logado.", "erro");
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }

    // ELEMENTOS
    const video = document.getElementById('cameraStream');
    const preview = document.getElementById('preview');
    const abrirCamera = document.getElementById('abrirCamera');
    const capturarFoto = document.getElementById('capturarFoto');
    const pararCamera = document.getElementById('pararCamera');
    const resetarFoto = document.getElementById('resetarFoto');
    const fotoInput = document.getElementById('foto');
    const cadastroForm = document.getElementById('cadastroForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const editarBtn = document.getElementById('editarBtn');

    let stream = null;
    let fotoBlob = null;

    // ----------------- SPINNER GLOBAL -----------------
    const criarSpinnerGlobal = () => {
        if (!document.getElementById("spinnerGlobal")) {
            const spinner = document.createElement("div");
            spinner.id = "spinnerGlobal";
            spinner.style = `
                position: fixed; top:0; left:0; width:100%; height:100%;
                background: rgba(0,0,0,0.4); display:flex;
                justify-content:center; align-items:center; z-index:9999;
            `;
            spinner.innerHTML = `<div style="
                border:4px solid #fff; border-top:4px solid #4caf50;
                border-radius:50%; width:50px; height:50px;
                animation: spinGlobal 1s linear infinite;"></div>`;
            document.body.appendChild(spinner);
            const style = document.createElement("style");
            style.innerHTML = `
                @keyframes spinGlobal {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }`;
            document.head.appendChild(style);
        }
    };
    const removerSpinnerGlobal = () => {
        const spinner = document.getElementById("spinnerGlobal");
        if (spinner) spinner.remove();
    };

    // ----------------- SPINNER NO BOTÃO -----------------
    const toggleButtonSpinner = (btn, loading) => {
        btn.disabled = loading;
        if (loading) {
            const spinner = document.createElement("span");
            spinner.classList.add("spinnerBtn");
            spinner.style = `
                display:inline-block; margin-left:6px;
                border: 2px solid #fff; border-top: 2px solid #4caf50;
                border-radius: 50%; width:14px; height:14px;
                animation: spinBtn 0.7s linear infinite;
            `;
            btn.appendChild(spinner);
        } else {
            const spinner = btn.querySelector(".spinnerBtn");
            if (spinner) spinner.remove();
        }
    };

    const styleBtn = document.createElement("style");
    styleBtn.innerHTML = `
    @keyframes spinBtn {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }`;
    document.head.appendChild(styleBtn);

    // ----------------- TOAST -----------------
    const mostrarToast = (msg, tipo="sucesso") => {
        const toast = document.createElement("div");
        toast.textContent = msg;
        toast.style = `
            position: fixed; bottom:20px; right:20px;
            background: ${tipo === "erro" ? "#e74c3c" : "#4caf50"};
            color:white; padding:12px 20px; border-radius:5px;
            box-shadow:0 4px 10px rgba(0,0,0,0.3); z-index:10000;
            opacity:0; transition:opacity 0.5s;
        `;
        document.body.appendChild(toast);
        requestAnimationFrame(()=>toast.style.opacity="1");
        setTimeout(() => {
            toast.style.opacity = "0";
            setTimeout(()=>toast.remove(), 500);
        }, 3000);
    };

    // ----------------- BOTÕES CAMERA -----------------
    const atualizarBotoes = (estado) => {
        abrirCamera.style.display = estado === 'cameraAberta' || estado === 'inicial' ? 'inline-block' : 'none';
        capturarFoto.style.display = estado === 'cameraAberta' ? 'inline-block' : 'none';
        pararCamera.style.display = estado === 'cameraAberta' ? 'inline-block' : 'none';
        resetarFoto.style.display = estado === 'fotoCapturada' ? 'inline-block' : 'none';
        video.style.display = estado === 'cameraAberta' ? 'block' : 'none';
        preview.style.display = estado === 'fotoCapturada' ? 'block' : 'none';
    };
    atualizarBotoes('inicial');

    abrirCamera.addEventListener('click', async () => {
        try {
            if (!stream) {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
                video.srcObject = stream;
                atualizarBotoes('cameraAberta');
            }
        } catch {
            mostrarToast("Não foi possível acessar a câmera.", "erro");
        }
    });

    capturarFoto.addEventListener('click', () => {
        if (!stream) return mostrarToast("Abra a câmera antes de capturar a foto!", "erro");
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
            fotoBlob = blob;
            preview.src = URL.createObjectURL(blob);
            stream.getTracks().forEach(track => track.stop());
            stream = null;
            video.srcObject = null;
            atualizarBotoes('fotoCapturada');
        }, 'image/jpeg');
    });

    pararCamera.addEventListener('click', () => {
        if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
        video.srcObject = null;
        atualizarBotoes('inicial');
    });

    resetarFoto.addEventListener('click', () => {
        fotoBlob = null; preview.src = ''; fotoInput.value = '';
        atualizarBotoes('inicial');
    });

    fotoInput.addEventListener('change', () => {
        if (fotoInput.files.length > 0) {
            fotoBlob = fotoInput.files[0];
            preview.src = URL.createObjectURL(fotoBlob);
            preview.style.display = 'block';
            video.style.display = 'none';
            atualizarBotoes('fotoCapturada');
        }
    });

    // ----------------- CADASTRO -----------------
    cadastroForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = cadastroForm.querySelector('button[type="submit"]');
        toggleButtonSpinner(btn, true);
        criarSpinnerGlobal();

        try {
            const formData = new FormData(cadastroForm);
            if (fotoBlob) formData.set('foto', fotoBlob, 'foto.jpg');

            const res = await fetch('http://localhost:3000/estudantes', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Erro ao cadastrar estudante');

            mostrarToast("Estudante cadastrado com sucesso!");

            // MOSTRAR BOTÃO EDITAR AUTOMATICAMENTE
            editarBtn.href = `editar.html?id=${data.id || ''}`;
            editarBtn.style.display = 'inline-block';

        } catch (err) {
            mostrarToast(err.message || 'Erro desconhecido', 'erro');
        } finally {
            toggleButtonSpinner(btn, false);
            removerSpinnerGlobal();
        }
    });

    // ----------------- LOGOUT -----------------
    logoutBtn.addEventListener('click', async () => {
        try { await fetch('http://localhost:3000/auth/logout', { method: 'POST', credentials: 'include' }); } catch {}
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });
});
