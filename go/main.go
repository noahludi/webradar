package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	demoinfocs "github.com/markus-wa/demoinfocs-golang/v5/pkg/demoinfocs"
	"github.com/markus-wa/demoinfocs-golang/v5/pkg/demoinfocs/common"
)

// ========================
// CONFIG
// ========================

// Carpeta donde CS2 guarda los .dem
const demoDir = `C:\Program Files (x86)\Steam\steamapps\common\Counter-Strike Global Offensive\game\csgo`

// WebSocket de tu server Node
const wsURL = "ws://127.0.0.1:8080"

// ========================
// TIPOS PARA EL RADAR
// ========================

type PlayerJSON struct {
	Name          string  `json:"name"`
	SteamID       uint64  `json:"steamid"`
	TeamNum       int     `json:"team_num"`
	IsAlive       bool    `json:"is_alive"`
	Health        int     `json:"health"`
	ArmorValue    int     `json:"armor_value"`
	HasHelmet     bool    `json:"has_helmet"`
	HasDefuser    bool    `json:"has_defuser"`
	IsDefusing    bool    `json:"is_defusing"`
	Ducked        bool    `json:"ducked"`
	Balance       int     `json:"balance"`
	PlayerColor   string  `json:"player_color"`
	LastPlaceName string  `json:"last_place_name"`
	X             float64 `json:"X"`
	Y             float64 `json:"Y"`
	Z             float64 `json:"Z"`
}

type FrameJSON struct {
	Demo    string       `json:"demo"`
	Tick    int          `json:"tick"`
	Players []PlayerJSON `json:"players"`
}

// ========================
// READER "TAIL" PARA DEMO
// ========================

// tailReader envuelve un *os.File pero NUNCA devuelve io.EOF,
// se queda esperando a que el archivo crezca.
type tailReader struct {
	f    *os.File
	path string
}

func newTailReader(path string) (*tailReader, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	return &tailReader{
		f:    f,
		path: path,
	}, nil
}

func (tr *tailReader) Read(p []byte) (int, error) {
	for {
		n, err := tr.f.Read(p)
		if err == nil {
			// Leyó datos, se los damos al parser
			return n, nil
		}

		if errors.Is(err, io.EOF) {
			// No hay más bytes *por ahora* -> esperamos y volvemos a intentar
			time.Sleep(10 * time.Millisecond)
			continue
		}

		// Algún error real del sistema de archivos
		return n, err
	}
}

func (tr *tailReader) Close() error {
	return tr.f.Close()
}

// ========================
// HELPERS
// ========================

// Espera que aparezca un .dem NUEVO en demoDir
func waitForNewDemoFile() (string, error) {
	log.Printf("[CONFIG] Carpeta de demos: %s\n", demoDir)
	log.Printf("[CONFIG] WebSocket: %s\n", wsURL)

	start := time.Now()
	log.Printf("[WAIT] Esperando que aparezca un .dem nuevo en '%s' (después de %s)...",
		demoDir, start.Format(time.RFC3339))

	for {
		entries, err := os.ReadDir(demoDir)
		if err != nil {
			log.Printf("[WAIT] Error leyendo carpeta de demos: %v", err)
			time.Sleep(2 * time.Second)
			continue
		}

		var newestPath string
		var newestTime time.Time

		for _, e := range entries {
			if e.IsDir() {
				continue
			}
			if filepath.Ext(e.Name()) != ".dem" {
				continue
			}

			full := filepath.Join(demoDir, e.Name())
			info, err := os.Stat(full)
			if err != nil {
				continue
			}

			// Solo demos creados DESPUÉS de que arrancamos este programa
			if info.ModTime().After(start) && info.ModTime().After(newestTime) {
				newestTime = info.ModTime()
				newestPath = full
			}
		}

		if newestPath != "" {
			log.Printf("[WAIT] Demo nuevo detectado: %s (mtime=%s)", newestPath, newestTime.Format(time.RFC3339))
			log.Printf("[WAIT] Esperando 1s antes de empezar a parsear...")
			time.Sleep(1 * time.Second)
			return newestPath, nil
		}

		time.Sleep(1 * time.Second)
	}
}

func connectWS() *websocket.Conn {
	for {
		c, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
		if err != nil {
			log.Printf("[WS] No se pudo conectar a %s: %v. Reintentando en 5s...", wsURL, err)
			time.Sleep(5 * time.Second)
			continue
		}
		log.Printf("[WS] Conectado a %s\n", wsURL)
		return c
	}
}

// ========================
// STREAMING DEL DEMO
// ========================

func streamDemoToWS(demoPath string, c *websocket.Conn) error {
	log.Printf("[DEMO] Empezando a parsear en streaming: %s", demoPath)

	tr, err := newTailReader(demoPath)
	if err != nil {
		return fmt.Errorf("newTailReader: %w", err)
	}
	defer tr.Close()

	parser := demoinfocs.NewParser(tr)
	defer parser.Close()

	gs := parser.GameState()

	// ---- NUEVO: buffer con el ÚLTIMO payload + goroutine que manda cada X ms ----
	var (
		mu            sync.Mutex
		latestPayload []byte
	)

	done := make(chan struct{})

	// Goroutine que SOLO envía cada 50ms el último snapshot disponible
	go func() {
		ticker := time.NewTicker(50 * time.Millisecond) // ~20 FPS
		defer ticker.Stop()

		for {
			select {
			case <-done:
				return
			case <-ticker.C:
				mu.Lock()
				payload := latestPayload
				mu.Unlock()

				if payload == nil {
					continue
				}

				// mismo esquema de reconexión que tenías antes
				for {
					_ = c.SetWriteDeadline(time.Now().Add(100 * time.Millisecond))
					err := c.WriteMessage(websocket.TextMessage, payload)
					if err != nil {
						log.Printf("[WS] Error enviando frame: %v. Reintentando conexión...", err)
						_ = c.Close()
						c = connectWS()
						continue
					}
					break
				}
			}
		}
	}()

	// Opcional: log para ver cuántos frames PARSEAMOS por segundo
	var framesParsed int
	lastLog := time.Now()

	// Loop de parseo: actualiza SIEMPRE el último snapshot, pero NO envía
	for {
		more, err := parser.ParseNextFrame()
		if err != nil {
			log.Printf("[DEMO] Error al parsear frame: %v", err)
			close(done)
			return err
		}
		if !more {
			log.Println("[DEMO] ParseNextFrame() devolvió more=false. Fin del demo.")
			close(done)
			return nil
		}

		// Construimos el snapshot de jugadores
		participants := gs.Participants().Playing()
		players := make([]PlayerJSON, 0, len(participants))

		for _, pl := range participants {
			if pl == nil {
				continue
			}

			teamNum := 0
			switch pl.Team {
			case common.TeamTerrorists:
				teamNum = 2
			case common.TeamCounterTerrorists:
				teamNum = 3
			default:
				teamNum = 0
			}

			pos := pl.Position()

			pj := PlayerJSON{
				Name:          pl.Name,
				SteamID:       pl.SteamID64,
				TeamNum:       teamNum,
				IsAlive:       pl.IsAlive(),
				Health:        pl.Health(),
				ArmorValue:    pl.Armor(),
				HasHelmet:     pl.HasHelmet(),
				HasDefuser:    pl.HasDefuseKit(),
				IsDefusing:    false,
				Ducked:        false,
				Balance:       0,
				PlayerColor:   "",
				LastPlaceName: "",
				X:             float64(pos.X),
				Y:             float64(pos.Y),
				Z:             float64(pos.Z),
			}
			players = append(players, pj)
		}

		frame := FrameJSON{
			Demo:    demoPath,
			Tick:    gs.IngameTick(),
			Players: players,
		}

		b, err := json.Marshal(frame)
		if err != nil {
			log.Printf("[JSON] Error serializando frame: %v", err)
			continue
		}

		// En vez de mandarlo, sólo guardamos el último
		mu.Lock()
		latestPayload = b
		mu.Unlock()

		framesParsed++
		now := time.Now()
		if now.Sub(lastLog) >= time.Second {
			log.Printf("[DEMO] Frames parseados en el último segundo: %d (tick actual %d)", framesParsed, gs.IngameTick())
			framesParsed = 0
			lastLog = now
		}

		// ya no hace falta el sleep de 5ms, el tailReader bloquea cuando no hay datos
	}
}

// ========================
// MAIN
// ========================

func main() {
	log.SetFlags(log.LstdFlags | log.Lmicroseconds)

	demoPath, err := waitForNewDemoFile()
	if err != nil {
		log.Fatalf("[FATAL] Error esperando demo: %v", err)
	}

	c := connectWS()
	defer c.Close()

	if err := streamDemoToWS(demoPath, c); err != nil {
		log.Printf("[FIN] streamDemoToWS terminó con error: %v", err)
	} else {
		log.Println("[FIN] Demo procesado correctamente.")
	}

	fmt.Println("[FIN] Bye.")
}
