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

  const mapRotation =
    settings.rotateWithPlayer && followedPlayer
      ? -(270 - followedPlayer.m_eye_angle)
      : 0;

  const mapScale = settings.mapZoom || 1;

  const mapTranslation = useMemo(() => {
    if (!followedPosition || radarDimensions.width === 0 || radarDimensions.height === 0) {
      return { x: 0, y: 0 };
    }

    const scaledWidth = radarDimensions.width * mapScale;
    const scaledHeight = radarDimensions.height * mapScale;

    return {
      x: radarDimensions.width / 2 - followedPosition.x * scaledWidth,
      y: radarDimensions.height / 2 - followedPosition.y * scaledHeight,
    };
  }, [followedPosition, mapScale, radarDimensions.width, radarDimensions.height]);

  return (
    <div id="radar" className={`relative overflow-hidden origin-center`}>
      <div
        className="relative"
        style={{
          transformOrigin: "center center",
          transform: `translate(${mapTranslation.x}px, ${mapTranslation.y}px) rotate(${mapRotation}deg) scale(${mapScale})`,
          transition: `transform ${averageLatency}ms linear`,
        }}
      >
        <img ref={radarImageRef} className={`w-full h-auto`} src={radarImage} />

        {playerArray.map((player) => (
          <Player
            key={player.m_idx}
            playerData={player}
            mapData={mapData}
            radarImage={radarImageRef.current}
            localTeam={localTeam}
            averageLatency={averageLatency}
            settings={settings}
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