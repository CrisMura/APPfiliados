# 📡 DealRadar

Aplicación web MVP que descubre automáticamente productos con grandes descuentos en MercadoLibre y los publica en un sitio web optimizado para SEO.

## 🚀 Características

- **Scraper automático**: Consulta la API de MercadoLibre cada hora
- **Detección de ofertas**: Filtra productos con descuento mayor al 30%
- **Base de datos PostgreSQL**: Almacena todas las ofertas detectadas
- **API REST**: Endpoints para consultar ofertas, ranking y estadísticas
- **Frontend Next.js**: Interfaz moderna y responsive optimizada para SEO
- **Tracking de clics**: Registra los clics en cada oferta
- **Ranking dinámico**: Las mejores ofertas del día basadas en descuento + clics

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 14 (React)
- **Backend**: Node.js + Express.js
- **Base de datos**: PostgreSQL
- **Automatización**: node-cron

## 📁 Estructura del Proyecto

```
dealradar/
├── backend/                 # Servidor Express
│   ├── db/
│   │   └── config.js       # Configuración de PostgreSQL
│   ├── routes/
│   │   └── deals.js        # Rutas de API
│   ├── server.js           # Servidor principal
│   └── package.json
├── frontend/               # Aplicación Next.js
│   ├── components/         # Componentes React
│   ├── pages/              # Páginas Next.js
│   ├── styles/             # Estilos CSS
│   └── package.json
├── database/
│   └── migrations/         # Migraciones SQL
├── scripts/
│   └── fetchDeals.js       # Script scraper
├── .env                    # Variables de entorno
└── README.md
```

## ⚙️ Instalación

### Prerrequisitos

- Node.js 18+
- PostgreSQL 14+
- npm o yarn

### Paso 1: Configurar Base de Datos

1. Instala PostgreSQL si no lo tienes
2. Crea una base de datos llamada `dealradar`:

```sql
CREATE DATABASE dealradar;
```

O desde terminal:

```bash
createdb dealradar
```

### Paso 2: Configurar Variables de Entorno

Copia el archivo `.env.example` a `.env` y configura tus valores:

```env
# Configuración de Base de Datos PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dealradar
DB_USER=postgres
DB_PASSWORD=tu_password

# Puerto del Backend
PORT=5000

# URL del Frontend
FRONTEND_URL=http://localhost:3000

# URL de la API de MercadoLibre
MELI_API_URL=https://api.mercadolibre.com/sites/MLC/search

# Descuento mínimo (30%)
MIN_DISCOUNT=0.30
```

### Paso 3: Instalar Dependencias

```bash
# Instalar dependencias del proyecto raíz
npm install

# Instalar dependencias del backend
cd backend
npm install

# Instalar dependencias del frontend
cd ../frontend
npm install
```

## 🚦 Ejecución

### Opción 1: Ejecutar todo manualmente

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Opción 2: Ejecutar solo el scraper manualmente

```bash
npm run scrape
```

Esto ejecutará el scraper una vez y guardará las ofertas en la base de datos.

## 📡 API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/deals` | Obtiene todas las ofertas |
| GET | `/api/deals?category=tecnologia` | Filtra por categoría |
| GET | `/api/deals/ranking` | Obtiene las mejores ofertas |
| GET | `/api/deals/:id` | Obtiene una oferta específica |
| GET | `/api/stats` | Estadísticas del sistema |
| POST | `/api/fetch-deals` | Ejecuta el scraper manualmente |
| GET | `/go/:id` | Redirecciona y cuenta el clic |

## 🌐 Páginas del Frontend

| Ruta | Descripción |
|------|-------------|
| `/` | Página principal con todas las ofertas |
| `/ofertas` | Todas las ofertas |
| `/ofertas/tecnologia` | Ofertas de tecnología |
| `/ofertas/hogar` | Ofertas de hogar |
| `/ofertas/herramientas` | Ofertas de herramientas |
| `/ofertas/deportes` | Ofertas de deportes |
| `/ofertas/electrodomesticos` | Ofertas de electrodomésticos |

## 🔄 Automatización

El scraper se ejecuta automáticamente cada hora gracias a node-cron. Puedes modificar esta configuración en `backend/server.js`:

```javascript
// Ejecutar cada hora
cron.schedule('0 * * * *', () => {
  fetchDeals();
});

// Otras opciones:
// Cada 15 minutos: '*/15 * * * *'
// Cada 6 horas: '0 */6 * * *'
// Diario a medianoche: '0 0 * * *'
```

## 📊 Scoring de Ofertas

Las mejores ofertas del día se calculan usando:

```
score = (descuento * 100) + clics
```

Esto combina productos con gran descuento y alta popularidad.

## 🐛 Solución de Problemas

### Error de conexión a PostgreSQL

1. Verifica que PostgreSQL esté corriendo
2. Confirma que las credenciales en `.env` sean correctas
3. Crea la base de datos si no existe

### Error al ejecutar el scraper

1. Verifica tu conexión a internet
2. Confirma que la API de MercadoLibre esté accesible
3. Revisa los logs del servidor

### Frontend no conecta al backend

1. Verifica que el backend esté corriendo en el puerto 5000
2. Confirma la variable `NEXT_PUBLIC_API_URL` en el frontend

## 📄 Licencia

MIT License - Siéntete libre de usar este proyecto para aprendizaje o proyectos propios.

---

⌨️ Creado con ❤️ por DealRadar

