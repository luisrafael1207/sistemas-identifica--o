document.addEventListener("DOMContentLoaded", async () => {
    const tabela = document.getElementById("tabelaEstudantes");
    const filtro = document.getElementById("filtro");
    const video = document.getElementById("video");
    const detectarBtn = document.getElementById("detectarBtn");
    const desligarCamera = document.getElementById("desligarCamera");
    const btnSair = document.getElementById("btnSair");
    const btnVoltar = document.getElementById("btnVoltar");
    const modal = document.getElementById("modal");
    const closeModal = document.getElementById("closeModal");
    const notaInput = document.getElementById("notaInput");
    const softSkillSelect = document.getElementById("softSkillSelect");
    const salvarBtn = document.getElementById("salvarAlteracoes");
    const infoEstudante = document.getElementById("infoEstudante");

    let estudanteSelecionado = null;
    let estudantesOriginais = [];
    let stream = null;

    const getToken = () => localStorage.getItem("token");

    const fetchAuth = async (url, options = {}) => {
        if (!options.headers) options.headers = {};
        const token = getToken();
        if (token) options.headers['Authorization'] = 'Bearer ' + token;
        try {
            const res = await fetch(url, options);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res;
        } catch (err) {
            console.error("Erro no fetchAuth:", err);
            return null;
        }
    };

    const criarSpinner = () => {
        const spinner = document.createElement("span");
        spinner.classList.add("spinner");
        spinner.style.marginLeft = "8px";
        spinner.innerHTML = "⏳";
        return spinner;
    };

    const toggleButtonSpinner = (btn, loading) => {
        btn.disabled = loading;
        if (loading) {
            const spinner = criarSpinner();
            btn.appendChild(spinner);
        } else {
            const spinner = btn.querySelector(".spinner");
            if (spinner) spinner.remove();
        }
    };

    const mostrarModal = () => modal.style.display = "flex";
    const esconderModal = () => {
        modal.style.display = "none";
        estudanteSelecionado = null;
        infoEstudante.innerHTML = "";
        notaInput.value = "";
        softSkillSelect.value = "";
        salvarBtn.disabled = false;
        const spinner = salvarBtn.querySelector(".spinner");
        if (spinner) spinner.remove();
    };

    const logout = () => {
        localStorage.removeItem("token");
        window.location.href = "login.html";
    };

    const handleErro = (msg, err) => {
        console.error(msg, err);
        alert(msg + (err?.message ? `: ${err.message}` : ""));
    };

    // Navegação
    btnVoltar.addEventListener("click", () => window.location.href = "cadastro.html");
    btnSair.addEventListener("click", async () => {
        try { await fetch("http://localhost:3000/auth/logout", { method: "POST", credentials: "include" }); } catch {}
        logout();
    });
    closeModal.addEventListener("click", esconderModal);

    // Salvar alterações (nota + soft skill)
    salvarBtn.addEventListener("click", async () => {
        if (!estudanteSelecionado) return;
        const id = estudanteSelecionado;
        const nota = notaInput.value.trim();
        const softSkill = softSkillSelect.value;

        const payload = {};
        if (nota !== "") payload.nota = parseFloat(nota);
        if (softSkill) payload.softSkill = softSkill;

        if (Object.keys(payload).length === 0) return alert("Nenhum valor para atualizar");

        toggleButtonSpinner(salvarBtn, true);

        try {
            const res = await fetchAuth(`http://localhost:3000/estudantes/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!res?.ok) throw new Error("Erro ao atualizar estudante");

            const data = await res.json();
            const estudanteAtualizado = data.estudante;
            const index = estudantesOriginais.findIndex(e => e.id == id);
            if (index !== -1) estudantesOriginais[index] = estudanteAtualizado;

            renderizarTabela(estudantesOriginais);
            alert("Alterações salvas com sucesso!");
            esconderModal();
        } catch (err) {
            handleErro("Erro ao salvar alterações", err);
            toggleButtonSpinner(salvarBtn, false);
        }
    });

    // Filtro
    filtro.addEventListener("input", () => {
        const termo = filtro.value.toLowerCase();
        const filtrados = estudantesOriginais.filter(est =>
            est.nome.toLowerCase().includes(termo) ||
            est.turma.toLowerCase().includes(termo) ||
            (est.softSkill || "").toLowerCase().includes(termo)
        );
        renderizarTabela(filtrados);
    });

    // Carregar estudantes
    async function carregarEstudantes() {
        try {
            const res = await fetchAuth("http://localhost:3000/estudantes");
            if (!res) return;
            const data = await res.json();
            estudantesOriginais = data.estudantes || data;
            renderizarTabela(estudantesOriginais);
        } catch (err) {
            handleErro("Erro ao carregar estudantes", err);
        }
    }

    // Renderizar tabela
    function renderizarTabela(estudantes) {
        tabela.innerHTML = "";
        estudantes.forEach(est => {
            const tr = document.createElement("tr");
            tr.dataset.id = est.id;
            tr.innerHTML = `
                <td><img src="${est.foto || '/uploads/default.jpg'}" alt="foto" width="50"></td>
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

    // Delegação de eventos para editar/excluir
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
            toggleButtonSpinner(btn, true);
            try {
                const res = await fetchAuth(`http://localhost:3000/estudantes/${id}`, { method: "DELETE" });
                if (!res?.ok) throw new Error("Erro ao excluir estudante");
                estudantesOriginais = estudantesOriginais.filter(est => est.id != id);
                renderizarTabela(estudantesOriginais);
                alert("Estudante excluído com sucesso!");
            } catch (err) {
                handleErro("Erro ao excluir estudante", err);
            } finally {
                toggleButtonSpinner(btn, false);
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
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        video.srcObject = null;
        detectarBtn.style.display = "inline-block";
        desligarCamera.style.display = "none";
    };

    detectarBtn.addEventListener("click", iniciarCamera);
    desligarCamera.addEventListener("click", pararCamera);

    // Inicialização
    if (!getToken()) {
        alert("Faça login para acessar esta página.");
        logout();
    } else {
        await carregarEstudantes();
    }
});
