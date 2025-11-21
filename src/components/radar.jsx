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

  const mapRotationRef = useRef(0);

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

  const mapRotation = useMemo(() => {
    if (!settings.rotateWithPlayer || !followedPlayer) {
      mapRotationRef.current = 0;
      return 0;
    }

    const targetRotation = -(270 - followedPlayer.m_eye_angle);

    const currentRotation = mapRotationRef.current % 360;
    const normalizedTarget = ((targetRotation % 360) + 360) % 360;
    const normalizedCurrent = ((currentRotation % 360) + 360) % 360;

    const shortestDelta = ((normalizedTarget - normalizedCurrent + 540) % 360) - 180;
    const nextRotation = currentRotation + shortestDelta;

    mapRotationRef.current = nextRotation;
    return nextRotation;
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

  return (
    <div id="radar" className={`relative overflow-hidden origin-center`}>
      <div
        className="relative"
        style={{
          transformOrigin,
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