# Past in Pixels

Past in Pixels es una aplicación web cultural y educativa que permite explorar grandes acontecimientos históricos a través de las obras de arte creadas durante ese contexto. Combina datos de cuatro APIs culturales abiertas (Wikidata, Europeana, The Metropolitan Museum of Art y Art Institute of Chicago) con un mapa interactivo de Google Maps, ofreciendo al usuario registrado la posibilidad de crear recorridos narrativos personalizados.

## Tecnologías utilizadas

- **Frontend:** React 19 + React Router + @react-google-maps/api
- **Backend:** Node.js + Express
- **Base de datos:** MySQL
- **APIs externas:** Wikidata (SPARQL), Europeana API, Met API, Chicago API, Google Maps API
- **Autenticación:** JWT + bcrypt
- **Herramienta de construcción:** Vite

## Requisitos previos

- Node.js v18 o superior
- MySQL 8 o superior
- Clave de API de Google Maps activa con los servicios **Maps JavaScript API** y **Places API** habilitados
- Clave de acceso a Europeana API (registro gratuito en [europeana.eu](https://europeana.eu))

## Instalación y puesta en marcha

### 1. Clonar el repositorio

```bash
git clone https://github.com/Nuguit/pastinpixels.git
cd pastinpixels
```

### 2. Instalar dependencias del frontend

```bash
npm install
```

### 3. Instalar dependencias del backend

```bash
cd backend
npm install
cd ..
```

### 4. Crear la base de datos

Ejecuta el script SQL incluido en el repositorio desde un cliente MySQL:

```sql
source pastinpixels_db.sql
```

### 5. Configurar las variables de entorno

Copia los ficheros de ejemplo y rellena tus propios valores:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

**Variables del frontend (`.env`):**

| Variable | Descripción |
|---|---|
| `VITE_GOOGLE_MAPS_API_KEY` | Clave de la Google Maps API |
| `VITE_EUROPEANA_API_KEY` | Clave de la Europeana API |

**Variables del backend (`backend/.env`):**

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor (por defecto 3001) |
| `CLIENT_URL` | URL del frontend (por defecto http://localhost:5173) |
| `DB_HOST` | Host de MySQL |
| `DB_PORT` | Puerto de MySQL |
| `DB_USER` | Usuario de MySQL |
| `DB_PASSWORD` | Contraseña de MySQL |
| `DB_NAME` | Nombre de la base de datos |
| `JWT_SECRET` | Cadena larga y aleatoria para firmar los tokens |
| `JWT_EXPIRES_IN` | Duración de los tokens (por defecto 7d) |

### 6. Arrancar la aplicación

En una terminal, arranca el backend:

```bash
cd backend
npm run dev
```

En otra terminal, arranca el frontend:

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:5173](http://localhost:5173).

## Estructura del proyecto

```
pastinpixels/
├── src/                  # Código del frontend (React + Vite)
│   ├── api/              # Servicios de llamada a APIs externas
│   ├── components/       # Componentes reutilizables
│   ├── pages/            # Páginas de la aplicación
│   └── global.css        # Estilos globales
├── backend/              # Código del servidor (Node.js + Express)
│   ├── controllers/      # Lógica de negocio
│   ├── routes/           # Definición de rutas
│   ├── middleware/       # Middleware de autenticación
│   └── server.js         # Punto de entrada del servidor
├── pastinpixels_db.sql   # Script de creación de la base de datos
├── .env.example          # Plantilla de variables de entorno del frontend
└── package.json
```
