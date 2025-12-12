// app.jsx
import ReactDOM from "react-dom/client";
import { useEffect, useState } from "react";
import "./app.css";
import PlayerCard from "./components/playercard";
import Radar from "./components/radar";
import { getLatency, Latency } from "./components/latency";
import MaskedIcon from "./components/maskedicon";

const CONNECTION_TIMEOUT = 5000;

const USE_LOCALHOST = import.meta.env.VITE_USE_LOCALHOST === "1";
const PUBLIC_HOST = import.meta.env.VITE_PUBLIC_HOST || "radar.mercadoplus.xyz";
const SECRET_KEY = import.meta.env.VITE_WS_KEY || "";

const PORT = 22006;
const WS_PATH = "/cs2_webradar";

const buildWsUrl = () => {
  const isLocal =
    USE_LOCALHOST ||
    window.location.hostname === "localhost" ||
    window.location.hostname.startsWith("127.") ||
    window.location.hostname.startsWith("192.168.");

  const query = SECRET_KEY ? `?key=${encodeURIComponent(SECRET_KEY)}` : "";

  return isLocal
    ? `ws://localhost:${PORT}${WS_PATH}${query}`
    : `wss://${PUBLIC_HOST}${WS_PATH}${query}`;
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

  useEffect(() => {
    localStorage.setItem("radarSettings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    let ws = null;
    let connectionTimeout = null;
    let reconnectTimer = null;
    let stopped = false;

    let attempt = 0;

    const setMsg = (txt) => {
      const el = document.getElementsByClassName("radar_message")[0];
      if (el) el.textContent = txt;
    };

    const connect = () => {
      if (stopped) return;

      const url = buildWsUrl();
      console.info(`Attempting WebSocket connection to: ${url}`);
      setMsg(`Connecting to ${url} ...`);

      try {
        ws = new WebSocket(url);
      } catch (err) {
        console.error(err);
        setMsg(String(err));
        scheduleReconnect();
        return;
      }

      connectionTimeout = setTimeout(() => {
        try { ws?.close(); } catch { }
      }, CONNECTION_TIMEOUT);

      ws.onopen = () => {
        attempt = 0;
        clearTimeout(connectionTimeout);
        console.info("connected to the web socket");
        setMsg("Connected! Waiting for data from usermode");
      };

      ws.onclose = () => {
        clearTimeout(connectionTimeout);
        console.error("disconnected from the web socket");
        if (!stopped) scheduleReconnect();
      };

      ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error(error);
        setMsg("WebSocket connection failed. Check the host/URL and try again");
      };

      ws.onmessage = async (event) => {
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

    const scheduleReconnect = () => {
      attempt += 1;
      const delay = Math.min(1000 * 2 ** Math.min(attempt, 6), 15000); // 1s..15s
      console.info(`Reconnecting in ${delay}ms (attempt ${attempt})...`);
      setMsg(`Disconnected. Reconnecting in ${Math.round(delay / 1000)}s...`);
      reconnectTimer = setTimeout(connect, delay);
    };

    connect();

    return () => {
      stopped = true;
      clearTimeout(connectionTimeout);
      clearTimeout(reconnectTimer);
      try { ws?.close(); } catch { }
    };
  }, []);

  return (
    <div className="w-screen h-screen flex flex-col" style={{ background: `transparent` }}>
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
                {`${bombData.m_blow_time.toFixed(1)}s ${(bombData.m_is_defusing && `(${bombData.m_defuse_time.toFixed(1)}s)`) || ""
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
              <div id="radar" className="relative overflow-hidden origin-center">
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
