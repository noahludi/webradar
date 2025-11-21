import { useRef } from "react";
import { getRadarPosition, teamEnum } from "../utilities/utilities";

const Bomb = ({ bombData, mapData, radarImage, localTeam, averageLatency, settings }) => {
  const radarPosition = getRadarPosition(mapData, bombData);

  const bombRef = useRef();
  const bombBounding = (bombRef.current &&
    bombRef.current.getBoundingClientRect()) || { width: 0, height: 0 };

  const radarImageBounding = (radarImage !== undefined &&
    { width: radarImage.clientWidth, height: radarImage.clientHeight }) || { width: 0, height: 0 };
  const radarImageTranslation = {
    x: radarImageBounding.width * radarPosition.x - bombBounding.width * 0.5,
    y: radarImageBounding.height * radarPosition.y - bombBounding.height * 0.5,
  };

  // Calculate bomb size based on settings
  const baseSize = 1.5; // Base size in vw
  const scaledSize = baseSize * settings.bombSize;

  const isPlanted = bombData.m_blow_time > 0;
  const timeRemaining = bombData.m_blow_time;

  return (
    <div
      className={`absolute left-0 top-0`}
      style={{
        transform: `translate(${radarImageTranslation.x}px, ${radarImageTranslation.y}px)`,
        transition: `transform ${averageLatency}ms linear`,
      }}
    >
      {/* Pulsing glow effect when planted */}
      {isPlanted && !bombData.m_is_defused && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: `${scaledSize * 2.5}vw`,
            height: `${scaledSize * 2.5}vw`,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(255, 0, 0, 0.6) 0%, transparent 70%)',
            animation: 'bombPulse 1s ease-in-out infinite',
            zIndex: 0,
          }}
        />
      )}

      {/* Bomb icon */}
      <div
        className={`absolute origin-center rounded-[100%]`}
        ref={bombRef}
        style={{
          width: `${scaledSize}vw`,
          height: `${scaledSize}vw`,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: `${(bombData.m_is_defused && `#50904c`) ||
            (localTeam == teamEnum.counterTerrorist && `#6492b4`) ||
            `#c90b0b`
            }`,
          WebkitMask: `url('./assets/icons/c4_sml.png') no-repeat center / contain`,
          opacity: `1`,
          zIndex: `1`,
          filter: isPlanted && !bombData.m_is_defused ? 'drop-shadow(0 0 8px rgba(255, 0, 0, 0.8))' : 'none',
        }}
      />

      {/* Timer countdown */}
      {isPlanted && !bombData.m_is_defused && (
        <div
          className="absolute font-bold text-center pointer-events-none"
          style={{
            left: '50%',
            top: `${scaledSize * 0.5 + 0.8}vw`,
            transform: 'translateX(-50%)',
            fontSize: '0.75rem',
            color: timeRemaining <= 5 ? '#ff0000' : timeRemaining <= 10 ? '#ffff00' : '#ffffff',
            textShadow: `0 0 4px rgba(0, 0, 0, 0.8), 0 0 8px ${timeRemaining <= 5 ? 'rgba(255, 0, 0, 0.8)' :
                timeRemaining <= 10 ? 'rgba(255, 255, 0, 0.6)' :
                  'rgba(255, 0, 0, 0.6)'
              }`,
            zIndex: 2,
            whiteSpace: 'nowrap',
            transition: 'color 0.3s ease, text-shadow 0.3s ease',
          }}
        >
          {timeRemaining.toFixed(1)}s
        </div>
      )}

      <style jsx>{`
        @keyframes bombPulse {
          0%, 100% {
            opacity: 0.4;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.8;
            transform: translate(-50%, -50%) scale(1.1);
          }
        }
      `}</style>
    </div>
  );
};

export default Bomb;