# The Best Way School — ERP

MERN-ish stack: React (Vite) + Express + MongoDB, sab Docker Compose se chalta hai.

## Repo layout

```
backend/          Express API (CommonJS, src/server.js)
  src/routes/     /api/* route modules
  src/models/     Mongoose models
  src/seedAll.js  Demo/bootstrap data seed
  entrypoint.sh   Mongo ka intezar -> seed -> server start
  .env            SECRETS — git mein nahi, har environment pe alag
frontend/         React + Vite + Tailwind, PWA enabled
  vite.config.js  /api aur /uploads ko backend pe proxy karta hai
deploy/           nginx site config template
docker-compose.yml
```

## Architecture — ek ahem baat

Frontend container **khud** `/api` aur `/uploads` ko backend pe proxy karta hai
(`vite.config.js` ka `server.proxy`). nginx sirf frontend se baat karta hai.

```
browser -> Cloudflare -> nginx :443 -> frontend :3000 -> backend :5000 -> mongo :27017
```

Isi wajah se sab kuch same-origin rehta hai aur CORS kabhi beech mein nahi aata.
Backend ka port sirf debugging ke liye expose hai — kabhi bhi nginx ko seedha
backend pe point mat karna, warna CORS ke masle shuru ho jayenge.

## Local development

```bash
cd backend  && npm install && npm run dev     # :5000, local mongo chahiye
cd frontend && npm install && npm run dev     # :3000
```

## Environment files (dono git-ignored — har environment pe hath se banti hain)

| File | Kya karti hai |
|---|---|
| `.env` (root) | `ALLOWED_ORIGIN`, `FRONTEND_URL`, `VITE_ALLOWED_HOSTS` — compose khud parhta hai |
| `backend/.env` | JWT secret, admin creds, Gmail SMTP, Gemini key. **Iske baghair compose start hi nahi hota** (`env_file` mein referenced) |

Templates: `.env.example` aur `backend/.env.example`.

`VITE_ALLOWED_HOSTS` mein domain zaroor daalna — Vite 5.4+ anjaan `Host` header
reject kar deta hai, aur reverse proxy ke peeche public domain hi aata hai.

Har deployment ka `JWT_SECRET` alag hona chahiye (`openssl rand -hex 48`).
Same secret hoga to ek deployment ka login token doosre pe bhi chal jayega.

---

# Production deployment

## Server pe kya kahan hai

| | |
|---|---|
| Path | `/var/www/bws` |
| Domain | `thebestwayschool.pk` + `www` |
| Compose project | `bws` |
| Containers | `bws_frontend`, `bws_backend`, `bws_database` |
| Volumes | `bws_mongo-data`, `bws_uploads-data` |
| Ports | `127.0.0.1:8090` (frontend), `127.0.0.1:8091` (backend) — **loopback only** |
| nginx | `/etc/nginx/sites-available/thebestwayschool` |
| SSL | Let's Encrypt (certbot --nginx), auto-renew `certbot.timer` se |
| Cloudflare | Proxy ON, SSL mode **Full (strict)** |

## ⚠️ Ye VPS share hoti hai

Server pe kuch aur (bilkul alag) projects bhi chal rahe hain — jin mein ek aur
Mongo-based ERP bhi shamil hai jiske containers `erp_*` naam ke hain aur port
3000/5000 use karte hain.

**Sirf `bws_*` containers aur `bws_*` volumes is project ke hain.**

- `erp_*`, `ams_*`, `examgen_pro_*` containers ko kabhi mat rokna, hataana ya rebuild karna
- Un projects ke nginx sites ko edit mat karna
- `docker system prune`, `docker volume prune` ya koi bhi global cleanup **kabhi mat chalana** — doosre projects ka data ur jayega
- Hamesha `/var/www/bws` se `docker-compose` chalao (project scoping isi se hoti hai)

`container_name` aur port clash `docker-compose.override.yml` se hal kiye gaye
hain — wo file jaan-boojh kar git mein nahi rakhi gayi, sirf server pe rehti hai:

```yaml
services:
  mongo:
    container_name: bws_database
  backend:
    container_name: bws_backend
  frontend:
    container_name: bws_frontend
```

## Deploy / update

```bash
cd /var/www/bws
git pull
docker-compose up -d --build
docker-compose logs --tail=50 backend
```

Compose **v2** hai lekin binary ka naam `docker-compose` hai — `docker compose`
(space wala) is server pe kaam nahi karta.

## Health check

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8090   # 200 chahiye
curl -s http://127.0.0.1:8091/                                    # API ok json
docker-compose ps
```

## Backup (mongo + uploads)

```bash
docker exec bws_database mongodump --db institute_erp --archive=/tmp/bws.archive
docker cp bws_database:/tmp/bws.archive ./bws-$(date +%F).archive
docker run --rm -v bws_uploads-data:/u -v "$PWD":/b alpine \
  tar czf /b/bws-uploads-$(date +%F).tar.gz -C /u .
```

## Frontend abhi dev server pe chal raha hai

`frontend/Dockerfile` production mein bhi `npm run dev` (Vite dev server)
chalata hai, `vite build` + static serve nahi. Chal raha hai, par:

- RAM zyada khata hai aur pehla page load slow hai
- HMR websocket browser console mein errors deta hai
- Source maps public hain

Isay theek karne ka matlab hai: Dockerfile ko multi-stage build karna, nginx
se static files serve karna, aur `/api` + `/uploads` ka proxy Vite se nikaal kar
us nginx layer (ya host nginx) mein le jaana. Agar ye kabhi karo to `deploy/`
wali nginx config bhi sath update karni hogi.

## Seed ka masla

`backend/entrypoint.sh` **har container start pe** `src/seedAll.js` chalata hai.
Seed idempotent hai (kuch delete nahi karta) lekin:

- Admin ka password wapas `ADMIN_SEED_PASSWORD` pe reset kar deta hai — matlab
  UI se badla hua password har restart pe ur jata hai
- Demo teachers, demo students, farzi fee invoices aur attendance banata hai

Live school data dalne se pehle seed ko band karna zaroori hai. Ek env flag
(jaise `SKIP_SEED=1`) laga kar `entrypoint.sh` mein guard karna sabse aasan hai.
