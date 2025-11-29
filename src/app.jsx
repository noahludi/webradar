import ReactDOM from "react-dom/client";
import { useEffect, useState } from "react";
import "./app.css";
import PlayerCard from "./components/playercard";
import Radar from "./components/radar";
import { getLatency, Latency } from "./components/latency";
import MaskedIcon from "./components/maskedicon";

const CONNECTION_TIMEOUT = 5000;
const WS_PORT = 8080;
const DEFAULT_MAP_NAME = "de_mirage";
const DEFAULT_MODEL = "tm_jumpsuit";

const PLAYER_COLOR_TO_INDEX = {
  blue: 0,
  green: 1,
  yellow: 2,
  orange: 3,
  purple: 4,
  white: 5,
};

const buildWsUrl = () => {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.hostname || "localhost"; // ej: 192.168.2.100 en tu celu
  return `${protocol}://${host}:${WS_PORT}`;
};

const DEFAULT_SETTINGS = {
  dotSize: 1,
  bombSize: 0.5,
  showAllNames: false,
  showEnemyNames: true,
  showViewCones: false,
  showHealthCircles: true,
  mapZoom: 1,
  followPlayerId: null,
  rotateWithPlayer: true,
  mapName: DEFAULT_MAP_NAME, // 👈 ahora el mapa vive en settings
};

const loadSettings = () => {
  const savedSettings = localStorage.getItem("radarSettings");
  if (!savedSettings) return DEFAULT_SETTINGS;

  const parsed = JSON.parse(savedSettings);
  return { ...DEFAULT_SETTINGS, ...parsed };
};

const mapPlayerColor = (playerColor) => {
  if (!playerColor) return 0;
  const normalized = playerColor.toLowerCase();
  return PLAYER_COLOR_TO_INDEX[normalized] ?? 0;
};

const parseWebSocketMessage = async (data) => {
  if (typeof data === "string") return JSON.parse(data);
  if (data?.text) return JSON.parse(await data.text());
  return data;
};

const normalizeRadarPayload = (payload) => {
  const players = Array.isArray(payload?.players) ? payload.players : [];
  const mapName = payload?.map || DEFAULT_MAP_NAME;

  const normalizedPlayers = players.map((player, index) => ({
    m_idx: player.entity_id ?? index,
    m_name: player.name || `Player ${index + 1}`,
    m_steam_id: player.steamid ?? null,
    m_team: player.team_num ?? 0,
    m_color: mapPlayerColor(player.player_color),
    m_health: player.health ?? 0,
    m_armor: player.armor_value ?? 0,
    m_money: player.balance ?? 0,
    m_has_helmet: Boolean(player.has_helmet),
    m_has_defuser: Boolean(player.has_defuser),
    m_is_defusing: Boolean(player.is_defusing),
    m_has_bomb: false,
    m_weapons: {},
    m_position: { x: player.X ?? 0, y: player.Y ?? 0, z: player.Z ?? 0 },
    m_eye_angle: 0,
    m_is_dead: player.is_alive === 0 || player.is_alive === false,
    m_model_name: DEFAULT_MODEL,
    m_last_place_name: player.last_place_name || "",
  }));

  return {
    players: normalizedPlayers,
    localTeam: normalizedPlayers[0]?.m_team ?? null,
    mapName,
  };
};

const App = () => {
  const [averageLatency, setAverageLatency] = useState(0);
  const [playerArray, setPlayerArray] = useState([]);
  const [mapData, setMapData] = useState();
  const [localTeam, setLocalTeam] = useState();
  const [bombData, setBombData] = useState();
  const [settings, setSettings] = useState(loadSettings());

  const mapName = settings.mapName || DEFAULT_MAP_NAME;

  useEffect(() => {
    if (
      settings.followPlayerId &&
      !playerArray.some(
        (player) =>
          player.m_idx === settings.followPlayerId &&
          (localTeam === undefined || player.m_team === localTeam)
      )
    ) {
      setSettings((prev) => ({ ...prev, followPlayerId: null }));
    }
  }, [playerArray, localTeam, settings.followPlayerId]);

  // Guardar settings en localStorage
  useEffect(() => {
    localStorage.setItem("radarSettings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    let webSocket = null;
    let connectionTimeout = null;

    const fetchData = async () => {
      try {
        const webSocketURL = buildWsUrl();
        console.info(`Attempting WebSocket connection to: ${webSocketURL}`);
        webSocket = new WebSocket(webSocketURL);
      } catch (error) {
        const el = document.getElementsByClassName("radar_message")[0];
        if (el) el.textContent = String(error);
        return;
      }

      connectionTimeout = setTimeout(() => {
        try {
          webSocket.close();
        } catch { }
      }, CONNECTION_TIMEOUT);

      webSocket.onopen = async () => {
        clearTimeout(connectionTimeout);
        console.info("connected to the web socket");
      };

      webSocket.onclose = async () => {
        clearTimeout(connectionTimeout);
        console.error("disconnected from the web socket");
      };

      webSocket.onerror = async (error) => {
        clearTimeout(connectionTimeout);
        const el = document.getElementsByClassName("radar_message")[0];
        if (el)
          el.textContent = `WebSocket connection failed. Check the host/URL and try again`;
        console.error(error);
      };

      webSocket.onmessage = async (event) => {
        setAverageLatency(getLatency());

        try {
          const parsedData = await parseWebSocketMessage(event.data);
          const normalized = normalizeRadarPayload(parsedData);

          setPlayerArray(normalized.players);
          setLocalTeam(normalized.localTeam);

          // si el backend manda "map", actualizamos settings.mapName
          if (parsedData?.map) {
            setSettings((prev) => ({
              ...prev,
              mapName: normalized.mapName,
            }));
          }

          setBombData(null);
        } catch (e) {
          console.error("Failed to parse WS message:", e);
        }
      };
    };

    fetchData();

    return () => {
      clearTimeout(connectionTimeout);
      try {
        webSocket && webSocket.close();
      } catch { }
    };
  }, []);

  useEffect(() => {
    const loadMapData = async () => {
      try {
        const data = await (await fetch(`data/${mapName}/data.json`)).json();
        setMapData({ ...data, name: mapName });
        document.body.style.backgroundImage = `none`;
      } catch (error) {
        console.error(`Failed to load map data for ${mapName}:`, error);
      }
    };

    loadMapData();
  }, [mapName]);

  return (
    <div
      className="w-screen h-screen flex flex-col"
      style={{ background: `transparent` }}
    >
      <div className="w-full h-full flex flex-col justify-center overflow-hidden relative">
        {bombData && bombData.m_blow_time > 0 && !bombData.m_is_defused && (
          <div className="absolute left-1/2 top-2 flex-col items-center gap-1 z-50">
            <div className="flex justify-center items-center gap-1">
              <MaskedIcon
                path={`./assets/icons/c4_sml.png`}
                height={32}
                color={
                  (bombData.m_is_defusing &&
                    bombData.m_blow_time - bombData.m_defuse_time > 0 &&
                    `bg-radar-green`) ||
                  (bombData.m_blow_time - bombData.m_defuse_time < 0 &&
                    `bg-radar-red`) ||
                  `bg-radar-secondary`
                }
              />
              <span>
                {`${bombData.m_blow_time.toFixed(1)}s ${(bombData.m_is_defusing &&
                  `(${bombData.m_defuse_time.toFixed(1)}s)`) ||
                  ""
                  }`}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-evenly">
          <Latency
            value={averageLatency}
            settings={settings}
            setSettings={setSettings}
            playerArray={playerArray}
            localTeam={localTeam}
          />

          <ul id="terrorist" className="lg:flex hidden flex-col gap-7 m-0 p-0">
            {playerArray
              .filter((player) => player.m_team == 2)
              .map((player) => (
                <PlayerCard
                  isOnRightSide={false}
                  key={player.m_idx}
                  playerData={player}
                />
              ))}
          </ul>

          {(playerArray.length > 0 && mapData && (
            <Radar
              playerArray={playerArray}
              radarImage={`./data/${mapData.name}/radar.png`}
              mapData={mapData}
              localTeam={localTeam}
              averageLatency={averageLatency}
              bombData={bombData}
              settings={settings}
            />
          )) || (
              <div id="radar" className="relative overflow-hidden origin-center">
                <h1 className="radar_message">
                  Connected! Waiting for data from the WebSocket feed
                </h1>
              </div>
            )}

          <ul
            id="counterTerrorist"
            className="lg:flex hidden flex-col gap-7 m-0 p-0"
          >
            {playerArray
              .filter((player) => player.m_team == 3)
              .map((player) => (
                <PlayerCard
                  isOnRightSide={true}
                  key={player.m_idx}
                  playerData={player}
                  settings={settings}
                />
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default App;
