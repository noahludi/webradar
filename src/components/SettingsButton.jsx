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
];

// Key estable para React: steamid si existe, sino m_idx
const getPlayerKey = (player) =>
  player.steamid ?? player.m_steamid ?? player.m_xuid ?? player.m_idx ?? `p-${player.m_name}`;

const SettingsButton = ({ settings, onSettingsChange, playerArray = [], localTeam }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Ordenamos los players siempre igual para que no “bailen” en el selector
  const sortedPlayers = [...playerArray].sort((a, b) => {
    if (a.m_team !== b.m_team) return a.m_team - b.m_team;
    const nameA = a.m_name || "";
    const nameB = b.m_name || "";
    if (nameA !== nameB) return nameA.localeCompare(nameB);
    return (a.m_idx ?? 0) - (b.m_idx ?? 0);
  });

  const teamPlayers = sortedPlayers.filter((player) => player.m_team === localTeam);
  const selectablePlayers = sortedPlayers;

  const currentMap = settings.mapName || "de_mirage";
  const selectedEnemyIds = settings.selectedEnemyIds || [];

  return (
    <div className="z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 transition-all rounded-xl"
      >
        <img className="w-[1.3rem]" src={`./assets/icons/cog.svg`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-radar-panel/90 backdrop-blur-lg rounded-xl p-4 shadow-xl border border-radar-secondary/20">
          <h3 className="text-radar-primary text-lg font-semibold mb-4">Radar Settings</h3>

          <div className="space-y-3">
            {/* Dot size */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-radar-secondary text-sm">Dot Size</span>
                <span className="text-radar-primary text-sm font-mono">{settings.dotSize}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="4"
                step="0.1"
                value={settings.dotSize}
                onChange={(e) =>
                  onSettingsChange({ ...settings, dotSize: parseFloat(e.target.value) })
                }
                className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-radar-primary"
                style={{
                  background: `linear-gradient(to right, #b1d0e7 ${((settings.dotSize - 0.5) / 1.5) * 100
                    }%, rgba(59, 130, 246, 0.2) ${((settings.dotSize - 0.5) / 1.5) * 100
                    }%)`,
                }}
              />
            </div>

            {/* Bomb size */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-radar-secondary text-sm">Bomb Size</span>
                <span className="text-radar-primary text-sm font-mono">{settings.bombSize}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={settings.bombSize}
                onChange={(e) =>
                  onSettingsChange({ ...settings, bombSize: parseFloat(e.target.value) })
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
                <span className="text-radar-secondary text-sm">Zoom del mapa</span>
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
                  onSettingsChange({ ...settings, mapZoom: parseFloat(e.target.value) })
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
                <span className="text-radar-secondary text-sm">Seguir jugador (tu team)</span>
              </div>
              <select
                value={settings.followPlayerId ?? ""}
                onChange={(e) =>
                  onSettingsChange({
                    ...settings,
                    followPlayerId: e.target.value === "" ? null : parseInt(e.target.value, 10),
                  })
                }
                className="w-full bg-radar-secondary/20 border border-radar-secondary/40 rounded-lg p-2 text-sm text-radar-primary focus:outline-none focus:ring-2 focus:ring-radar-primary/50"
              >
                <option value="">Ninguno</option>
                {teamPlayers.map((player) => (
                  <option key={getPlayerKey(player)} value={player.m_idx}>
                    {player.m_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Jugadores visibles */}
            <div className="space-y-2 max-h-40 overflow-y-auto">
              <div className="flex justify-between items-center mb-1">
                <span className="text-radar-secondary text-sm">Jugadores visibles</span>
              </div>

              {selectablePlayers.length === 0 && (
                <p className="text-xs text-radar-secondary/70">
                  No se detectaron jugadores todavía.
                </p>
              )}

              {selectablePlayers.map((player) => {
                const checked = selectedEnemyIds.includes(player.m_idx);
                return (
                  <label
                    key={getPlayerKey(player)}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-radar-secondary/20 transition-colors cursor-pointer text-xs"
                  >
                    <span className="text-radar-primary truncate mr-2">
                      {player.m_name || `Player ${player.m_idx}`}
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const current = selectedEnemyIds;
                        let next;
                        if (e.target.checked) {
                          next = [...new Set([...current, player.m_idx])];
                        } else {
                          next = current.filter((id) => id !== player.m_idx);
                        }
                        onSettingsChange({
                          ...settings,
                          selectedEnemyIds: next,
                        });
                      }}
                      className="h-4 w-4 rounded border-radar-secondary/50 text-radar-primary focus:ring-radar-primary/60"
                    />
                  </label>
                );
              })}
            </div>

            {/* Toggles */}
            <div className="space-y-1">
              <label className="flex items-center justify-between p-3 rounded-lg hover:bg-radar-secondary/20 transition-colors cursor-pointer">
                <span className="text-radar-secondary text-sm">Ally Names</span>
                <input
                  type="checkbox"
                  checked={settings.showAllNames}
                  onChange={(e) =>
                    onSettingsChange({ ...settings, showAllNames: e.target.checked })
                  }
                  className="relative h-5 w-9 rounded-full shadow-sm bg-radar-secondary/30 checked:bg-radar-secondary transition-colors duration-200 appearance-none before:absolute before:h-4 before:w-4 before:top-0.5 before:left-0.5 before:bg-white before:rounded-full before:transition-transform before:duration-200 checked:before:translate-x-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg hover:bg-radar-secondary/20 transition-colors cursor-pointer">
                <span className="text-radar-secondary text-sm">Enemy Names</span>
                <input
                  type="checkbox"
                  checked={settings.showEnemyNames}
                  onChange={(e) =>
                    onSettingsChange({ ...settings, showEnemyNames: e.target.checked })
                  }
                  className="relative h-5 w-9 rounded-full shadow-sm bg-radar-secondary/30 checked:bg-radar-secondary transition-colors duration-200 appearance-none before:absolute before:h-4 before:w-4 before:top-0.5 before:left-0.5 before:bg-white before:rounded-full before:transition-transform before:duration-200 checked:before:translate-x-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg hover:bg-radar-secondary/20 transition-colors cursor-pointer">
                <span className="text-radar-secondary text-sm">View Cones</span>
                <input
                  type="checkbox"
                  checked={settings.showViewCones}
                  onChange={(e) =>
                    onSettingsChange({ ...settings, showViewCones: e.target.checked })
                  }
                  className="relative h-5 w-9 rounded-full shadow-sm bg-radar-secondary/30 checked:bg-radar-secondary transition-colors duration-200 appearance-none before:absolute before:h-4 before:w-4 before:top-0.5 before:left-0.5 before:bg-white before:rounded-full before:transition-transform before:duration-200 checked:before:translate-x-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg hover:bg-radar-secondary/20 transition-colors cursor-pointer">
                <span className="text-radar-secondary text-sm">Health Circles</span>
                <input
                  type="checkbox"
                  checked={settings.showHealthCircles}
                  onChange={(e) =>
                    onSettingsChange({ ...settings, showHealthCircles: e.target.checked })
                  }
                  className="relative h-5 w-9 rounded-full shadow-sm bg-radar-secondary/30 checked:bg-radar-secondary transition-colors duration-200 appearance-none before:absolute before:h-4 before:w-4 before:top-0.5 before:left-0.5 before:bg-white before:rounded-full before:transition-transform before:duration-200 checked:before:translate-x-4"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg hover:bg-radar-secondary/20 transition-colors cursor-pointer">
                <span className="text-radar-secondary text-sm">Rotar con jugador seguido</span>
                <input
                  type="checkbox"
                  checked={settings.rotateWithPlayer}
                  disabled={!settings.followPlayerId}
                  onChange={(e) =>
                    onSettingsChange({ ...settings, rotateWithPlayer: e.target.checked })
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
