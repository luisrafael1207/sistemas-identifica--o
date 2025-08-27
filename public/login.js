document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const senhaInput = document.getElementById('senha');
    const mensagemErro = document.getElementById('mensagemErro');
    const loginButton = document.getElementById('loginButton');
    const buttonText = document.getElementById('buttonText');
    const buttonSpinner = document.getElementById('buttonSpinner');
    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');

    const setLoading = (loading) => {
        loginButton.disabled = loading;
        buttonText.textContent = loading ? 'Entrando...' : 'Entrar';
        buttonSpinner.style.display = loading ? 'inline-block' : 'none';
        loginButton.setAttribute('aria-busy', loading);
    };

    const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

    [emailInput, senhaInput].forEach(input => {
        input.addEventListener('input', () => {
            mensagemErro.textContent = '';
            input.style.borderColor = '';
        });
    });

    emailInput.focus();

    // Redireciona se já estiver logado
    if (localStorage.getItem('token')) {
        window.location.href = 'listar.html';
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        const senha = senhaInput.value.trim();

        if (!email || !senha) {
            mensagemErro.textContent = 'Preencha todos os campos.';
            if (!email) emailInput.style.borderColor = 'red';
            if (!senha) senhaInput.style.borderColor = 'red';
            return;
        }

        if (!validateEmail(email)) {
            mensagemErro.textContent = 'Insira um e-mail válido.';
            emailInput.style.borderColor = 'red';
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('http://localhost:3000/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Erro no login');

            // Salva token e informações do usuário
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Redireciona
            window.location.href = data.redirectTo || 'dashboard.html';

        } catch (error) {
            mensagemErro.textContent = error.message || 'Erro desconhecido';
            senhaInput.value = '';
            senhaInput.style.borderColor = 'red';
            console.error("Erro no login:", error);
        } finally {
            setLoading(false);
        }
    });

    forgotPasswordBtn.addEventListener('click', () => {
        window.location.href = 'recuperar.html';
    });
});

// Função auxiliar para requisições autenticadas
async function fetchAuth(url, options = {}) {
    const token = localStorage.getItem('token');
    const headers = options.headers || {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    options.headers = headers;

    try {
        const response = await fetch(url, options);

        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            throw new Error('Não autenticado');
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error("Erro na requisição autenticada:", error);
        throw error;
    }
}
