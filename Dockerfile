# Usamos la imagen oficial (ya trae Chrome)
FROM ghcr.io/puppeteer/puppeteer:latest

WORKDIR /usr/src/app

# Copiamos los archivos de configuración
COPY package*.json ./

# Pasamos a usuario ROOT temporalmente para poder instalar dependencias
USER root
RUN npm install

# Copiamos el resto de los archivos
COPY . .

# IMPORTANTE: Volvemos al usuario de seguridad de Puppeteer
# (Si no hacemos esto, Chrome no arranca por seguridad)
USER pptruser

# Arrancamos el servidor
CMD [ "node", "server.js" ]