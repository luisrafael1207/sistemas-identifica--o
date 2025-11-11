# Dockerfile
FROM node:18-alpine

# diretório da app
WORKDIR /usr/src/app

# copiar package.json e package-lock (se houver) primeiro pra cache de npm install
COPY package*.json ./

# instalar dependências
RUN npm install --production

# copiar o resto do código
COPY . .

# rebuild caso você use typescript ou build step (descomente se precisar)
# RUN npm run build

# expõe a porta da aplicação
EXPOSE 3000

# variáveis de ambiente por runtime (valores vem do docker-compose/.env)
ENV PORT=3000

# comando padrão
CMD ["node", "server.js"]
