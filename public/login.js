document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const senhaInput = document.getElementById('senha');
    const mensagemErro = document.getElementById('mensagemErro');
    const loginButton = document.getElementById('loginButton');

    // Verifica se já está logado e redireciona
    const fromLogout = sessionStorage.getItem('fromLogout');

    if (isTokenValid() && !fromLogout) {
        // Usuário já logado, redireciona para a tela principal
        window.location.href = 'listar.html';
        return;
    }

    // Limpa o marcador de logout
    sessionStorage.removeItem('fromLogout');

    // Evento de envio do formulário de login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validação simples de campos
        if (!emailInput.value || !senhaInput.value) {
            mensagemErro.textContent = 'Preencha todos os campos.';
            return;
        }

        // Mostra carregamento
        loginButton.disabled = true;
        loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';

        try {
            const response = await fetch('http://localhost:3000/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: emailInput.value,
                    senha: senhaInput.value
                })
            });

            const text = await response.text();
            let data;

            try {
                data = JSON.parse(text);
            } catch (jsonError) {
                console.error('Resposta inesperada do servidor:', text);
                throw new Error('Erro inesperado no servidor');
            }

            if (!response.ok) {
                throw new Error(data.message || 'Erro no login');
            }

            // Armazena token e dados do usuário
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Armazena a expiração do token
            setTokenExpiration(data.token);

            // Redireciona para a rota definida ou página padrão
            window.location.href = data.redirectTo || 'listar.html';

        } catch (error) {
            console.error('Erro:', error);
            mensagemErro.textContent = error.message || 'Erro desconhecido';
            senhaInput.value = ''; // limpa o campo senha
        } finally {
            loginButton.disabled = false;
            loginButton.textContent = 'Entrar';
        }
    });
});

// Função para verificar se o token é válido
function isTokenValid() {
    const token = localStorage.getItem('token');
    if (!token) return false;

    const expiration = localStorage.getItem('tokenExpiration');
    if (!expiration) return false;

    const now = Date.now();
    return now < expiration;
}

// Função para armazenar a expiração do token (em 1 hora, por exemplo)
function setTokenExpiration(token) {
    const decodedToken = decodeJWT(token);
    const expirationTime = decodedToken.exp * 1000; // Expiração do token em milissegundos
    localStorage.setItem('tokenExpiration', expirationTime);
}

// Função para decodificar o JWT (json web token)
function decodeJWT(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}
