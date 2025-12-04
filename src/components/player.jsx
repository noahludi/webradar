import { useRef, useState, useEffect } from "react";
import { getRadarPosition, playerColors } from "../utilities/utilities";

// Rotación directa, sin smoothing/interpolación
const calculatePlayerRotation = (playerData) => {
  return 270 - playerData.m_eye_angle;
};

const Player = ({
  playerData,
  mapData,
  radarImage,
  localTeam,       // ya no lo usamos para diferenciar
  averageLatency,  // lo dejamos en la firma por compatibilidad, pero no lo usamos
  settings,
  isFollowed,
  mapRotation,
  // 👇 opcionales, por si los pasás desde Radar
  isSelectedTeam,
  isOtherTeam,
  showHealthCircle,
}) => {
  const [lastKnownPosition, setLastKnownPosition] = useState(null);

  const radarPosition =
    getRadarPosition(mapData, playerData.m_position) || { x: 0, y: 0 };
  const invalidPosition = radarPosition.x <= 0 && radarPosition.y <= 0;

  const playerRef = useRef();
  const playerBounding =
    (playerRef.current && playerRef.current.getBoundingClientRect()) || {
      width: 0,
      height: 0,
    };

  // Rotación base del jugador
  const baseRotation = calculatePlayerRotation(playerData);
  // Si es el seguido y el mapa rota, compensamos
  const playerRotation = isFollowed ? baseRotation - mapRotation : baseRotation;

  const radarImageBounding =
    (radarImage !== undefined && {
      width: radarImage.clientWidth,
      height: radarImage.clientHeight,
    }) || { width: 0, height: 0 };

  const scaledSize = 0.7 * settings.dotSize;

  // Guardar última posición conocida cuando muere
  useEffect(() => {
    if (playerData.m_is_dead) {
      if (!lastKnownPosition) {
        setLastKnownPosition(radarPosition);
      }
    } else {
      setLastKnownPosition(null);
    }
  }, [playerData.m_is_dead, radarPosition, lastKnownPosition]);

  const effectivePosition = playerData.m_is_dead
    ? lastKnownPosition || { x: 0, y: 0 }
    : radarPosition;

  const radarImageTranslation = {
    x:
      radarImageBounding.width * effectivePosition.x -
      playerBounding.width * 0.5,
    y:
      radarImageBounding.height * effectivePosition.y -
      playerBounding.height * 0.5,
  };

  // --- LÓGICA DE TEAMS / COLORES / VIDA ---

  const configuredDrawTeam = settings.drawTeam ?? null; // 2 = TT, 3 = CT

  const resolvedIsSelectedTeam =
    typeof isSelectedTeam === "boolean"
      ? isSelectedTeam
      : configuredDrawTeam != null
        ? playerData.m_team === configuredDrawTeam
        : true; // si no hay drawTeam seteado, tratamos a todos como "seleccionados"

  const resolvedIsOtherTeam =
    typeof isOtherTeam === "boolean"
      ? isOtherTeam
      : configuredDrawTeam != null
        ? playerData.m_team !== configuredDrawTeam
        : false;

  const resolvedShowHealthCircle =
    typeof showHealthCircle === "boolean"
      ? showHealthCircle
      : resolvedIsSelectedTeam && settings.showHealthCircles;

  const healthPercentage = Math.max(0, Math.min(100, playerData.m_health)) / 100;

  // Color del círculo de vida (verde → rojo)
  const healthColor = `rgb(${Math.round(
    255 * (1 - healthPercentage)
  )}, ${Math.round(255 * healthPercentage)}, 0)`;

  // Color del DOT:
  //  - Team seleccionado: usamos playerColors / color "normal"
  //  - Otro team: azul básico
  let dotColor;
  if (resolvedIsOtherTeam) {
    dotColor = "#3b82f6"; // azul para el team "no seleccionado"
  } else {
    dotColor = playerColors[playerData.m_color] || "#ff1493";
  }

  // Nombre (de momento, como lo tenías: global según toggles)
  const showName = settings.showEnemyNames || settings.showAllNames;

  return (
    <div
      className={`absolute origin-center rounded-[100%] left-0 top-0`}
      ref={playerRef}
      style={{
        width: `${scaledSize}vw`,
        height: `${scaledSize}vw`,
        // 👇 sin transición: posición instantánea
        transform: `translate(${radarImageTranslation.x}px, ${radarImageTranslation.y}px)`,
        zIndex: `${(playerData.m_is_dead && `0`) || `1`}`,
        WebkitMask: `${(playerData.m_is_dead &&
            `url('./assets/icons/icon-enemy-death_png.png') no-repeat center / contain`) ||
          `none`
          }`,
      }}
    >
      {/* Health circle SOLO para el team seleccionado, si está vivo */}
      {resolvedShowHealthCircle && !playerData.m_is_dead && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: `${scaledSize * 1.6}vw`,
            height: `${scaledSize * 1.6}vw`,
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            border: `4px solid ${healthColor}`,
            boxShadow: `0 0 8px ${healthColor}, 0 0 0 1px rgba(0, 0, 0, 0.8)`,
          }}
        />
      )}

      {/* Nombre arriba del dot */}
      {showName && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 -translate-y-1 text-center">
          <span className="text-xs text-white whitespace-nowrap max-w-[80px] inline-block overflow-hidden text-ellipsis">
            {playerData.m_name}
          </span>
        </div>
      )}

      {/* Contenedor que rota al jugador */}
      <div
        style={{
          transform: `rotate(${(playerData.m_is_dead && `0`) || playerRotation
            }deg)`,
          width: `${scaledSize}vw`,
          height: `${scaledSize}vw`,
          opacity: `${(playerData.m_is_dead && `0.8`) ||
            (invalidPosition && `0`) ||
            `1`
            }`,
        }}
      >
        {/* Player dot */}
        <div
          className={`w-full h-full rounded-[50%_50%_50%_0%] rotate-[315deg]`}
          style={{
            backgroundColor: dotColor,
            opacity: `${(playerData.m_is_dead && `0.8`) ||
              (invalidPosition && `0`) ||
              `1`
              }`,
          }}
        />

        {/* View cone */}
        {settings.showViewCones && !playerData.m_is_dead && (
          <div
            className="absolute left-1/2 top-1/2 w-[1.5vw] h-[3vw] bg-white opacity-30"
            style={{
              transform: `translate(-50%, -100%)`,
              clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Player;
