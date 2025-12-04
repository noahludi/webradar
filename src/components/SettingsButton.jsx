import { useState } from "react";

// Podés mover esto a un archivo compartido si querés
const MAP_OPTIONS = [
  { value: "de_mirage", label: "Mirage" },
  { value: "de_inferno", label: "Inferno" },
  { value: "de_nuke", label: "Nuke" },
  { value: "de_overpass", label: "Overpass" },
  { value: "de_ancient", label: "Ancient" },
  { value: "de_vertigo", label: "Vertigo" },
  { value: "de_anubis", label: "Anubis" },
  { value: "de_dust2", label: "Dust 2" },
  { value: "de_train", label: "Train" },
  { value: "de_cache", label: "Cache" },
];

// Helpers para unificar formas distintas de player (memoria vs parser .dem)
const getPlayerTeam = (p) =>
  p.m_team ?? p.team_num ?? p.team ?? 0;

const getPlayerName = (p) =>
  p.m_name ?? p.name ?? p.player_name ?? "";

// ID numérico “lógico” del player (para followPlayerId)
const getPlayerIdx = (p) => {
  if (typeof p.m_idx === "number") return p.m_idx;
  if (typeof p.idx === "number") return p.idx;
  if (typeof p.entityIndex === "number") return p.entityIndex;
  if (typeof p.entindex === "number") return p.entindex;
  if (typeof p.steamid === "number" && p.steamid !== 0) return p.steamid;
  return null;
};

// Key estable para React
const getPlayerKey = (p) => {
  const sid = p.steamid ?? p.m_steamid ?? p.m_xuid ?? null;

  if (sid && sid !== 0 && sid !== "0") {
    return `sid-${String(sid)}`;
  }

  const idx = getPlayerIdx(p);
  if (idx !== null) {
    return `idx-${idx}`;
  }

  const name = getPlayerName(p) || "noname";
  const team = getPlayerTeam(p);
  return `name-${name}-team-${team}`;
};

const SettingsButton = ({
  settings,
  onSettingsChange,
  playerArray = [],
  localTeam,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Ordenamos los players SIEMPRE igual para que no bailen:
  // primero por team, luego por nombre, luego por idx
  const sortedPlayers = [...playerArray].sort((a, b) => {
    const teamA = getPlayerTeam(a);
    const teamB = getPlayerTeam(b);
    if (teamA !== teamB) return teamA - teamB;

    const nameA = getPlayerName(a);
    const nameB = getPlayerName(b);
    if (nameA !== nameB) return nameA.localeCompare(nameB);

    const idxA = getPlayerIdx(a) ?? 0;
    const idxB = getPlayerIdx(b) ?? 0;
    return idxA - idxB;
  });

  const teamPlayers = sortedPlayers.filter(
    (player) => getPlayerTeam(player) === localTeam
  );

  const currentMap = settings.mapName || "de_mirage";
  const drawTeam = settings.drawTeam ?? 2; // 2 = TT, 3 = CT

  return (
    <div className="z-50 relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 transition-all rounded-xl"
      >
        <img className="w-[1.3rem]" src="./assets/icons/cog.svg" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-radar-panel/90 backdrop-blur-lg rounded-xl p-4 shadow-xl border border-radar-secondary/20">
          <h3 className="text-radar-primary text-lg font-semibold mb-4">
            Radar Settings
          </h3>

          <div className="space-y-3">
            {/* Dot size */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-radar-secondary text-sm">Dot Size</span>
                <span className="text-radar-primary text-sm font-mono">
                  {settings.dotSize}x
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="4"
                step="0.1"
                value={settings.dotSize}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    dotSize: parseFloat(e.target.value),
                  })
                }
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-radar-primary"
                style={{
                  background: `linear-gradient(to right, #b1d0e7 ${((settings.dotSize - 0.5) / 3.5) * 100
                    }%, rgba(59, 130, 246, 0.2) ${((settings.dotSize - 0.5) / 3.5) * 100
                    }%)`,
                }}
              />
            </div>

            {/* Bomb size */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-radar-secondary text-sm">
                  Bomb Size
                </span>
                <span className="text-radar-primary text-sm font-mono">
                  {settings.bombSize}x
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={settings.bombSize}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    bombSize: parseFloat(e.target.value),
                  })
                }
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-radar-primary"
                style={{
                  background: `linear-gradient(to right, #b1d0e7 ${((settings.bombSize - 0.1) / 1.9) * 100
                    }%, rgba(59, 130, 246, 0.2) ${((settings.bombSize - 0.1) / 1.9) * 100
                    }%)`,
                }}
              />
            </div>

            {/* Zoom del mapa */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-radar-secondary text-sm">
                  Zoom del mapa
                </span>
                <span className="text-radar-primary text-sm font-mono">
                  {settings.mapZoom.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={settings.mapZoom}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    mapZoom: parseFloat(e.target.value),
                  })
                }
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-radar-primary"
                style={{
                  background: `linear-gradient(to right, #b1d0e7 ${((settings.mapZoom - 0.5) / 1.5) * 100
                    }%, rgba(59, 130, 246, 0.2) ${((settings.mapZoom - 0.5) / 1.5) * 100
                    }%)`,
                }}
              />
            </div>

            {/* Selector de mapa */}
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-radar-secondary text-sm">Mapa</span>
              </div>
              <select
                value={currentMap}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    mapName: e.target.value,
                  })
                }
                className="w-full bg-radar-secondary/20 border border-radar-secondary/40 rounded-lg p-2 text-sm text-radar-primary focus:outline-none focus:ring-2 focus:ring-radar-primary/50"
              >
                {MAP_OPTIONS.map((map) => (
                  <option key={map.value} value={map.value}>
                    {map.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Seguir jugador (tu team) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-radar-secondary text-sm">
                  Seguir jugador (tu team)
                </span>
              </div>
              <select
                value={settings.followPlayerId ?? ""}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    followPlayerId:
                      e.target.value === ""
                        ? null
                        : parseInt(e.target.value, 10),
                  })
                }
                className="w-full bg-radar-secondary/20 border border-radar-secondary/40 rounded-lg p-2 text-sm text-radar-primary focus:outline-none focus:ring-2 focus:ring-radar-primary/50"
              >
                <option value="">Ninguno</option>
                {teamPlayers.map((player) => {
                  const idx = getPlayerIdx(player);
                  if (idx === null) return null;
                  return (
                    <option key={getPlayerKey(player)} value={idx}>
                      {getPlayerName(player) || `Player ${idx}`}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Team a dibujar (TT / CT) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-radar-secondary text-sm">
                  Team a dibujar
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onSettingsChange({
                      ...settings,
                      drawTeam: 2,
                    })
                  }
                  className={`px-2 py-1 rounded-lg text-xs font-medium border ${drawTeam === 2
                    ? "bg-radar-primary text-black border-radar-primary"
                    : "bg-radar-secondary/20 text-radar-secondary border-radar-secondary/40"
                    }`}
                >
                  Dibujar TTs
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onSettingsChange({
                      ...settings,
                      drawTeam: 3,
                    })
                  }
                  className={`px-2 py-1 rounded-lg text-xs font-medium border ${drawTeam === 3
                    ? "bg-radar-primary text-black border-radar-primary"
                    : "bg-radar-secondary/20 text-radar-secondary border-radar-secondary/40"
                    }`}
                >
                  Dibujar CTs
                </button>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-1">
              <label className="flex items-center justify-between p-3 rounded-lg hover:bg-radar-secondary/20 transition-colors cursor-pointer">
                <span className="text-radar-secondary text-sm">
                  Ally Names
                </span>
                <input
                  type="checkbox"
                  checked={settings.showAllNames}
                  onChange={(e) =>
                    onSettingsChange({
                      ...settings,
                      showAllNames: e.target.checked,
                    })
                  }
                  className="relative h-5 w-9 rounded-full shadow-sm bg-radar-secondary/30 checked:bg-radar-secondary transition-colors duration-200 appearance-none before:absolute before:h-4 before:w-4 before:top-0.5 before:left-0.5 before:bg-white before:rounded-full before:transition-transform before:duration-200 checked:before:translate-x-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg hover:bg-radar-secondary/20 transition-colors cursor-pointer">
                <span className="text-radar-secondary text-sm">
                  Enemy Names
                </span>
                <input
                  type="checkbox"
                  checked={settings.showEnemyNames}
                  onChange={(e) =>
                    onSettingsChange({
                      ...settings,
                      showEnemyNames: e.target.checked,
                    })
                  }
                  className="relative h-5 w-9 rounded-full shadow-sm bg-radar-secondary/30 checked:bg-radar-secondary transition-colors duration-200 appearance-none before:absolute before:h-4 before:w-4 before:top-0.5 before:left-0.5 before:bg-white before:rounded-full before:transition-transform before:duration-200 checked:before:translate-x-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg hover:bg-radar-secondary/20 transition-colors cursor-pointer">
                <span className="text-radar-secondary text-sm">
                  View Cones
                </span>
                <input
                  type="checkbox"
                  checked={settings.showViewCones}
                  onChange={(e) =>
                    onSettingsChange({
                      ...settings,
                      showViewCones: e.target.checked,
                    })
                  }
                  className="relative h-5 w-9 rounded-full shadow-sm bg-radar-secondary/30 checked:bg-radar-secondary transition-colors duration-200 appearance-none before:absolute before:h-4 before:w-4 before:top-0.5 before:left-0.5 before:bg-white before:rounded-full before:transition-transform before:duration-200 checked:before:translate-x-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg hover:bg-radar-secondary/20 transition-colors cursor-pointer">
                <span className="text-radar-secondary text-sm">
                  Health Circles
                </span>
                <input
                  type="checkbox"
                  checked={settings.showHealthCircles}
                  onChange={(e) =>
                    onSettingsChange({
                      ...settings,
                      showHealthCircles: e.target.checked,
                    })
                  }
                  className="relative h-5 w-9 rounded-full shadow-sm bg-radar-secondary/30 checked:bg-radar-secondary transition-colors duration-200 appearance-none before:absolute before:h-4 before:w-4 before:top-0.5 before:left-0.5 before:bg-white before:rounded-full before:transition-transform before:duration-200 checked:before:translate-x-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg hover:bg-radar-secondary/20 transition-colors cursor-pointer">
                <span className="text-radar-secondary text-sm">
                  Rotar con jugador seguido
                </span>
                <input
                  type="checkbox"
                  checked={settings.rotateWithPlayer}
                  disabled={!settings.followPlayerId}
                  onChange={(e) =>
                    onSettingsChange({
                      ...settings,
                      rotateWithPlayer: e.target.checked,
                    })
                  }
                  className="relative h-5 w-9 rounded-full shadow-sm bg-radar-secondary/30 checked:bg-radar-secondary transition-colors duration-200 appearance-none before:absolute before:h-4 before:w-4 before:top-0.5 before:left-0.5 before:bg-white before:rounded-full before:transition-transform before:duration-200 checked:before:translate-x-4 disabled:opacity-50"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsButton;
