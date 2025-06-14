# === BUILD STAGE ===
# Utiliza una imagen base de Node.js con Alpine para un tamaño de imagen más pequeño
FROM node:20-alpine AS builder

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos de definición de dependencias y de bloqueo
# Copiarlos primero permite que Docker cachee esta capa si no cambian
COPY package.json yarn.lock* package-lock.json* ./

# Instala las dependencias (se usa --omit=dev para solo instalar deps de producción)
# Si usas yarn, usa 'yarn install --frozen-lockfile --production'
# Si usas npm, usa 'npm ci --omit=dev' para una instalación limpia basada en package-lock.json
RUN npm ci --omit=dev

# Copia el resto del código de tu aplicación
COPY . .

# Construye la aplicación NestJS (genera la carpeta 'dist')
# Asegúrate de que 'npm run build' exista en tu package.json
RUN npm run build

# === PRODUCTION STAGE ===
# Utiliza una imagen Node.js Alpine más ligera para el entorno de ejecución final
FROM node:20-alpine AS production

# Establece el directorio de trabajo
WORKDIR /app

# Copia solo las dependencias de producción y el código compilado desde la etapa de construcción
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Expon el puerto en el que tu aplicación NestJS va a escuchar.
# Cloud Run inyectará la variable de entorno PORT, pero es buena práctica exponerlo.
ENV PORT 3000
EXPOSE 3000

# Comando para iniciar tu aplicación NestJS
# Asegúrate de que tu main.ts esté en la carpeta dist y lo inicie.
# El puerto debe ser dinámico en main.ts para usar process.env.PORT
CMD ["node", "dist/main"]