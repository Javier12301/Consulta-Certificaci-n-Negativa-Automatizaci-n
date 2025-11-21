# Usamos la imagen oficial de Puppeteer (ya trae Chrome instalado y configurado)
FROM ghcr.io/puppeteer/puppeteer:latest

# Configuramos variables para que sepa dónde está Chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app

# Copiamos los archivos de configuración
COPY package*.json ./

# Instalamos las dependencias como usuario root para evitar permisos denegados
USER root
RUN npm install

# Copiamos el resto de tu código
COPY . .

# Volvemos al usuario seguro de Puppeteer
USER pptruser

# Comando para iniciar tu servidor
CMD [ "node", "server.js" ]