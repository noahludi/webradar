import time
import os
import sys
import json
from demoparser2 import DemoParser
import pandas as pd
from colorama import init, Fore, Style
import websocket  # 👈 cliente WebSocket

init(autoreset=True)

if len(sys.argv) < 2:
    print("Usage: python script.py <demo_number>")
    sys.exit(1)

demo_number = sys.argv[1]
demo_file = f"walluigi{demo_number}.dem"

# URL del WebSocket en tu backend Node
WS_URL = "ws://localhost:8080"  # cambialo si usás otro puerto/host


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


def connect_ws():
    """Intenta conectarse al WebSocket de Node, reintenta hasta lograrlo."""
    while True:
        try:
            ws = websocket.create_connection(WS_URL)
            print(Fore.GREEN + f"[WS] Conectado a {WS_URL}")
            return ws
        except Exception as e:
            print(Fore.RED + f"[WS] Error conectando al WS ({e}), reintentando en 5s...")
            time.sleep(5)


# Primero nos conectamos al WS
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

    most_recent_tick = tick_list["tick"].max()
    tick_list = tick_list[tick_list["tick"] == most_recent_tick]

    # si querés sólo conectados poné == 1
    tick_list = tick_list[tick_list["is_connected"] == 0]

    tick_list = tick_list.drop_duplicates(subset=["entity_id"])
    tick_list = tick_list.sort_values(by="entity_id", ascending=True)

    players_json = []

    for _, row in tick_list.iterrows():
        player_data = {
            "name": row.get("name", "Unknown"),
            "steamid": safe_int(row.get("steamid")),
            "entity_id": safe_int(row.get("entity_id")),
            "team_num": safe_int(row.get("team_num")),
            "is_alive": safe_int(row.get("is_alive")),
            "health": safe_int(row.get("health")),
            "armor_value": safe_int(row.get("armor_value")),
            "has_helmet": bool(row["has_helmet"]) if not pd.isna(row.get("has_helmet")) else None,
            "has_defuser": bool(row["has_defuser"]) if not pd.isna(row.get("has_defuser")) else None,
            "is_defusing": bool(row["is_defusing"]) if not pd.isna(row.get("is_defusing")) else None,
            "ducked": bool(row["ducked"]) if not pd.isna(row.get("ducked")) else None,
            "balance": safe_int(row.get("balance")),
            "player_color": row.get("player_color", None),  # string tal cual
            "last_place_name": row.get("last_place_name", None),
            "X": safe_float(row.get("X")),
            "Y": safe_float(row.get("Y")),
            "Z": safe_float(row.get("Z")),
        }
        players_json.append(player_data)

    output = {
        "demo": demo_file,
        "tick": int(most_recent_tick),
        "players": players_json
    }

    json_str = json.dumps(output, ensure_ascii=False)

    os.system('cls' if os.name == 'nt' else 'clear')
    print(json_str)

    # 👉 Enviamos al WebSocket
    try:
        ws.send(json_str)
    except Exception as e:
        print(Fore.RED + f"[WS] Error enviando, intento reconectar... ({e})")
        try:
            ws.close()
        except Exception:
            pass
        ws = connect_ws()

    # Opcional: pequeño sleep para no matar a Node a mensajes
    time.sleep(0.05)
