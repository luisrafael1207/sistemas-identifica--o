# Sistemas de Identificação

## 1. Descrição
Sistema web para gerenciamento de estudantes com autenticação, upload de fotos e reconhecimento facial.  
Funcionalidades principais:  
- Cadastro e autenticação de usuários;  
- Upload e armazenamento de fotos;  
- Listagem e filtragem de estudantes;  
- Integração com reconhecimento facial via câmera;  
- Atualização de notas e informações acadêmicas;  
- Segurança via JWT e senhas com hash.

---

## 2. Tecnologias Utilizadas
| Camada            | Tecnologia / Biblioteca        |
|------------------|-------------------------------|
| Back-end         | Node.js, Express              |
| Banco de dados   | MySQL                         |
| Autenticação     | JWT (JSON Web Tokens)         |
| Upload de arquivos | Multer                      |
| Front-end        | HTML, CSS, JavaScript         |
| Reconhecimento facial | OpenCV (integração Node.js ou API) |
| Container        | Docker (opcional)             |

---

## 3. Estrutura de Pastas

/config -> Configurações do servidor e do banco de dados
/controllers -> Lógica das rotas e controle de dados
/middleware -> Middlewares (autenticação, tratamento de erros)
/public -> Arquivos públicos (CSS, JS, imagens)
/routes -> Definição das rotas da aplicação
/uploads -> Armazenamento temporário de arquivos enviados
/utils -> Funções utilitárias (helpers)
server.js -> Arquivo principal para iniciar o servidor


---

## 4. Instalação

1. Clone o repositório:
```bash
git clone https://github.com/luisrafael1207/sistemas-identifica--o.git

    Instale as dependências:

cd sistemas-identifica--o
npm install

    Crie o arquivo .env (baseado em .env.example):

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=senha
DB_NAME=sistemas_identificacao
JWT_SECRET=seusegredojwt
PORT=3000

    Configure o banco de dados MySQL:

CREATE DATABASE sistemas_identificacao;

    Inicie o servidor:

npm start

O sistema estará disponível em http://localhost:3000.
5. Fluxo do Sistema
5.1 Diagrama de Fluxo Geral

flowchart TD
    A[Usuário] -->|Login| B[Servidor]
    B -->|Valida credenciais| C[Banco de Dados]
    C -->|Retorna resultado| B
    B -->|Gera JWT| A
    A -->|Acessa páginas protegidas| B

5.2 Fluxo de Cadastro de Estudante

sequenceDiagram
    participant Admin
    participant Servidor
    participant DB
    Admin->>Servidor: POST /estudantes {dados}
    Servidor->>DB: Salva dados
    DB-->>Servidor: Confirmação
    Servidor-->>Admin: Retorna sucesso

Exemplo de requisição:

POST /estudantes
{
  "nome": "João Silva",
  "matricula": "2025001",
  "turma": "5º Ano",
  "email": "joao@escola.com"
}

Exemplo de resposta:

{
  "status": "sucesso",
  "mensagem": "Estudante cadastrado"
}

5.3 Fluxo de Upload de Foto

sequenceDiagram
    participant Usuário
    participant Servidor
    Usuário->>Servidor: POST /estudantes/:id/foto {imagem}
    Servidor-->>Servidor: Multer processa arquivo
    Servidor-->>Usuário: Confirma upload

5.4 Fluxo de Reconhecimento Facial

sequenceDiagram
    participant Usuário
    participant Servidor
    participant DB
    Usuário->>Servidor: POST /reconhecimento {imagem}
    Servidor->>DB: Busca fotos no banco
    DB-->>Servidor: Retorna dados
    Servidor-->>Usuário: Retorna estudante identificado

Exemplo de requisição:

POST /reconhecimento
{
  "imagem": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..."
}

Exemplo de resposta:

{
  "status": "sucesso",
  "estudante": {
    "id": 1,
    "nome": "João Silva"
  }
}

6. Segurança

    Senhas armazenadas com hash (bcrypt).

    JWT para autenticação de rotas protegidas.

    Variáveis sensíveis no .env (não versionar).

7. Sugestões de Melhorias

    Testes unitários e de integração (Jest, Mocha, Chai).

    Documentação completa da API (Swagger ou Postman).

    Containerização completa com Docker/Docker Compose.

    Logs estruturados e tratamento de exceções robusto.

8. Contribuição

    Fork o repositório

    Crie sua branch: git checkout -b minha-feature

    Commit suas alterações: git commit -m "Minha feature"

    Push para a branch: git push origin minha-feature

    Abra um Pull Request
