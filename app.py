import os
import json
import sqlite3
import requests
from flask import Flask, render_template, request, jsonify
from datetime import datetime, timedelta
from google.oauth2 import service_account
from googleapiclient.discovery import build
from zoneinfo import ZoneInfo

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 20 * 1024 * 1024

# --- CONFIGURACIÓN DE RUTAS DINÁMICAS ---
# Esto detecta automáticamente la carpeta local o del entorno
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ruta_credenciales = os.path.join(BASE_DIR, 'credenciales.json')
ruta_db = os.path.join(BASE_DIR, 'reservas.db')

pin_seguridad = os.environ.get("PIN_SEGURIDAD") or "030299"  # PIN de seguridad
token_telegram = os.environ.get("TELEGRAM_TOKEN") or "8592802702:AAFiF_W7YvJNl20z-5PWL0wsawNKVRvMgoI"
chat_id = os.environ.get("TELEGRAM_CHAT_ID") or "899109232"
id_calendario = "edgarfa46@gmail.com"

EXT_IMAGEN = {'jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'}

def agregar_a_calendar(reserva):
    try:
        scopes = ['https://www.googleapis.com/auth/calendar']
        creds_json = os.environ.get('google_credentials')

        if creds_json:
            creds_dict = json.loads(creds_json)
            creds = service_account.Credentials.from_service_account_info(creds_dict, scopes=scopes)
        else:
            creds = service_account.Credentials.from_service_account_file(ruta_credenciales, scopes=scopes)
        service = build('calendar', 'v3', credentials=creds)
        
        inicio = f"{reserva['fecha']}T{reserva['hora']}:00"
        fin_dt = datetime.strptime(inicio, "%Y-%m-%dT%H:%M:%S") + timedelta(minutes=30) 
        
        # Se añade la ubicación exacta en Paseo del Prado, 30, Talayuelas, Cuenca
        evento = {
            'summary': f"{reserva['categoria'].lower()}: {reserva['nombre']}",
            'description': f"tel: {reserva['telefono']}\nservicio: {reserva['servicio']}",
            'location': 'Paseo del Prado, 30, 16320 Talayuelas, Cuenca',
            'start': {'dateTime': inicio, 'timeZone': 'Europe/Madrid'},
            'end': {'dateTime': fin_dt.isoformat(), 'timeZone': 'Europe/Madrid'},
        }
        service.events().insert(calendarId=id_calendario, body=evento).execute()
        print("✅ Evento añadido a Google Calendar")
        return True
    except Exception as e:
        print(f"❌ Error en calendar: {e}")
        return False

def init_db():
    conn = sqlite3.connect(ruta_db)
    cursor = conn.cursor()
    cursor.execute('''create table if not exists citas 
                   (id integer primary key, nombre text, telefono text, 
                   categoria text, servicio text, fecha text, hora text)''')
    conn.commit()
    conn.close()

init_db()

@app.route('/')
def index():
    barberia_servicios = [
        {'nombre': 'corte de pelo'}, 
        {'nombre': 'corte de pelo + barba maquina'},
        {'nombre': 'corte de pelo + barba navaja'},
        {'nombre': 'arreglo de barba maquina'},
        {'nombre': 'arreglo de barba navaja'},
        {'nombre': 'corte de pelo + barba maquina + peinado'},
        {'nombre': 'corte de pelo + barba navaja + peinado'}
    ]
    
    dias_es = {"Mon": "lun", "Tue": "mar", "Wed": "mié", "Thu": "jue", "Fri": "vie", "Sat": "sáb", "Sun": "dom"}
    dias = []
    
    zona_madrid = ZoneInfo("Europe/Madrid")
    hoy = datetime.now(zona_madrid)
    
    for i in range(7):
        dia = hoy + timedelta(days=i)
        if dia.weekday() < 6:
            nombre_dia_en = dia.strftime('%a')
            nombre_dia_es = dias_es.get(nombre_dia_en, nombre_dia_en)
            texto_dia = f"{dia.strftime('%d/%m')} ({nombre_dia_es})"
            dias.append({'valor': dia.strftime('%Y-%m-%d'), 'texto': texto_dia})
            
    return render_template('index.html', barberia=barberia_servicios, dias=dias)

@app.route('/obtener_estado_horas/<fecha>')
def obtener_estado_horas(fecha):
    try:
        dia_semana = datetime.strptime(fecha, '%Y-%m-%d').weekday()
    except ValueError:
        return jsonify([])
    
    if dia_semana in [0, 1, 2, 3, 4, 5]:
        horas_posibles = ["11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30"]
    else:
        return jsonify([])

    try:
        scopes = ['https://www.googleapis.com/auth/calendar.readonly']
        creds_json = os.environ.get('google_credentials')
        if creds_json:
            creds = service_account.Credentials.from_service_account_info(json.loads(creds_json), scopes=scopes)
        else:
            creds = service_account.Credentials.from_service_account_file(ruta_credenciales, scopes=scopes)
        
        service = build('calendar', 'v3', credentials=creds)
        
        time_min = f"{fecha}T00:00:00Z"
        time_max = f"{fecha}T23:59:59Z"
        events_result = service.events().list(calendarId=id_calendario, timeMin=time_min, timeMax=time_max, singleEvents=True, timeZone='Europe/Madrid').execute()
        
        ocupadas = []
        for e in events_result.get('items', []):
            start_str = e['start'].get('dateTime', e['start'].get('date'))
            end_str = e['end'].get('dateTime', e['end'].get('date'))
            
            if 'T' in start_str and 'T' in end_str:
                start_time = datetime.strptime(start_str.split('T')[1][:5], '%H:%M')
                end_time = datetime.strptime(end_str.split('T')[1][:5], '%H:%M')
                
                for h in horas_posibles:
                    hora_check = datetime.strptime(h, '%H:%M')
                    if start_time <= hora_check < end_time:
                        ocupadas.append(h)
                        
    except Exception as e:
        print(f"Error consultando Calendar: {e}")
        ocupadas = []

    return jsonify([{"hora": h, "libre": h not in ocupadas} for h in horas_posibles])

@app.route('/reservar', methods=['POST'])
def recuperar():
    try:
        nombre_cliente = request.form.get('Nombre') or 'Cliente'
        apellidos_cliente = request.form.get('Apellidos') or ''
        nombre_completo = f"{nombre_cliente} {apellidos_cliente}".strip()
        categoria = request.form.get('categoria')
        telefono = request.form.get('Telefono', 'No indicado')
        descripcion = request.form.get('descripcion', 'sin descripción')
        
        # --- GESTIÓN DE SUBIDA DE IMAGEN DE REFERENCIA ---
        imagen_url = ""
        if 'imagen_referencia' in request.files:
            file = request.files['imagen_referencia']
            if file and file.filename != '':
                # Limpiamos el nombre y creamos uno único con fecha y hora para que no se repita
                ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'jpg'
                if ext not in EXT_IMAGEN:
                    return jsonify({"status": "error", "message": "La referencia debe ser una imagen (jpg, png, webp, heic o gif)."}), 400
                unique_filename = f"tattoo_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{ext}"
                
                upload_folder = os.path.join(BASE_DIR, 'static', 'uploads')
                os.makedirs(upload_folder, exist_ok=True)
                
                file.save(os.path.join(upload_folder, unique_filename))
                # Generamos la URL absoluta del archivo en tu servidor
                imagen_url = f"{request.host_url}static/uploads/{unique_filename}"

        nombre_dorado = f"<span style='color:#d4af37; font-weight:bold;'>{nombre_cliente}</span>"
        titulo_cita_dorado = f"<span style='color:#d4af37; font-weight:bold; text-transform:uppercase; font-size:1.4rem;'>¡cita confirmada!</span>"
        titulo_solicitud_dorado = f"<span style='color:#d4af37; font-weight:bold; text-transform:uppercase; font-size:1.4rem;'>¡solicitud de cita enviada!</span>"

        if categoria == 'barberia':
            servicio = request.form.get('servicio_barberia') or 'Corte de pelo'
            fecha_raw = request.form.get('fecha_barberia')
            hora = request.form.get('hora') or "10:00"
            encabezado_tele = "💈 cita barbería"
            mensaje_web = f"{titulo_cita_dorado}<br><br>Gracias {nombre_dorado}. Le esperamos en la barbería. Para cualquier cambio, al WhatsApp o llame al teléfono."
        else:
            servicio = "tatuaje"
            fecha_raw = request.form.get('fecha_tatuaje') or datetime.now().strftime('%Y-%m-%d')
            hora = "a convenir"
            encabezado_tele = "💉 nueva solicitud tatuaje"
            mensaje_web = f"{titulo_solicitud_dorado}<br><br>¡Mensaje recibido! Gracias {nombre_dorado}, en 24h tendrá respuesta. Para cualquier duda contacte por WhatsApp o llame al teléfono."
            
        fecha_mostrar = fecha_raw
        try:
            if "-" in fecha_raw and len(fecha_raw) == 10:
                fecha_dt = datetime.strptime(fecha_raw, "%Y-%m-%d")
                fecha_mostrar = fecha_dt.strftime("%d/%m/%Y")
        except:
            pass

        datos = {'nombre': nombre_completo, 'telefono': telefono, 'categoria': categoria, 'servicio': servicio, 'fecha': fecha_raw, 'hora': hora}
        
        conn = sqlite3.connect(ruta_db)
        cursor = conn.cursor()
        cursor.execute("insert into citas (nombre, telefono, categoria, servicio, fecha, hora) values (?,?,?,?,?,?)", 
                       (datos['nombre'], datos['telefono'], datos['categoria'], datos['servicio'], datos['fecha'], datos['hora']))
        conn.commit()
        conn.close()
        
        msg_tele = f"{encabezado_tele}:\n👤 {datos['nombre']}\n📞 {datos['telefono']}\n📅 {fecha_mostrar}\n⏰ {datos['hora']}\n✂️ {datos['servicio']}"
        if categoria == 'tatuaje':
            msg_tele += f"\n📝 idea: {descripcion}"
            if imagen_url:
                msg_tele += f"\n🖼️ Referencia: {imagen_url}"
            
        try:
            requests.post(f"https://api.telegram.org/bot{token_telegram}/sendmessage", data={'chat_id': chat_id, 'text': msg_tele}, timeout=10)
        except Exception as telegram_err:
            print(f"Error enviando Telegram: {telegram_err}")
        
        if categoria == 'barberia' and "-" in str(datos['fecha']) and ":" in str(datos['hora']):
            agregar_a_calendar(datos)
            
        return jsonify({"status": "success", "message": mensaje_web, "imagen_url": imagen_url})
    except Exception as e:
        print(f"error reserva: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/cancelar', methods=['POST'])
def cancelar_cita():
    try:
        datos = request.get_json()
        fecha = datos.get('fecha')
        hora = datos.get('hora')
        pin_ingresado = datos.get('pin')

        if pin_ingresado != pin_seguridad:
            return jsonify({'status': 'error', 'message': 'PIN incorrecto'}), 400

        conn = sqlite3.connect(ruta_db)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM citas WHERE fecha = ? AND hora = ?", (fecha, hora))
        conn.commit()
        conn.close()

        try:
            scopes = ['https://www.googleapis.com/auth/calendar']
            creds_json = os.environ.get('google_credentials')
            if creds_json:
                creds_dict = json.loads(creds_json)
                creds = service_account.Credentials.from_service_account_info(creds_dict, scopes=scopes)
            else:
                creds = service_account.Credentials.from_service_account_file(ruta_credenciales, scopes=scopes)
            
            service = build('calendar', 'v3', credentials=creds)
            time_min = f"{fecha}T00:00:00Z"
            time_max = f"{fecha}T23:59:59Z"
            
            events_result = service.events().list(
                calendarId=id_calendario, timeMin=time_min, timeMax=time_max, singleEvents=True, timeZone='Europe/Madrid'
            ).execute()
            
            for evento in events_result.get('items', []):
                start = evento['start'].get('dateTime', evento['start'].get('date'))
                if 'T' in start and start.split('T')[1][:5] == hora:
                    service.events().delete(calendarId=id_calendario, eventId=evento['id']).execute()
                    break
        except Exception as e:
            print(f"Error borrando de Calendar: {e}")

        msg_cancelacion = f"❌ CITA CANCELADA:\n📅 Fecha: {fecha}\n⏰ Hora: {hora}"
        requests.post(f"https://api.telegram.org/bot{token_telegram}/sendmessage", data={'chat_id': chat_id, 'text': msg_cancelacion}, timeout=10)

        return jsonify({'status': 'success', 'message': 'Cita eliminada correctamente'})

    except Exception as e:
        return jsonify({'status': 'error', 'message': 'Error al procesar cancelación'}), 500

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import request, jsonify

@app.route('/api/notificar-record', methods=['POST'])
def notificar_record():
    datos = request.json
    nombre = datos.get('name', 'Anónimo')
    puntuacion = datos.get('score', 0)

    remitente = "edgarfa46@gmail.com"
    password = os.environ.get("GMAIL_APP_PASSWORD") or "dwafiymjdgglumsz"
    destinatario = "edgarfa46@gmail.com"

    asunto = f"🎮 ¡Nuevo Récord en El Cierzo! {nombre} - {puntuacion} pts"
    cuerpo = f"Hola Edgar,\n\nAlguien acaba de jugar y ha registrado un nuevo récord:\n- Jugador: {nombre}\n- Puntuación: {puntuacion} puntos"

    mensaje = MIMEMultipart()
    mensaje["From"] = remitente
    mensaje["To"] = destinatario
    mensaje["Subject"] = asunto
    mensaje.attach(MIMEText(cuerpo, "plain"))

    try:
        servidor = smtplib.SMTP("smtp.gmail.com", 587)
        servidor.starttls()
        servidor.login(remitente, password)
        servidor.sendmail(remitente, destinatario, mensaje.as_string())
        servidor.quit()
    except Exception as e:
        print(f"Error: {e}")

    return jsonify({"status": "ok"})

from flask import send_from_directory, make_response

@app.route('/manifest.json')
def manifest():
    r = make_response(send_from_directory(app.static_folder, 'manifest.json'))
    r.headers['Content-Type'] = 'application/manifest+json'
    r.headers['Cache-Control'] = 'no-cache'
    return r

@app.route('/sw.js')
def service_worker():
    # Debe servirse desde la raíz para tener scope "/"
    r = make_response(send_from_directory(app.static_folder, 'sw.js'))
    r.headers['Content-Type'] = 'application/javascript'
    r.headers['Service-Worker-Allowed'] = '/'
    r.headers['Cache-Control'] = 'no-cache'
    return r

# --- TATTOOPRO SKETCH (acceso oculto desde index.html) ---
import hmac
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

_tps_ser = URLSafeTimedSerializer(os.environ.get('SECRET_KEY') or (pin_seguridad + token_telegram), salt='tattoopro')
TATTOOPRO_CLAVE = os.environ.get('TATTOOPRO_CLAVE', 'elcierzo26')
_tps_fallos = {}

@app.route('/api/tattoopro/acceso', methods=['POST'])
def tattoopro_acceso():
    ip = request.headers.get('X-Forwarded-For', request.remote_addr or '').split(',')[0].strip()
    ahora = time.time()
    intentos = [t for t in _tps_fallos.get(ip, []) if ahora - t < 300]
    if len(intentos) >= 8:
        return jsonify({'ok': False}), 429
    clave = str((request.get_json(silent=True) or {}).get('clave', '')).strip()
    if hmac.compare_digest(clave.encode('utf-8'), TATTOOPRO_CLAVE.encode('utf-8')):
        _tps_fallos.pop(ip, None)
        return jsonify({'ok': True, 'url': '/tattoopro?t=' + _tps_ser.dumps('ok')})
    intentos.append(ahora)
    _tps_fallos[ip] = intentos
    return jsonify({'ok': False})

@app.route('/tattoopro')
@app.route('/tattoopro/')
def tattoopro():
    try:
        _tps_ser.loads(request.args.get('t', ''), max_age=60 * 60 * 12)
    except (BadSignature, SignatureExpired):
        return ('', 404)
    carpeta = os.path.join(app.static_folder, 'tattoopro')
    if not os.path.isfile(os.path.join(carpeta, 'tattoopro.html')):
        carpeta = app.static_folder
    r = make_response(send_from_directory(carpeta, 'tattoopro.html'))
    r.headers['Cache-Control'] = 'no-store'
    r.headers['X-Frame-Options'] = 'SAMEORIGIN'
    return r

# --- TATTOOPRO SKETCH · VERSIÓN MÓVIL (gota roja grana: 5 toques + clave) ---
TATTOOPRO_MOVIL_CLAVE = os.environ.get('TATTOOPRO_MOVIL_CLAVE', 'elcierzo26')

@app.route('/api/tattoopro-movil/acceso', methods=['POST'])
def tattoopro_movil_acceso():
    ip = request.headers.get('X-Forwarded-For', request.remote_addr or '').split(',')[0].strip()
    ahora = time.time()
    intentos = [t for t in _tps_fallos.get(ip, []) if ahora - t < 300]
    if len(intentos) >= 8:
        return jsonify({'ok': False}), 429
    clave = str((request.get_json(silent=True) or {}).get('clave', '')).strip()
    if hmac.compare_digest(clave.encode('utf-8'), TATTOOPRO_MOVIL_CLAVE.encode('utf-8')):
        _tps_fallos.pop(ip, None)
        return jsonify({'ok': True, 'url': '/tattoopro-movil?t=' + _tps_ser.dumps('movil')})
    intentos.append(ahora)
    _tps_fallos[ip] = intentos
    return jsonify({'ok': False})

@app.route('/tattoopro-movil')
@app.route('/tattoopro-movil/')
def tattoopro_movil():
    try:
        if _tps_ser.loads(request.args.get('t', ''), max_age=60 * 60 * 12) != 'movil':
            return ('', 404)
    except (BadSignature, SignatureExpired):
        return ('', 404)
    carpeta = os.path.join(app.static_folder, 'tattoopro')
    if not os.path.isfile(os.path.join(carpeta, 'tattoopro-movil.html')):
        carpeta = app.static_folder
    r = make_response(send_from_directory(carpeta, 'tattoopro-movil.html'))
    r.headers['Cache-Control'] = 'no-store'
    r.headers['X-Frame-Options'] = 'SAMEORIGIN'
    return r

# --- SECRET GAMES: USUARIOS (apodo + PIN) Y PARTIDAS GUARDADAS ---
# Dónde se guardan:
#   * Si existe la variable de entorno DATABASE_URL (PostgreSQL, p. ej. Neon gratis),
#     todo se guarda ahí y NO se borra aunque el hosting se reinicie o se vuelva a desplegar.
#   * Si no existe, se usa reservas.db (SQLite local). Ojo: en hostings que se
#     redespliegan desde GitHub ese archivo se borra en cada actualización.
import re
import time
import unicodedata
from werkzeug.security import generate_password_hash, check_password_hash

DATABASE_URL = (os.environ.get('DATABASE_URL') or '').strip()
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = 'postgresql://' + DATABASE_URL[len('postgres://'):]
USA_POSTGRES = DATABASE_URL.startswith('postgresql://')
if USA_POSTGRES:
    import psycopg2  # requiere "psycopg2-binary" en requirements.txt
    ErrorDuplicado = psycopg2.IntegrityError
else:
    ErrorDuplicado = sqlite3.IntegrityError

LIMITE_PARTIDA = {'marcianitos': 256 * 1024, 'pokemon': 16 * 1024 * 1024, 'rojito': 16 * 1024 * 1024, 'crash': 16 * 1024 * 1024}

def _db():
    if USA_POSTGRES:
        return psycopg2.connect(DATABASE_URL, connect_timeout=10)
    return sqlite3.connect(ruta_db)

def _sql(consulta):
    """Las consultas se escriben con '?'; PostgreSQL usa '%s'."""
    return consulta.replace('?', '%s') if USA_POSTGRES else consulta

def _ejecutar(consulta, parametros=(), una=False, todas=False):
    conn = _db()
    try:
        cur = conn.cursor()
        cur.execute(_sql(consulta), parametros)
        res = cur.fetchone() if una else (cur.fetchall() if todas else None)
        conn.commit()
        return res
    finally:
        conn.close()

def init_secret_games():
    tipo_binario = 'bytea' if USA_POSTGRES else 'blob'
    _ejecutar("create table if not exists jugadores "
              "(slug text primary key, apodo text, pin_hash text, creado text)")
    _ejecutar("create table if not exists partidas "
              f"(slug text not null, juego text not null, datos {tipo_binario} not null, "
              "guardado bigint not null, primary key (slug, juego))")
    _ejecutar("create table if not exists actividad "
              "(slug text not null, juego text not null, segundos bigint not null default 0, "
              "sesiones integer not null default 0, ultima bigint not null default 0, primary key (slug, juego))")
    _ejecutar("create table if not exists ranking_marcianitos "
              "(slug text primary key, apodo text, puntos bigint not null, fecha bigint not null)")
    print(f"🎮 Secret Games: guardando en {'PostgreSQL (permanente)' if USA_POSTGRES else 'SQLite local (se borra al redesplegar)'}")

try:
    init_secret_games()
except Exception as e:
    print(f"❌ Error iniciando la base de datos de Secret Games: {e}")

def _slug_apodo(apodo):
    n = unicodedata.normalize('NFKD', (apodo or '').strip().lower()).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9_-]+', '_', n).strip('_')[:24]

MAX_FALLOS_PIN = 5
BLOQUEO_PIN_SEG = 5 * 60
_fallos_pin = {}  # slug -> [fallos, bloqueado_hasta]

def _jugador(slug):
    return _ejecutar("select apodo, pin_hash from jugadores where slug = ?", (slug,), una=True)

def _comprobar_pin(slug, pin):
    """Verifica el PIN de un apodo YA registrado. Devuelve (ok, codigo_http, mensaje)."""
    if not re.fullmatch(r'\d{4}', pin or ''):
        return False, 400, 'El PIN debe tener exactamente 4 cifras.'
    fallos, hasta = _fallos_pin.get(slug, [0, 0])
    if hasta > time.time():
        minutos = int((hasta - time.time()) // 60) + 1
        return False, 429, f'Demasiados intentos fallidos. Espera {minutos} min.'
    fila = _jugador(slug)
    if not fila:
        return False, 404, 'Ese apodo no existe todavía. ¿Quieres crearlo como nuevo usuario?'
    if check_password_hash(fila[1], pin):
        _fallos_pin.pop(slug, None)
        return True, 200, 'ok'
    fallos += 1
    if fallos >= MAX_FALLOS_PIN:
        _fallos_pin[slug] = [0, time.time() + BLOQUEO_PIN_SEG]
        return False, 429, 'Demasiados intentos fallidos. Espera 5 min.'
    _fallos_pin[slug] = [fallos, 0]
    return False, 401, f'PIN incorrecto. Te quedan {MAX_FALLOS_PIN - fallos} intentos.'

def _leer_credenciales():
    datos = request.get_json(silent=True) or {}
    apodo = re.sub(r'\s+', ' ', (datos.get('apodo') or '').strip())[:32]
    return apodo, _slug_apodo(apodo), str(datos.get('pin') or '').strip()

def _error_servidor(e):
    print(f"❌ Error de base de datos (Secret Games): {e}")
    return jsonify({'status': 'error', 'message': 'Error del servidor guardando los datos. Inténtalo de nuevo.'}), 500

@app.route('/api/registro', methods=['POST'])
def registro_jugador():
    """Nuevo usuario: crea el apodo con su PIN. Falla si el apodo ya existe."""
    apodo, slug, pin = _leer_credenciales()
    if len(slug) < 2:
        return jsonify({'status': 'error', 'message': 'El apodo necesita al menos 2 letras o números.'}), 400
    if not re.fullmatch(r'\d{4}', pin):
        return jsonify({'status': 'error', 'message': 'El PIN debe tener exactamente 4 cifras.'}), 400
    try:
        _ejecutar("insert into jugadores (slug, apodo, pin_hash, creado) values (?,?,?,?)",
                  (slug, apodo, generate_password_hash(pin), datetime.now().isoformat(timespec='seconds')))
    except ErrorDuplicado:
        return jsonify({'status': 'error', 'message': 'Ese apodo ya está registrado. Elige otro o entra como usuario existente.'}), 409
    except Exception as e:
        return _error_servidor(e)
    return jsonify({'status': 'creado', 'apodo': apodo})

@app.route('/api/login', methods=['POST'])
def login_jugador():
    """Usuario existente: comprueba apodo + PIN."""
    apodo, slug, pin = _leer_credenciales()
    if len(slug) < 2:
        return jsonify({'status': 'error', 'message': 'Escribe tu apodo.'}), 400
    try:
        ok, codigo, msg = _comprobar_pin(slug, pin)
        if not ok:
            return jsonify({'status': 'error', 'message': msg}), codigo
        return jsonify({'status': 'ok', 'apodo': _jugador(slug)[0] or apodo})
    except Exception as e:
        return _error_servidor(e)

def _validar(juego, apodo):
    """Comprueba juego, apodo y el PIN de la cabecera X-Pin. Devuelve (slug, respuesta_error)."""
    slug = _slug_apodo(apodo)
    if juego not in LIMITE_PARTIDA or len(slug) < 2:
        return slug, (jsonify({'status': 'error', 'message': 'Datos no válidos'}), 400)
    ok, codigo, msg = _comprobar_pin(slug, request.headers.get('X-Pin', ''))
    if not ok:
        return slug, (jsonify({'status': 'error', 'message': msg}), codigo)
    return slug, None

@app.route('/api/partida/<juego>/<apodo>', methods=['GET'])
def cargar_partida(juego, apodo):
    try:
        slug, error = _validar(juego, apodo)
        if error:
            return error
        fila = _ejecutar("select datos, guardado from partidas where slug = ? and juego = ?", (slug, juego), una=True)
    except Exception as e:
        return _error_servidor(e)
    if not fila:
        return jsonify({'status': 'vacio'}), 404
    r = make_response(bytes(fila[0]))
    r.headers['Content-Type'] = 'application/octet-stream'
    r.headers['Cache-Control'] = 'no-store'
    r.headers['X-Guardado'] = str(fila[1])
    return r

@app.route('/api/partida/<juego>/<apodo>', methods=['POST'])
def guardar_partida(juego, apodo):
    try:
        slug, error = _validar(juego, apodo)
        if error:
            return error
        limite = LIMITE_PARTIDA[juego]
        if request.content_length and request.content_length > limite:
            return jsonify({'status': 'error', 'message': 'Partida demasiado grande'}), 413
        datos = request.get_data(cache=False)
        if not datos or len(datos) > limite:
            return jsonify({'status': 'error', 'message': 'Partida vacía o demasiado grande'}), 400
        ahora = int(time.time() * 1000)
        binario = psycopg2.Binary(datos) if USA_POSTGRES else sqlite3.Binary(datos)
        _ejecutar("insert into partidas (slug, juego, datos, guardado) values (?,?,?,?) "
                  "on conflict (slug, juego) do update set datos = excluded.datos, guardado = excluded.guardado",
                  (slug, juego, binario, ahora))
    except Exception as e:
        return _error_servidor(e)
    return jsonify({'status': 'success', 'guardado': ahora})

@app.route('/api/partidas/<apodo>')
def info_partidas(apodo):
    try:
        slug, error = _validar('marcianitos', apodo)
        if error:
            return error
        filas = _ejecutar("select juego, guardado from partidas where slug = ?", (slug,), todas=True) or []
    except Exception as e:
        return _error_servidor(e)
    guardadas = {j: g for j, g in filas}
    r = jsonify({j: ({'guardado': guardadas[j]} if j in guardadas else None) for j in LIMITE_PARTIDA})
    r.headers['Cache-Control'] = 'no-store'
    return r


# --- ACTIVIDAD: tiempo jugado por usuario y juego ---
@app.route('/api/actividad/<juego>/<apodo>', methods=['POST'])
def registrar_actividad(juego, apodo):
    try:
        slug, error = _validar(juego, apodo)
        if error:
            return error
        datos = request.get_json(silent=True) or {}
        segundos = max(0, min(int(datos.get('segundos') or 0), 600))   # como mucho 10 min por aviso
        sesion = 1 if datos.get('nueva_sesion') else 0
        if not segundos and not sesion:
            return jsonify({'status': 'ok'})
        _ejecutar("insert into actividad (slug, juego, segundos, sesiones, ultima) values (?,?,?,?,?) "
                  "on conflict (slug, juego) do update set segundos = actividad.segundos + excluded.segundos, "
                  "sesiones = actividad.sesiones + excluded.sesiones, ultima = excluded.ultima",
                  (slug, juego, segundos, sesion, int(time.time() * 1000)))
    except Exception as e:
        return _error_servidor(e)
    return jsonify({'status': 'ok'})

# --- RANKING MUNDIAL DE MARCIANITOS (mejor puntuación de cada jugador) ---
def _top_marcianitos(limite=5):
    filas = _ejecutar("select apodo, puntos, fecha, slug from ranking_marcianitos order by puntos desc, fecha asc limit ?",
                      (limite,), todas=True) or []
    return [{'apodo': f[0], 'puntos': int(f[1]), 'fecha': int(f[2]), 'slug': f[3]} for f in filas]

@app.route('/api/ranking/marcianitos')
def ver_ranking():
    try:
        r = jsonify({'top': [{k: v for k, v in f.items() if k != 'slug'} for f in _top_marcianitos()]})
    except Exception as e:
        return _error_servidor(e)
    r.headers['Cache-Control'] = 'no-store'
    return r

@app.route('/api/ranking/marcianitos/<apodo>', methods=['POST'])
def enviar_puntuacion(apodo):
    try:
        slug, error = _validar('marcianitos', apodo)
        if error:
            return error
        puntos = int((request.get_json(silent=True) or {}).get('puntos') or 0)
        if puntos < 0 or puntos > 50_000_000:
            return jsonify({'status': 'error', 'message': 'Puntuación no válida'}), 400
        fila = _jugador(slug)
        nombre = (fila[0] if fila else apodo)[:32]
        if puntos > 0:
            _ejecutar("insert into ranking_marcianitos (slug, apodo, puntos, fecha) values (?,?,?,?) "
                      "on conflict (slug) do update set puntos = excluded.puntos, fecha = excluded.fecha, apodo = excluded.apodo "
                      "where excluded.puntos > ranking_marcianitos.puntos",
                      (slug, nombre, puntos, int(time.time() * 1000)))
        top = _top_marcianitos()
        posicion = next((i + 1 for i, f in enumerate(top) if f['slug'] == slug and f['puntos'] == puntos and puntos > 0), None)
    except Exception as e:
        return _error_servidor(e)
    return jsonify({'status': 'ok', 'posicion': posicion,
                    'top': [{k: v for k, v in f.items() if k != 'slug'} for f in top]})

# --- PANEL SECRETO DE ADMINISTRACIÓN ---
# El PIN se lee de la variable de entorno ADMIN_PIN (recomendado ponerla en Render).
ADMIN_PIN = (os.environ.get('ADMIN_PIN') or '3698').strip()
_fallos_admin = [0, 0]  # [fallos, bloqueado_hasta]

def _admin_autorizado():
    import hmac
    fallos, hasta = _fallos_admin
    if hasta > time.time():
        return jsonify({'status': 'error', 'message': 'Demasiados intentos. Espera unos minutos.'}), 429
    pin = str((request.get_json(silent=True) or {}).get('pin') or '')
    if hmac.compare_digest(pin, ADMIN_PIN):
        _fallos_admin[0], _fallos_admin[1] = 0, 0
        return None
    _fallos_admin[0] = fallos + 1
    if _fallos_admin[0] >= 5:
        _fallos_admin[0], _fallos_admin[1] = 0, time.time() + 15 * 60
    return jsonify({'status': 'error', 'message': 'Contraseña incorrecta'}), 401

@app.route('/api/admin/resumen', methods=['POST'])
def admin_resumen():
    error = _admin_autorizado()
    if error:
        return error
    try:
        jugadores = {}
        for slug, apodo, creado in _ejecutar("select slug, apodo, creado from jugadores", todas=True) or []:
            jugadores[slug] = {'apodo': apodo or slug, 'creado': creado, 'juegos': {}, 'ultima': 0, 'segundos': 0}
        for slug, juego, segundos, sesiones, ultima in _ejecutar(
                "select slug, juego, segundos, sesiones, ultima from actividad", todas=True) or []:
            j = jugadores.setdefault(slug, {'apodo': slug, 'creado': None, 'juegos': {}, 'ultima': 0, 'segundos': 0})
            j['juegos'][juego] = {'segundos': int(segundos), 'sesiones': int(sesiones), 'ultima': int(ultima)}
            j['ultima'] = max(j['ultima'], int(ultima))
            j['segundos'] += int(segundos)
        lista = sorted(jugadores.items(), key=lambda kv: (kv[1]['ultima'], kv[1]['creado'] or ''), reverse=True)
        r = jsonify({'status': 'ok',
                     'jugadores': [dict(v, slug=k) for k, v in lista],
                     'ranking': _top_marcianitos(20)})
    except Exception as e:
        return _error_servidor(e)
    r.headers['Cache-Control'] = 'no-store'
    return r

@app.route('/api/admin/ranking/borrar', methods=['POST'])
def admin_borrar_ranking():
    error = _admin_autorizado()
    if error:
        return error
    slug = _slug_apodo((request.get_json(silent=True) or {}).get('slug') or '')
    try:
        _ejecutar("delete from ranking_marcianitos where slug = ?", (slug,))
        return jsonify({'status': 'ok', 'ranking': _top_marcianitos(20)})
    except Exception as e:
        return _error_servidor(e)

@app.route('/api/estado-juegos')
def estado_juegos():
    """Para comprobar desde el navegador dónde se están guardando los usuarios."""
    try:
        total = _ejecutar("select count(*) from jugadores", una=True)[0]
        conexion = 'ok'
    except Exception as e:
        total, conexion = None, f'error: {e.__class__.__name__}'
    return jsonify({
        'almacen': 'postgresql (permanente)' if USA_POSTGRES else 'sqlite local (se borra al redesplegar)',
        'conexion': conexion,
        'usuarios_registrados': total,
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=os.environ.get('FLASK_DEBUG') == '1')
