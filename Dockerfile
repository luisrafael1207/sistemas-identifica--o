FROM node:20-alpine

# Cria diretório do app
WORKDIR /usr/src/app

# Instala mysql-client (para mysqladmin)
RUN apk add --no-cache mysql-client

# Copia dependências
COPY package*.json ./

# Instala dependências
RUN npm install

# Copia todo o resto do código
COPY . .

# Expõe a porta do servidor
EXPOSE 3000

# Comando para subir a aplicação
CMD ["npm", "start"]
