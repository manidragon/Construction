# ApexBuild ERP - Construction Project Management & Operations

Comprehensive full-stack ERP built for civil contractors, builders, and construction firms. Manages site operations, BOQ estimations, material procurement, stock inventory, daily site reports (DPR), equipment tracking, labour wages, client billing, and project financial accounting.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, Multer, Helmet, CORS
- **Database**: SQLite (Zero configuration, high-performance embedded database with volume persistence)
- **Deployment**: Docker, Coolify, Hostinger VPS

---

## 🚀 Live Deployment on Coolify (Hostinger VPS)

The project includes a production multi-stage [`Dockerfile`](./Dockerfile) and [`docker-compose.yml`](./docker-compose.yml). In production, the backend serves both the API endpoints (`/api/*`) and the built React frontend from port `5000`.

### 1. Hostinger DNS Record
Add an **A Record** in Hostinger hPanel for `nearlook.com`:
- **Type**: `A`
- **Name**: `construction` *(creates `construction.nearlook.com`)*
- **Points to**: `YOUR_VPS_IP`
- **TTL**: `14400`

### 2. Coolify Deployment
1. Create a new Application in Coolify pointing to this GitHub repository (`main` branch).
2. Set Domain to `https://construction.nearlook.com` (Coolify will automatically provision SSL via Let's Encrypt).
3. Set Exposed Port to `5000`.
4. Add Persistent Storage:
   - **Volume Name**: `construction_data`
   - **Destination**: `/app/data`
5. Configure Environment Variables:
   - `PORT=5000`
   - `NODE_ENV=production`
   - `DATABASE_URL=file:/app/data/prod.db`
   - `UPLOAD_DIR=/app/data/uploads`
   - `JWT_SECRET=your_super_secret_jwt_key`
   - `JWT_EXPIRES_IN=7d`
   - `SEED_DB=true` *(set to true on 1st deploy to populate initial data)*

---

## 🔑 Pre-seeded Role Accounts (Default Password: `Password@123`)

| Role | Email | Description |
| :--- | :--- | :--- |
| **Owner / MD** | `owner@apexbuild.com` | Full executive control, financial audits, profit/loss |
| **Project Manager** | `pm@apexbuild.com` | Project execution, BOQ, change orders, site approvals |
| **Site Engineer** | `engineer@apexbuild.com` | DPR creation, daily attendance, material requisitions |
| **Accounts Manager** | `accounts@apexbuild.com` | Client billing, supplier bills, petty cash, ledger |
| **Purchase Manager** | `purchase@apexbuild.com` | Purchase orders, vendor management, quotes |
| **Storekeeper** | `store@apexbuild.com` | GRN receipts, warehouse stock balance, issues |
| **HR Manager** | `hr@apexbuild.com` | Worker master, daily wages, attendance verification |
| **Auditor** | `auditor@apexbuild.com` | Read-only compliance, system-wide audit logs |

---

## 💻 Local Development

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Database Setup
```bash
npm run db:push
npm run db:seed
```

### 3. Run Dev Servers
```bash
# Terminal 1: Backend (Port 5000)
npm run dev:backend

# Terminal 2: Frontend (Port 3000)
npm run dev:frontend
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
