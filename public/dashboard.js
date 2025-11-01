document.addEventListener("DOMContentLoaded", async () => {
    const btnEntrar = document.getElementById("btnEntrar");
    const cardsContainer = document.querySelector(".cards-container");

    const getToken = () => localStorage.getItem("token");

    const logout = () => {
        localStorage.removeItem("token");
        window.location.href = "login.html";
    };

    if (!getToken()) {
        alert("Faça login para acessar o dashboard.");
        logout();
        return;
    }

    const fetchAuth = async (url, options = {}) => {
        options.headers = options.headers || {};
        const token = getToken();
        if (!token) {
            logout();
            return null;
        }
        options.headers['Authorization'] = 'Bearer ' + token;

        try {
            const res = await fetch(url, options);
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    alert("Token inválido ou expirado. Faça login novamente.");
                    logout();
                    return null;
                }
                throw new Error(`HTTP ${res.status}`);
            }
            return res.json();
        } catch (err) {
            console.error("Erro no fetchAuth:", err);
            alert("Erro ao conectar com o servidor.");
            return null;
        }
    };

    btnEntrar.addEventListener("click", () => {
        window.location.href = "listar.html";
    });

    const criarCard = (icon, titulo, valor, filtro) => `
        <div class="card" data-filter="${filtro}">
            <i class="${icon}"></i>
            <h3>${titulo}</h3>
            <p>${valor}</p>
        </div>
    `;

    const carregarResumo = async () => {
        const data = await fetchAuth("http://localhost:3000/estudantes");
        if (!data) return;

        const estudantes = data.estudantes || data;

        // ----------------- CARDS -----------------
        const total = estudantes.length;
        const maiores7 = estudantes.filter(e => Number(e.nota) >= 7).length;
        const menores7 = estudantes.filter(e => Number(e.nota) < 7).length;

        cardsContainer.innerHTML = `
            ${criarCard("fas fa-user-graduate", "Total de Estudantes", total, "todos")}
            ${criarCard("fas fa-star", "Notas ≥ 7", maiores7, "nota7")}
            ${criarCard("fas fa-star-half-alt", "Notas < 7", menores7, "notaMenor7")}
            ${criarCard("fas fa-cogs", "Configurações", "Gerencie usuários e permissões", "config")}
        `;

        // ----------------- EVENTO DE CLIQUE NOS CARDS -----------------
        document.querySelectorAll(".card").forEach(card => {
            card.addEventListener("click", async () => {
                const filter = card.dataset.filter;

                if (filter === "config") {
                    if (!sessionStorage.getItem('acessoConfig')) {
                        const senha = prompt("Digite a senha de configurações:");
                        if (!senha) return;

                        try {
                            const res = await fetch("http://localhost:3000/auth/check-config-pass", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ password: senha })
                            });

                            if (res.ok) {
                                sessionStorage.setItem('acessoConfig', 'true');
                            } else {
                                alert("Senha incorreta!");
                                return;
                            }
                        } catch (err) {
                            console.error("Erro ao validar senha:", err);
                            alert("Erro ao conectar com o servidor.");
                            return;
                        }
                    }
                    window.location.href = "cadastroUsuario.html";
                    return;
                }

                // ----------------- REDIRECIONAMENTO COM FILTRO -----------------
                let url = "listar.html";
                if (filter === "nota7") url += "?filtroNota=7";
                if (filter === "notaMenor7") url += "?filtroNotaMenor7=1";
                window.location.href = url;
            });
        });

        // ----------------- GRÁFICO -----------------
        const ctxNotas = document.getElementById("chartNotas").getContext("2d");
        const notaDistrib = Array(11).fill(0);

        estudantes.forEach(e => {
            const n = Math.round(Number(e.nota) || 0);
            if (n >= 0 && n <= 10) notaDistrib[n]++;
        });

        if (window.chartNotasInstance) window.chartNotasInstance.destroy();
        window.chartNotasInstance = new Chart(ctxNotas, {
            type: 'bar',
            data: {
                labels: Array.from({ length: 11 }, (_, i) => i),
                datasets: [{
                    label: 'Distribuição de Notas',
                    data: notaDistrib,
                    backgroundColor: '#4CAF50'
                }]
            },
            options: { 
                responsive: true, 
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    };

    await carregarResumo();
    setInterval(carregarResumo, 10000); // Atualiza a cada 10s
});
