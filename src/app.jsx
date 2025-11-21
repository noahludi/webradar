import ReactDOM from "react-dom/client";
import { useEffect, useState } from "react";
import "./app.css";
import PlayerCard from "./components/playercard";
import Radar from "./components/radar";
import { getLatency, Latency } from "./components/latency";
import MaskedIcon from "./components/maskedicon";

const CONNECTION_TIMEOUT = 5000;

/* 1 = solo local (tu PC); 0 = usar el túnel público */
const USE_LOCALHOST = import.meta.env.VITE_USE_LOCALHOST === "1";

/* Dominio del túnel Cloudflare (SIN puerto) */
const PUBLIC_HOST = import.meta.env.VITE_PUBLIC_HOST || "wslab.mercadoplus.xyz";

/* Puerto local del backend (para dev) */
const PORT = 22006;

/* Ruta CORRECTA del WS en tu backend */
const WS_PATH = "/cs2_webradar";

/* Construye la URL correcta según entorno */
const buildWsUrl = () => {
  const isLocal =
    USE_LOCALHOST ||
    window.location.hostname === "localhost" ||
    window.location.hostname.startsWith("127.") ||
    window.location.hostname.startsWith("192.168.");

  return isLocal
    ? `ws://localhost:${PORT}${WS_PATH}`   // desarrollo local
    : `wss://${PUBLIC_HOST}${WS_PATH}`;    // público via Cloudflare (sin puerto)
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
};

const loadSettings = () => {
  const savedSettings = localStorage.getItem("radarSettings");
  if (!savedSettings) return DEFAULT_SETTINGS;

  const parsed = JSON.parse(savedSettings);
  return { ...DEFAULT_SETTINGS, ...parsed };
};

const App = () => {
  const [averageLatency, setAverageLatency] = useState(0);
  const [playerArray, setPlayerArray] = useState([]);
  const [mapData, setMapData] = useState();
  const [localTeam, setLocalTeam] = useState();
  const [bombData, setBombData] = useState();
  const [settings, setSettings] = useState(loadSettings());

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
    const fetchData = async () => {
      let webSocket = null;
      let connectionTimeout = null;

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
        try { webSocket.close(); } catch { }
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
        if (el) el.textContent = `WebSocket connection failed. Check the host/URL and try again`;
        console.error(error);
      };

      webSocket.onmessage = async (event) => {
        setAverageLatency(getLatency());

        try {
          const parsedData = JSON.parse(await event.data.text());
          setPlayerArray(parsedData.m_players);
          setLocalTeam(parsedData.m_local_team);
          setBombData(parsedData.m_bomb);

          const map = parsedData.m_map;
          if (map !== "invalid") {
            setMapData({
              ...(await (await fetch(`data/${map}/data.json`)).json()),
              name: map,
            });
            document.body.style.backgroundImage = `none`;
          }
        } catch (e) {
          console.error("Failed to parse WS message:", e);
        }
      };
    };

    fetchData();
  }, []);

  return (
    <div
      className="w-screen h-screen flex flex-col"
      style={{
        background: `transparent`,
      }}
    >
      {/* (banner removido a pedido) */}

      <div className={`w-full h-full flex flex-col justify-center overflow-hidden relative`}>
        {bombData && bombData.m_blow_time > 0 && !bombData.m_is_defused && (
          <div className={`absolute left-1/2 top-2 flex-col items-center gap-1 z-50`}>
            <div className={`flex justify-center items-center gap-1`}>
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
              <span>{`${bombData.m_blow_time.toFixed(1)}s ${(bombData.m_is_defusing && `(${bombData.m_defuse_time.toFixed(1)}s)`) || ""
                }`}</span>
            </div>
          </div>
        )}

        <div className={`flex items-center justify-evenly`}>
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
                <PlayerCard right={false} key={player.m_idx} playerData={player} />
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
              <div id="radar" className={`relative overflow-hidden origin-center`}>
                <h1 className="radar_message">Connected! Waiting for data from usermode</h1>
              </div>
            )}

          <ul id="counterTerrorist" className="lg:flex hidden flex-col gap-7 m-0 p-0">
            {playerArray
              .filter((player) => player.m_team == 3)
              .map((player) => (
                <PlayerCard
                  right={true}
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
