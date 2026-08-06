import os
import json
import sqlite3
import requests
from flask import Flask, render_template, request, jsonify
from datetime import datetime, timedelta
from google.oauth2 import service_account
from googleapiclient.discovery import build

app = Flask(__name__)

# --- CONFIGURACIÓN DE RUTAS DINÁMICAS ---
# Esto detecta automáticamente la carpeta: C:\Users\edgar\Desktop\BARBERIA EL CIERZO\mi_agenda_reservas
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ruta_credenciales = os.path.join(BASE_DIR, 'credenciales.json')
ruta_db = os.path.join(BASE_DIR, 'reservas.db')

token_telegram = "8592802702:AAFiF_W7YvJNl20z-5PWL0wsawNKVRvMgoI"
chat_id = "899109232"
id_calendario = "edgarfa46@gmail.com"

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
        
        evento = {
            'summary': f"{reserva['categoria'].lower()}: {reserva['nombre']}",
            'description': f"tel: {reserva['telefono']}\nservicio: {reserva['servicio']}",
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
        {'nombre': 'corte de pelo + barba'}, 
        {'nombre': 'arreglo de barba'}, 
        {'nombre': 'corte de pelo + barba + lavado y peinado'}
    ]
    dias_es = {"Mon": "lun", "Tue": "mar", "Wed": "mié", "Thu": "jue", "Fri": "vie", "Sat": "sáb", "Sun": "dom"}
    dias = []
    hoy = datetime.now()
    for i in range(7):
        dia = hoy + timedelta(days=i)
        if dia.weekday() < 6:
            nombre_dia_en = dia.strftime('%a')
            nombre_dia_es = dias_es.get(nombre_dia_en, nombre_dia_en)
            texto_dia = f"{dia.strftime('%d/%m')} ({nombre_dia_es})"
            dias.append({'valor': dia.strftime('%Y-%m-%d'), 'texto': texto_dia})
    return render_template('index.html', barberia=barberia_servicios, dias=dias)

@app.route('/obtener_estado_horas/<fecha>')
@app.route('/obtener_estado_horas', methods=['GET'])
@app.route('/obtener_estado_horas', methods=['GET'])
@app.route('/obtener_estado_horas/<fecha>', methods=['GET'])
@app.route('/obtener_estado_horas/<fecha>', methods=['GET'])
@app.route('/obtener_estado_horas/<fecha>', methods=['GET'])
@app.route('/obtener_estado_horas/<fecha>', methods=['GET'])
def obtener_estado_horas(fecha):
    if not fecha:
        return jsonify([])

    # 1. Definir horarios del local según el día de la semana
    fecha_dt = datetime.strptime(fecha, '%Y-%m-%d')
    dia_semana = fecha_dt.weekday()

    if dia_semana == 0:   # Lunes
        todas_las_horas = ['16:00', '17:00', '18:00', '19:00', '20:00']
    elif dia_semana in [1, 2, 3, 4]: # Martes a Viernes
        todas_las_horas = ['09:30', '10:30', '11:30', '12:30', '16:00', '17:00', '18:00', '19:00', '20:00']
    elif dia_semana == 5: # Sábados
        todas_las_horas = ['09:00', '10:00', '11:00', '12:00', '13:00']
    else: # Domingos (Cerrado)
        todas_las_horas = []

    # 2. Consultar citas ocupadas en Google Calendar
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
            calendarId=id_calendario,
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,
            orderBy='startTime'
        ).execute()

        eventos = events_result.get('items', [])

        horas_ocupadas = []
        for evento in eventos:
            start = evento['start'].get('dateTime', evento['start'].get('date'))
            if 'T' in start:
                hora = start.split('T')[1][:5]
                horas_ocupadas.append(hora)

        # Quedan libres las horas que NO están en Google Calendar
        horas_libres = [h for h in todas_las_horas if h not in horas_ocupadas]

        # Devolvemos la estructura de diccionario y la lista directa para compatibilidad
        return jsonify({
            'ocupadas': horas_ocupadas,
            'libres': horas_libres,
            'horas': horas_libres
        })

    except Exception as e:
        print(f"Error consultando Calendar: {e}")
        return jsonify({
            'ocupadas': [],
            'libres': todas_las_horas,
            'horas': todas_las_horas
        })
def recuperar():
    try:
        # CORRECCIÓN: Los campos del HTML empiezan por Mayúscula
        nombre_cliente = request.form.get('Nombre') 
        apellidos_cliente = request.form.get('Apellidos')
        nombre_completo = f"{nombre_cliente} {apellidos_cliente}"
        categoria = request.form.get('categoria')
        telefono = request.form.get('Telefono')
        descripcion = request.form.get('descripcion', 'sin descripción')
        
        nombre_dorado = f"<span style='color:#d4af37; font-weight:bold;'>{nombre_cliente}</span>"
        titulo_cita_dorado = f"<span style='color:#d4af37; font-weight:bold; text-transform:uppercase; font-size:1.4rem;'>¡cita confirmada!</span>"
        titulo_solicitud_dorado = f"<span style='color:#d4af37; font-weight:bold; text-transform:uppercase; font-size:1.4rem;'>¡solicitud de cita enviada!</span>"

        if categoria == 'barberia':
            servicio = request.form.get('servicio_barberia')
            fecha_raw = request.form.get('fecha_barberia')
            hora = request.form.get('hora') or "10:00"
            encabezado_tele = "💈 cita barbería"
            mensaje_web = f"{titulo_cita_dorado}<br><br>Gracias {nombre_dorado}. le esperamos en la barbería. para cualquier cambio, al whatsapp o llame al teléfono."
        else:
            servicio = "tatuaje"
            fecha_raw = request.form.get('fecha_tatuaje')
            hora = "a convenir"
            encabezado_tele = "💉 nueva solicitud tatuaje"
            mensaje_web = f"{titulo_solicitud_dorado}<br><br>¡mensaje recibido! Gracias {nombre_dorado}, en 24h tendrá respuesta. para cualquier duda contacte por whatsapp o llame al teléfono."

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
            
        requests.post(f"https://api.telegram.org/bot{token_telegram}/sendmessage", data={'chat_id': chat_id, 'text': msg_tele})
        
        if categoria == 'barberia' and "-" in datos['fecha']:
            agregar_a_calendar(datos)
            
        return jsonify({"status": "success", "message": mensaje_web})
    except Exception as e:
        print(f"error reserva: {e}")
        return jsonify({"status": "error"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
