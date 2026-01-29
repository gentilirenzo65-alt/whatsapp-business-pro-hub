# Actualización 28/1/2026

## Token de Meta WhatsApp API
```
EAATqsRn7fEEBQjUAN6ZA41Oqna3ODpMkvezUoSd0ZB9FjojTf1CeT1odWNnC2lIz4O8EmA7jJS1ppilfyb1slZAvitsh38AU5mX0okECAYHZCcRCDn4PYkzwBTUK3vQwzoDXtVTq8VjwZAU6mToDgugmZBo2nMsLv3XMTmtc18wMZBJB0ziZByualpLIKJRT6E50UgZDZD
```

## Webhook de Meta
- **URL:** `https://bar.helensteward.shop/webhook`
- **Token de verificación:** `391556`

---

## Comandos para Reinstalar la App Completamente en VPS

### Paso 1: Conectar al servidor
```powershell
ssh debian@158.69.193.136
```

### Paso 2: Reinstalación limpia (eliminar todo Docker y volver a instalar)
```bash
cd ~
sudo docker stop $(sudo docker ps -aq) 2>/dev/null
sudo docker rm $(sudo docker ps -aq) 2>/dev/null
sudo docker system prune -af
sudo rm -rf ~/app
git clone https://github.com/gentilirenzo65-alt/whatsapp-business-pro-hub.git ~/app
cd ~/app
sudo docker compose up -d --build
```

---

## Comandos para Actualizar (sin borrar todo)
```bash
cd ~/app
sudo chown -R debian:debian .
git fetch --all
git reset --hard origin/master
sudo docker compose down
sudo docker compose up -d --build
```
