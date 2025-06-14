# Backend API - NestJS

Este proyecto es una API REST construida con NestJS, utilizando TypeScript.

## 🚀 Tecnologías Principales

- **NestJS**: Framework para construir aplicaciones del lado del servidor
- **TypeScript**: Lenguaje de programación tipado
- **Prisma**: ORM para la gestión de la base de datos
- **Supabase**: Plataforma de backend como servicio
- **Passport**: Middleware de autenticación
- **JWT**: Para la gestión de tokens de autenticación

## 📦 Dependencias Principales

### Dependencias de Producción
- @nestjs/common: ^10.0.0
- @nestjs/config: ^4.0.2
- @nestjs/core: ^10.0.0
- @nestjs/passport: ^11.0.5
- @prisma/client: ^6.9.0
- @supabase/supabase-js: ^2.50.0
- class-transformer: ^0.5.1
- class-validator: ^0.14.2
- date-fns: ^4.1.0
- express-rate-limit: ^7.5.0
- helmet: ^8.1.0
- passport: ^0.7.0
- passport-jwt: ^4.0.1

### Dependencias de Desarrollo
- @nestjs/cli: ^10.0.0
- @typescript-eslint/eslint-plugin: ^8.0.0
- eslint: ^8.0.0
- jest: ^29.5.0
- prettier: ^3.0.0
- prisma: ^6.9.0
- typescript: ^5.1.3

## 🛠️ Instalación

1. Clonar el repositorio:
```bash
git clone [URL_DEL_REPOSITORIO]
cd backend
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

4. Generar cliente Prisma:
```bash
npx prisma generate
```

## 🚀 Ejecución

### Desarrollo
```bash
npm run start:dev
```

### Producción
```bash
npm run build
npm run start:prod
```

### Docker
```bash
docker build -t backend .
docker run -p 8080:8080 backend
```

## 📝 Scripts Disponibles

- `npm run build`: Compila el proyecto
- `npm run start`: Inicia la aplicación
- `npm run start:dev`: Inicia en modo desarrollo con hot-reload

## 🔒 Seguridad

El proyecto implementa varias medidas de seguridad:
- Helmet para headers HTTP seguros
- Rate limiting para prevenir ataques de fuerza bruta
- Autenticación JWT
- Validación de datos con class-validator
- Protección contra inyección SQL mediante Prisma

## 🎯 Buenas Prácticas Implementadas

1. **Arquitectura**
   - Estructura modular con NestJS
   - Separación de responsabilidades
   - Patrón Repository para acceso a datos

2. **Código**
   - TypeScript para tipado estático
   - ESLint y Prettier para consistencia
   - Documentación de código
   - Manejo de errores centralizado

3. **Seguridad**
   - Validación de datos
   - Autenticación robusta
   - Headers de seguridad
   - Rate limiting

4. **DevOps**
   - Docker para containerización
   - Multi-stage builds
   - CI/CD ready

## 🤖 Asistencia de IA

Este proyecto ha sido desarrollado con la asistencia de:
- Cursor: Para desarrollo y debugging
- ChatGPT: Para consultas y resolución de problemas
- Gemini: Para optimización de código y sugerencias
