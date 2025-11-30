import time
import os
import sys
import json
from demoparser2 import DemoParser
import pandas as pd
from colorama import init, Fore, Style
import websocket  # pip install websocket-client

init(autoreset=True)

# ============================
#   ARGUMENTOS / DEMO FILE
# ============================

if len(sys.argv) < 2:
    print("Usage: python script.py <demo_file.dem>")
    sys.exit(1)

# 👉 Usamos literalmente lo que pasás como argumento
demo_file = sys.argv[1]

print(Fore.CYAN + f"[DEMO] Archivo de demo: {demo_file}")

# ============================
#   CONSTANTES TABLA
# ============================

NAME_WIDTH = 15
HP_WIDTH = 5
ARMOR_WIDTH = 6
HELMET_WIDTH = 6
COORD_WIDTH = 8
LAST_PLACE_WIDTH = 12
BALANCE_WIDTH = 7
DEFUSER_WIDTH = 8
DEFUSING_WIDTH = 8
DUCKED_WIDTH = 6
COLOR_WIDTH = 8
ID_WIDTH = 5
ALIVE_WIDTH = 6
TICK_WIDTH = 8

columns = [
    ("Name", NAME_WIDTH),
    ("HP", HP_WIDTH),
    ("Armor", ARMOR_WIDTH),
    ("Helmet", HELMET_WIDTH),
    ("X", COORD_WIDTH),
    ("Y", COORD_WIDTH),
    ("Z", COORD_WIDTH),
    ("LastPlace", LAST_PLACE_WIDTH),
    ("Balance", BALANCE_WIDTH),
    ("Defuser", DEFUSER_WIDTH),
    ("Defusing", DEFUSING_WIDTH),
    ("Ducked", DUCKED_WIDTH),
    ("Color", COLOR_WIDTH),
    ("ID", ID_WIDTH),
    ("Alive", ALIVE_WIDTH),
]

# ============================
#   WEBSOCKET CONFIG
# ============================

WS_URL = "ws://localhost:8080"  # el server Node que ya tenés

def connect_ws():
    """Intenta conectarse al WebSocket de Node, reintenta hasta lograrlo."""
    while True:
        try:
            ws = websocket.create_connection(WS_URL)
            print(Fore.GREEN + f"[WS] Conectado a {WS_URL}")
            return ws
        except Exception as e:
            print(Fore.RED + f"[WS] Error conectando al WS ({e}), reintentando en 5s...")

# ============================
#   HELPERS
# ============================

def format_field(value, width, color=None):
    text = str(value)
    text = text + " " * (width - len(text)) if len(text) < width else text[:width]
    if color:
        return color + text + Style.RESET_ALL
    return text

def safe_int(x):
    try:
        if pd.isna(x):
            return None
        return int(x)
    except (ValueError, TypeError):
        return None

def safe_float(x):
    try:
        if pd.isna(x):
            return None
        return float(x)
    except (ValueError, TypeError):
        return None

def safe_bool(x):
    if pd.isna(x):
        return None
    return bool(x)

# ============================
#   MAIN LOOP
# ============================

ws = connect_ws()

while True:
    try:
        parser = DemoParser(demo_file)

        tick_list = parser.parse_ticks([
            "X", "Y", "Z",
            "health", "is_alive", "balance",
            "player_color", "has_defuser", "has_helmet",
            "is_defusing", "armor_value", "last_place_name",
            "entity_id", "steamid", "name",
            "team_num", "ducked",
            "is_connected"
        ])
    except Exception as e:
        print(f"Demo not ready for parsing ({e}), retrying in 5 seconds.")
        time.sleep(5)
        continue

    # Último tick
    most_recent_tick = tick_list["tick"].max()
    tick_list = tick_list[tick_list["tick"] == most_recent_tick]

    # si querés sólo conectados poné == 1
    tick_list = tick_list[tick_list["is_connected"] == 0]

    # Un registro por entity_id
    tick_list = tick_list.drop_duplicates(subset=["entity_id"])

    # Ordenar por entity_id
    tick_list = tick_list.sort_values(by="entity_id", ascending=True)

    # ============================
    #   ARMAR JSON PARA EL RADAR
    # ============================

    players_json = []

    for _, row in tick_list.iterrows():
        alive = row.get("is_alive")

        player_data = {
            "name": row.get("name", "Unknown"),
            "steamid": safe_int(row.get("steamid")),
            "entity_id": safe_int(row.get("entity_id")),
            "team_num": safe_int(row.get("team_num")),
            "is_alive": safe_int(alive),
            "health": safe_int(row.get("health")),
            "armor_value": safe_int(row.get("armor_value")),
            "has_helmet": safe_bool(row.get("has_helmet")),
            "has_defuser": safe_bool(row.get("has_defuser")),
            "is_defusing": safe_bool(row.get("is_defusing")),
            "ducked": safe_bool(row.get("ducked")),
            "balance": safe_int(row.get("balance")),
            "player_color": row.get("player_color", None),
            "last_place_name": row.get("last_place_name", None),
            "X": safe_float(row.get("X")),
            "Y": safe_float(row.get("Y")),
            "Z": safe_float(row.get("Z")),
        }

        players_json.append(player_data)

    output = {
        "demo": demo_file,
        "tick": int(most_recent_tick),
        "players": players_json,
    }

    json_str = json.dumps(output, ensure_ascii=False)

    # ============================
    #   PRINT TABLA EN CONSOLA
    # ============================

    print("\033c", end="")  # limpiar consola

    print(f"===== Wall(uigi)Hacks: {demo_file} | Tick: {most_recent_tick} =====\n")

    header = " | ".join(f"{name:<{width}}" for name, width in columns)
    print(header)
    print("-" * len(header))

    for _, row in tick_list.iterrows():
        name = row.get("name", "Unknown")
        alive = row.get("is_alive")
        team_num = row.get("team_num", 0)

        if alive:
            name_color = Fore.CYAN if team_num == 3 else Fore.RED
        else:
            name_color = Fore.LIGHTBLACK_EX
        name_colored = format_field(name, NAME_WIDTH, name_color)

        hp = row.get("health", "(n/a)")
        if alive is True:
            hp_str = format_field(hp, HP_WIDTH, Fore.GREEN)
        elif alive is False:
            hp_str = format_field(hp, HP_WIDTH, Fore.RED)
        else:
            hp_str = format_field(hp, HP_WIDTH)

        defusing = row.get("is_defusing", False)
        defusing_str = format_field(defusing, DEFUSING_WIDTH, Fore.YELLOW) if defusing else format_field(defusing, DEFUSING_WIDTH)

        row_values = [
            name_colored,
            hp_str,
            format_field(row.get("armor_value", "(n/a)"), ARMOR_WIDTH),
            format_field(row.get("has_helmet", "(n/a)"), HELMET_WIDTH),
            format_field(row.get("X", "(n/a)"), COORD_WIDTH),
            format_field(row.get("Y", "(n/a)"), COORD_WIDTH),
            format_field(row.get("Z", "(n/a)"), COORD_WIDTH),
            format_field(row.get("last_place_name", "(n/a)"), LAST_PLACE_WIDTH),
            format_field(row.get("balance", "(n/a)"), BALANCE_WIDTH),
            format_field(row.get("has_defuser", "(n/a)"), DEFUSER_WIDTH),
            defusing_str,
            format_field(row.get("ducked", False), DUCKED_WIDTH),
            format_field(row.get("player_color", "(n/a)"), COLOR_WIDTH),
            format_field(row.get("entity_id", "(n/a)"), ID_WIDTH),
            format_field(alive, ALIVE_WIDTH),
        ]

        print(" | ".join(row_values))

    print("\n[OUT] JSON enviado al WebSocket:")
    print(json_str)

    # ============================
    #   ENVIAR AL WEBSOCKET
    # ============================

    try:
        ws.send(json_str)
    except Exception as e:
        print(Fore.RED + f"[WS] Error enviando, intento reconectar... ({e})")
        try:
            ws.close()
        except Exception:
            pass
        ws = connect_ws()

    # 👉 Delay de 1 segundo entre iteraciones
