document.addEventListener("DOMContentLoaded", async () => {
    const tabela = document.getElementById("tabelaEstudantes");
    const filtro = document.getElementById("filtro");
    const video = document.getElementById("video");
    const detectarBtn = document.getElementById("detectarBtn");
    const desligarCamera = document.getElementById("desligarCamera");
    const btnSair = document.getElementById("btnSair");
    const btnCadastrar = document.getElementById("btnCadastrar");
    const modal = document.getElementById("modal");
    const closeModal = document.getElementById("closeModal");
    const notaInput = document.getElementById("notaInput");
    const softSkillSelect = document.getElementById("softSkillSelect");
    const salvarBtn = document.getElementById("salvarAlteracoes");
    const infoEstudante = document.getElementById("infoEstudante");

    let estudanteSelecionado = null;
    let estudantesOriginais = [];
    let stream = null;

    // ----------------- TOKEN -----------------
    const getToken = () => localStorage.getItem("token");

    // ----------------- FETCH AUTENTICADO -----------------
    const fetchAuth = async (url, options = {}) => {
        if (!options.headers) options.headers = {};
        const token = getToken();
        if (token) options.headers['Authorization'] = 'Bearer ' + token;
        try {
            const res = await fetch(url, options);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res;
        } catch (err) {
            handleErro("Erro no fetchAuth", err);
            return null;
        }
    };

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

    // ----------------- TOASTS -----------------
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

    // ----------------- MODAL -----------------
    const mostrarModal = () => modal.style.display = "flex";
    const esconderModal = () => {
        modal.style.display = "none";
        estudanteSelecionado = null;
        infoEstudante.innerHTML = "";
        notaInput.value = "";
        softSkillSelect.value = "";
        salvarBtn.disabled = false;
        const spinner = salvarBtn.querySelector(".spinnerBtn");
        if (spinner) spinner.remove();
    };

    // ----------------- LOGOUT -----------------
    const logout = () => {
        localStorage.removeItem("token");
        window.location.href = "login.html";
    };

    const handleErro = (msg, err) => {
        console.error(msg, err);
        mostrarToast(msg + (err?.message ? `: ${err.message}` : ""), "erro");
    };

    // ----------------- EVENTOS -----------------
    btnCadastrar.addEventListener("click", () => window.location.href = "cadastro.html");
    btnSair.addEventListener("click", async () => {
        try { await fetch("http://localhost:3000/auth/logout", { method: "POST", credentials: "include" }); } catch {}
        logout();
    });
    closeModal.addEventListener("click", esconderModal);

    // ----------------- SALVAR ALTERAÇÕES -----------------
    salvarBtn.addEventListener("click", async () => {
        if (!estudanteSelecionado) return;
        const id = estudanteSelecionado;
        const nota = notaInput.value.trim();
        const softSkill = softSkillSelect.value;
        const payload = {};
        if (nota !== "") payload.nota = parseFloat(nota);
        if (softSkill) payload.softSkill = softSkill;
        if (Object.keys(payload).length === 0) return mostrarToast("Nenhum valor para atualizar", "erro");

        try {
            criarSpinnerGlobal();
            const res = await fetchAuth(`http://localhost:3000/estudantes/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!res?.ok) throw new Error("Erro ao atualizar estudante");

            const data = await res.json();
            const index = estudantesOriginais.findIndex(e => e.id == id);
            if (index !== -1) estudantesOriginais[index] = data.estudante;

            aplicarFiltros();
            mostrarToast("Alterações salvas com sucesso!");
            esconderModal();
        } catch (err) {
            handleErro("Erro ao salvar alterações", err);
        } finally {
            removerSpinnerGlobal();
        }
    });

    // ----------------- FILTRO MANUAL -----------------
    filtro.addEventListener("input", aplicarFiltros);

    // ----------------- CARREGAR ESTUDANTES -----------------
    async function carregarEstudantes() {
        criarSpinnerGlobal();
        try {
            const res = await fetchAuth("http://localhost:3000/estudantes");
            if (!res) return;
            const data = await res.json();
            estudantesOriginais = data.estudantes || data;
            aplicarFiltros();
        } catch (err) {
            handleErro("Erro ao carregar estudantes", err);
        } finally {
            removerSpinnerGlobal();
        }
    }

    // ----------------- APLICAR FILTROS (URL + INPUT) -----------------
    function aplicarFiltros() {
        let filtrados = [...estudantesOriginais];

        // 🔹 Filtro vindo da URL
        const params = new URLSearchParams(window.location.search);
        if (params.has("filtroNota")) {
            const nota = parseFloat(params.get("filtroNota"));
            filtrados = filtrados.filter(est => (est.nota ?? 0) >= nota);
        }
        if (params.has("filtroNotaMenor7")) {
            filtrados = filtrados.filter(est => (est.nota ?? 0) < 7);
        }

        // 🔹 Filtro digitado no campo
        const termo = filtro.value.toLowerCase();
        if (termo) {
            filtrados = filtrados.filter(est =>
                est.nome.toLowerCase().includes(termo) ||
                est.turma.toLowerCase().includes(termo) ||
                (est.softSkill || "").toLowerCase().includes(termo)
            );
        }

        renderizarTabela(filtrados);
    }

    // ----------------- RENDERIZAR TABELA -----------------
    function renderizarTabela(estudantes) {
        tabela.innerHTML = "";
        if (!estudantes.length) {
            tabela.innerHTML = `<tr><td colspan="7" style="text-align:center;">Nenhum estudante encontrado</td></tr>`;
            return;
        }
        estudantes.forEach(est => {
            const tr = document.createElement("tr");
            tr.dataset.id = est.id;
            tr.innerHTML = `
                <td><img src="${est.foto || '/uploads/default.jpg'}" alt="foto"></td>
                <td>${est.nome}</td>
                <td>${est.turma}</td>
                <td>${est.email || '-'}</td>
                <td>${est.nota !== null && est.nota !== undefined ? parseFloat(est.nota).toFixed(1) : "-"}</td>
                <td>${est.softSkill || "-"}</td>
                <td class="actions">
                    <button class="editar" data-id="${est.id}">👁</button>
                    <button class="excluir" data-id="${est.id}">🗑</button>
                </td>`;
            tabela.appendChild(tr);
        });
    }

    // ----------------- EDITAR / EXCLUIR -----------------
    tabela.addEventListener("click", async (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const id = btn.dataset.id;

        if (btn.classList.contains("editar")) {
            estudanteSelecionado = id;
            const est = estudantesOriginais.find(e => e.id == id);
            notaInput.value = est.nota !== null && est.nota !== undefined ? parseFloat(est.nota).toFixed(1) : "";
            softSkillSelect.value = est.softSkill || "";
            infoEstudante.innerHTML = `
                <strong>Nome:</strong> ${est.nome}<br>
                <strong>Email:</strong> ${est.email}<br>
                <strong>Turma:</strong> ${est.turma}<br><br>`;
            mostrarModal();
        }

        if (btn.classList.contains("excluir")) {
            if (!confirm("Tem certeza que deseja excluir este estudante?")) return;
            try {
                criarSpinnerGlobal();
                const res = await fetchAuth(`http://localhost:3000/estudantes/${id}`, { method: "DELETE" });
                if (!res?.ok) throw new Error("Erro ao excluir estudante");
                estudantesOriginais = estudantesOriginais.filter(est => est.id != id);
                aplicarFiltros();
                mostrarToast("Estudante excluído com sucesso!");
            } catch (err) {
                handleErro("Erro ao excluir estudante", err);
            } finally {
                removerSpinnerGlobal();
            }
        }
    });

    // ----------------- CÂMERA -----------------
    const iniciarCamera = async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            video.srcObject = stream;
            detectarBtn.style.display = "none";
            desligarCamera.style.display = "inline-block";
        } catch (err) {
            handleErro("Erro ao acessar a câmera", err);
        }
    };
    const pararCamera = () => {
        if (stream) stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        detectarBtn.style.display = "inline-block";
        desligarCamera.style.display = "none";
    };
    detectarBtn.addEventListener("click", iniciarCamera);
    desligarCamera.addEventListener("click", pararCamera);

    // ----------------- INICIALIZAÇÃO -----------------
    if (!getToken()) {
        mostrarToast("Faça login para acessar esta página.", "erro");
        logout();
    } else {
        await carregarEstudantes();
    }
});
