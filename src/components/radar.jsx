import { useMemo, useRef } from "react";
import Player from "./player";
import Bomb from "./bomb";
import { getRadarPosition } from "../utilities/utilities";

const Radar = ({
  playerArray,
  radarImage,
  mapData,
  localTeam,
  averageLatency,
  bombData,
  settings
}) => {
  const radarImageRef = useRef();

  const radarDimensions = radarImageRef.current
    ? {
      width: radarImageRef.current.clientWidth,
      height: radarImageRef.current.clientHeight,
    }
    : { width: 0, height: 0 };

  const followedPlayer = useMemo(
    () =>
      settings.followPlayerId
        ? playerArray.find((player) => player.m_idx === settings.followPlayerId)
        : null,
    [playerArray, settings.followPlayerId]
  );

  const followedPosition = useMemo(() => {
    if (!followedPlayer || !mapData) return null;
    return getRadarPosition(mapData, followedPlayer.m_position);
  }, [followedPlayer, mapData]);

  // Rotación instantánea, sin smoothing
  const mapRotation = useMemo(() => {
    if (!settings.rotateWithPlayer || !followedPlayer) {
      return 0;
    }

    return -(270 - followedPlayer.m_eye_angle) + 180;
  }, [settings.rotateWithPlayer, followedPlayer?.m_eye_angle]);

  const mapScale = settings.mapZoom || 1;

  const transformOrigin = followedPosition
    ? `${followedPosition.x * 100}% ${followedPosition.y * 100}%`
    : "50% 50%";

  const mapTranslation = useMemo(() => {
    if (!followedPosition || radarDimensions.width === 0 || radarDimensions.height === 0) {
      return { x: 0, y: 0 };
    }

    return {
      x: radarDimensions.width / 2 - followedPosition.x * radarDimensions.width,
      y: radarDimensions.height / 2 - followedPosition.y * radarDimensions.height,
    };
  }, [followedPosition, radarDimensions.width, radarDimensions.height]);

  // 👇 Ahora NO usamos localTeam para ocultar, todos son "enemigos" a efectos del filtro
  const selectedEnemyIds = settings.selectedEnemyIds || [];

  const filteredPlayers = useMemo(() => {
    // Si no hay selección, mostramos a todos
    if (selectedEnemyIds.length === 0) {
      return playerArray;
    }

    // Si hay selección, sólo los seleccionados (sea el team que sea)
    return playerArray.filter((player) => selectedEnemyIds.includes(player.m_idx));
  }, [playerArray, selectedEnemyIds]);

  return (
    <div id="radar" className={`relative overflow-hidden origin-center`}>
      <div
        className="relative"
        style={{
          transformOrigin,
          transform: `translate(${mapTranslation.x}px, ${mapTranslation.y}px) rotate(${mapRotation}deg) scale(${mapScale})`,
        }}
      >
        <img ref={radarImageRef} className={`w-full h-auto`} src={radarImage} />

        {filteredPlayers.map((player) => (
          <Player
            key={player.m_idx}
            playerData={player}
            mapData={mapData}
            radarImage={radarImageRef.current}
            localTeam={localTeam}
            averageLatency={averageLatency}
            settings={settings}
            isFollowed={settings.followPlayerId === player.m_idx}
            mapRotation={mapRotation}
          />
        ))}

        {bombData && (
          <Bomb
            bombData={bombData}
            mapData={mapData}
            radarImage={radarImageRef.current}
            localTeam={localTeam}
            averageLatency={averageLatency}
            settings={settings}
          />
        )}
      </div>
    </div>
  );
};

export default Radar;
