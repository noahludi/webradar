import { useRef, useState, useEffect } from "react";
import { getRadarPosition, playerColors } from "../utilities/utilities";


let playerRotations = [];
const calculatePlayerRotation = (playerData) => {
  const playerViewAngle = 270 - playerData.m_eye_angle;
  const idx = playerData.m_idx;

  playerRotations[idx] = (playerRotations[idx] || 0) % 360;
  playerRotations[idx] +=
    ((playerViewAngle - playerRotations[idx] + 540) % 360) - 180;

  return playerRotations[idx];
};

const Player = ({ playerData, mapData, radarImage, localTeam, averageLatency, settings, isFollowed, mapRotation }) => {
  const [lastKnownPosition, setLastKnownPosition] = useState(null);
  const radarPosition = getRadarPosition(mapData, playerData.m_position) || { x: 0, y: 0 };
  const invalidPosition = radarPosition.x <= 0 && radarPosition.y <= 0;

  const playerRef = useRef();
  const playerBounding = (playerRef.current &&
    playerRef.current.getBoundingClientRect()) || { width: 0, height: 0 };

  // Base rotation for all players and counter-rotate the followed one to
  // avoid double rotation when the map itself is rotating.
  const baseRotation = calculatePlayerRotation(playerData);
  const playerRotation = isFollowed ? baseRotation - mapRotation : baseRotation;

  const radarImageBounding = (radarImage !== undefined &&
    { width: radarImage.clientWidth, height: radarImage.clientHeight }) || { width: 0, height: 0 };

  const scaledSize = 0.7 * settings.dotSize;

  // Store the last known position when the player dies
  useEffect(() => {
    if (playerData.m_is_dead) {
      if (!lastKnownPosition) {
        setLastKnownPosition(radarPosition);
      }
    } else {
      setLastKnownPosition(null);
    }
  }, [playerData.m_is_dead, radarPosition, lastKnownPosition]);

  const effectivePosition = playerData.m_is_dead ? lastKnownPosition || { x: 0, y: 0 } : radarPosition;

  const radarImageTranslation = {
    x: radarImageBounding.width * effectivePosition.x - playerBounding.width * 0.5,
    y: radarImageBounding.height * effectivePosition.y - playerBounding.height * 0.5,
  };

  // Calculate health percentage and color for the circle
  const healthPercentage = Math.max(0, Math.min(100, playerData.m_health)) / 100;
  const isEnemy = playerData.m_team !== localTeam;

  // Interpolate color from green (100% health) to red (0% health)
  const healthColor = `rgb(${Math.round(255 * (1 - healthPercentage))}, ${Math.round(255 * healthPercentage)}, 0)`;

  return (
    <div
      className={`absolute origin-center rounded-[100%] left-0 top-0`}
      ref={playerRef}
      style={{
        width: `${scaledSize}vw`,
        height: `${scaledSize}vw`,
        transform: `translate(${radarImageTranslation.x}px, ${radarImageTranslation.y}px)`,
        transition: `transform ${averageLatency}ms linear`,
        zIndex: `${(playerData.m_is_dead && `0`) || `1`}`,
        WebkitMask: `${(playerData.m_is_dead && `url('./assets/icons/icon-enemy-death_png.png') no-repeat center / contain`) || `none`}`,
      }}
    >
      {/* Health circle for enemies */}
      {settings.showHealthCircles && isEnemy && !playerData.m_is_dead && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: `${scaledSize * 1.6}vw`,
            height: `${scaledSize * 1.6}vw`,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            border: `4px solid ${healthColor}`,
            boxShadow: `0 0 8px ${healthColor}, 0 0 0 1px rgba(0, 0, 0, 0.8)`,
            transition: `border-color ${averageLatency}ms linear, box-shadow ${averageLatency}ms linear`,
          }}
        />
      )}
      {/* Name above the dot - outside rotation container */}
      {(settings.showAllNames && playerData.m_team === localTeam) ||
        (settings.showEnemyNames && playerData.m_team !== localTeam) ? (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 -translate-y-1 text-center">
          <span className="text-xs text-white whitespace-nowrap max-w-[80px] inline-block overflow-hidden text-ellipsis">
            {playerData.m_name}
          </span>
        </div>
      ) : null}

      {/* Rotating container for player elements */}
      <div
        style={{
          transform: `rotate(${(playerData.m_is_dead && `0`) || playerRotation}deg)`,
          width: `${scaledSize}vw`,
          height: `${scaledSize}vw`,
          transition: `transform ${averageLatency}ms linear`,
          opacity: `${(playerData.m_is_dead && `0.8`) || (invalidPosition && `0`) || `1`}`,
        }}
      >
        {/* Player dot */}
        <div
          className={`w-full h-full rounded-[50%_50%_50%_0%] rotate-[315deg]`}
          style={{

            backgroundColor: `${(playerData.m_team == localTeam && playerColors[playerData.m_color]) || `#ff1493`}`,
            opacity: `${(playerData.m_is_dead && `0.8`) || (invalidPosition && `0`) || `1`}`,
          }}
        />

        {/* View cone */}
        {!playerData.m_is_dead && (
          <div
            className="absolute left-1/2 top-1/2 w-[1.5vw] h-[3vw] bg-white opacity-30"
            style={{
              transform: `translate(-50%, -100%)`,
              clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
              transition: `transform ${averageLatency}ms linear`,
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Player;