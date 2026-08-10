# 📡 DealRadar

Aplicación web MVP para gestionar ofertas y visualizarlas desde un backend Express con frontend Next.js.

## 🚀 Características

- **API REST**: Endpoints para consultar ofertas, ranking y estadísticas
- **Base de datos PostgreSQL**: Almacena las ofertas cargadas manualmente
- **Frontend Next.js**: Interfaz moderna y responsive optimizada para SEO
- **Tracking de clics**: Registra los clics en cada oferta
- **Ranking dinámico**: Las mejores ofertas del día basadas en descuento + clics
- **Más vendidos de Meli**: Sincroniza los 15 primeros productos del ranking público de Mercado Libre Chile cada 5 minutos

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 14 (React)
- **Backend**: Node.js + Express.js
- **Base de datos**: PostgreSQL

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

# Descuento mínimo (30%)
MIN_DISCOUNT=0.30

# Sincronización de Mercado Libre (opcionales)
MELI_BEST_SELLERS_LIMIT=15
MELI_SYNC_ON_START=true
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

### Opción 1: Ejecutar el backend y frontend

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

## 📡 API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/deals` | Obtiene todas las ofertas |
| GET | `/api/deals?category=tecnologia` | Filtra por categoría |
| GET | `/api/deals/ranking` | Obtiene las mejores ofertas |
| GET | `/api/deals/:id` | Obtiene una oferta específica |
| GET | `/api/stats` | Estadísticas del sistema |
| GET | `/go/:id` | Redirecciona y cuenta el clic |
| GET | `/api/admin/products` | Lista productos (requiere Basic Auth) |
| GET | `/api/admin/products/:id` | Obtiene producto por id (requiere Basic Auth) |
| POST | `/api/admin/products` | Crea producto con enlace de afiliado (requiere Basic Auth) |
| PUT | `/api/admin/products/:id` | Actualiza producto (requiere Basic Auth) |

La sincronización conserva `url_affiliate`, `clicks` e `id` de productos existentes. Los productos
que salen del ranking quedan con `is_best_seller = false`; no se eliminan para preservar el historial.

### Ejecución sin backend

El workflow `.github/workflows/sync-meli-best-sellers.yml` ejecuta la sincronización cada 6 horas
mediante GitHub Actions. Requiere los secretos `DATABASE_URL` y `SCRAPEDO_TOKEN` configurados en el repositorio y también
permite una ejecución manual desde la pestaña **Actions**.

## 🔒 Autenticación de administración

Para usar los endpoints admin, define `ADMIN_PASSWORD` en tu `.env` y envía una cabecera `Authorization: Basic :<password>` con la contraseña. Ejemplo de comando:

```bash
curl -u :$ADMIN_PASSWORD -X POST http://localhost:5000/api/admin/products \
  -H "Content-Type: application/json" \
  -d '{"title":"Producto","price":100,"original_price":150,"url":"https://example.com","url_affiliate":"https://afiliado.com"}'
```

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

## 📄 Licencia

MIT License - Siéntete libre de usar este proyecto para aprendizaje o proyectos propios.

---

⌨️ Creado con ❤️ por DealRadar
# Links de afiliado de Mercado Libre (proceso local)

Este proceso se ejecuta en Windows porque necesita una sesión autenticada de Mercado Libre. La sesión se guarda únicamente en `.meli-affiliate-profile/`, carpeta excluida de Git.

1. Crea un archivo `.env` en la raíz con `DATABASE_URL` apuntando a Neon.
2. Ejecuta `setup-affiliate-links.bat` una sola vez, inicia sesión y confirma que la barra negra de afiliados aparezca sobre un producto.
3. Ejecuta `sync-affiliate-links.bat` para revisar los productos más vendidos sin enlace.

El sincronizador guarda `url_affiliate` solo si la comisión mostrada es mayor que 0%. Nunca reemplaza un enlace afiliado existente. Si la sesión vence, vuelve a ejecutar `setup-affiliate-links.bat`.

Variables opcionales del archivo `.env`:

```env
MELI_AFFILIATE_LIMIT=15
MELI_AFFILIATE_DELAY_MS=4000
MELI_AFFILIATE_HEADLESS=true
```
