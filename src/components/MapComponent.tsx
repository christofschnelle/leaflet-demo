import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icon
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons for traffic points
const trafficSignalIcon = L.divIcon({
  html: '<div style="background: #ff9800; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
  className: '',
  iconSize: [20, 20],
});

const stopSignIcon = L.divIcon({
  html: '<div style="background: #f44336; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
  className: '',
  iconSize: [20, 20],
});

const crossingIcon = L.divIcon({
  html: '<div style="background: #2196F3; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
  className: '',
  iconSize: [20, 20],
});

const parkingIcon = L.divIcon({
  html: '<div style="background: #4CAF50; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
  className: '',
  iconSize: [20, 20],
});

const getTrafficIcon = (type: string) => {
  switch (type) {
    case 'traffic_signals':
      return trafficSignalIcon;
    case 'stop':
      return stopSignIcon;
    case 'crossing':
      return crossingIcon;
    case 'parking':
      return parkingIcon;
    default:
      return trafficSignalIcon;
  }
};

interface ClickablePoint {
  lat: number;
  lng: number;
}

function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (point: ClickablePoint) => void;
}) {
  useMapEvents({
    click: (e) => {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function LocationMarker({
  position,
  setPosition,
}: {
  position: [number, number] | null;
  setPosition: (position: [number, number]) => void;
}) {
  const map = useMap();

  useEffect(() => {
    map.locate().on("locationfound", (e) => {
      const newPosition: [number, number] = [e.latlng.lat, e.latlng.lng];
      setPosition(newPosition);
      map.flyTo(newPosition, 15);
    });
  }, [map, setPosition]);

  return position === null ? null : (
    <Marker position={position}>
      <Popup>Sie sind hier</Popup>
    </Marker>
  );
}

interface WeatherData {
  temperature: number;
  windSpeed: number;
  weatherCode: number;
}

interface TrafficPoint {
  id: number;
  lat: number;
  lon: number;
  type: string;
  name?: string;
}

export default function MapComponent() {
  const defaultCenter: [number, number] = [51.505, -0.09];
  const [userPosition, setUserPosition] = useState<[number, number] | null>(
    null
  );
  const [clickedPoints, setClickedPoints] = useState<ClickablePoint[]>([]);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [showWeather, setShowWeather] = useState(true);
  const [trafficPoints, setTrafficPoints] = useState<TrafficPoint[]>([]);
  const [showTraffic, setShowTraffic] = useState(true);

  const handleMapClick = (point: ClickablePoint) => {
    setClickedPoints((prev) => [...prev, point]);
  };

  const clearPoints = () => {
    setClickedPoints([]);
  };

  const toggleWeather = () => {
    setShowWeather((prev) => !prev);
  };

  const toggleTraffic = () => {
    setShowTraffic((prev) => !prev);
  };

  useEffect(() => {
    const fetchWeather = async (lat: number, lng: number) => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m,weather_code`
        );
        const data = await response.json();
        setWeatherData({
          temperature: data.current.temperature_2m,
          windSpeed: data.current.wind_speed_10m,
          weatherCode: data.current.weather_code,
        });
      } catch (error) {
        console.error("Failed to fetch weather data:", error);
      }
    };

    if (userPosition) {
      fetchWeather(userPosition[0], userPosition[1]);
    }
  }, [userPosition]);

  useEffect(() => {
    const fetchTrafficData = async (lat: number, lng: number) => {
      try {
        const radius = 1000; // 1km radius
        const overpassQuery = `
          [out:json];
          (
            node["highway"="traffic_signals"](around:${radius},${lat},${lng});
            node["highway"="stop"](around:${radius},${lat},${lng});
            node["highway"="crossing"](around:${radius},${lat},${lng});
            node["amenity"="parking"](around:${radius},${lat},${lng});
          );
          out body;
        `;

        const response = await fetch(
          "https://overpass-api.de/api/interpreter",
          {
            method: "POST",
            body: overpassQuery,
          }
        );
        const data = await response.json();

        const points: TrafficPoint[] = data.elements.map((element: any) => ({
          id: element.id,
          lat: element.lat,
          lon: element.lon,
          type: element.tags?.highway || element.tags?.amenity || "unknown",
          name: element.tags?.name,
        }));

        setTrafficPoints(points);
      } catch (error) {
        console.error("Failed to fetch traffic data:", error);
      }
    };

    if (userPosition && showTraffic) {
      fetchTrafficData(userPosition[0], userPosition[1]);
    }
  }, [userPosition, showTraffic]);

  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      <div
        style={{
          width: "60%",
          height: "60vh",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
          position: "relative",
        }}
      >
        {/* Control Panel */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            zIndex: 1000,
            background: "white",
            padding: "15px",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            minWidth: "200px",
          }}
        >
          <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>
            Kartensteuerung
          </h3>

          <div style={{ marginBottom: "10px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={showWeather}
                onChange={toggleWeather}
                style={{ marginRight: "8px", cursor: "pointer" }}
              />
              Wetterdaten anzeigen
            </label>
          </div>

          {showWeather && weatherData && (
            <div
              style={{
                marginBottom: "10px",
                padding: "10px",
                background: "#f0f0f0",
                borderRadius: "6px",
                fontSize: "13px",
              }}
            >
              <div>
                <strong>Temperatur:</strong> {weatherData.temperature}°C
              </div>
              <div>
                <strong>Windgeschwindigkeit:</strong> {weatherData.windSpeed} km/h
              </div>
            </div>
          )}

          <div style={{ marginBottom: "10px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={showTraffic}
                onChange={toggleTraffic}
                style={{ marginRight: "8px", cursor: "pointer" }}
              />
              Verkehrspunkte anzeigen
            </label>
          </div>

          {showTraffic && trafficPoints.length > 0 && (
            <div
              style={{
                marginBottom: "10px",
                padding: "10px",
                background: "#f0f0f0",
                borderRadius: "6px",
                fontSize: "13px",
              }}
            >
              <div>
                <strong>Verkehrspunkte:</strong> {trafficPoints.length}
              </div>
              <div style={{ fontSize: "11px", marginTop: "5px", color: "#666" }}>
                <div>🟠 Ampeln</div>
                <div>🔴 Stoppschilder</div>
                <div>🔵 Übergänge</div>
                <div>🟢 Parkplätze</div>
              </div>
            </div>
          )}

          <button
            onClick={clearPoints}
            disabled={clickedPoints.length === 0}
            style={{
              width: "100%",
              padding: "8px",
              cursor: clickedPoints.length > 0 ? "pointer" : "not-allowed",
              background: clickedPoints.length > 0 ? "#2196F3" : "#ccc",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
            }}
          >
            Punkte löschen ({clickedPoints.length})
          </button>

          <p
            style={{
              fontSize: "12px",
              marginTop: "10px",
              color: "#666",
              marginBottom: 0,
            }}
          >
            Klicken Sie auf die Karte, um Punkte hinzuzufügen!
          </p>
        </div>

        <MapContainer
          center={userPosition || defaultCenter}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* User location marker */}
          <LocationMarker
            position={userPosition}
            setPosition={setUserPosition}
          />

          {/* User-clicked points */}
          {clickedPoints.map((point, index) => (
            <Marker key={index} position={[point.lat, point.lng]}>
              <Popup>
                Punkt {index + 1}
                <br />
                Breitengrad: {point.lat.toFixed(5)}
                <br />
                Längengrad: {point.lng.toFixed(5)}
              </Popup>
            </Marker>
          ))}

          {/* Connect clicked points with lines */}
          {clickedPoints.length > 1 && (
            <Polyline
              positions={clickedPoints.map((p) => [p.lat, p.lng])}
              pathOptions={{ color: "#FF5722", weight: 3 }}
            />
          )}

          {/* Traffic points */}
          {showTraffic &&
            trafficPoints.map((point) => (
              <Marker
                key={point.id}
                position={[point.lat, point.lon]}
                icon={getTrafficIcon(point.type)}
              >
                <Popup>
                  <strong>
                    {point.type === 'traffic_signals' && 'AMPEL'}
                    {point.type === 'stop' && 'STOPPSCHILD'}
                    {point.type === 'crossing' && 'ÜBERGANG'}
                    {point.type === 'parking' && 'PARKPLATZ'}
                    {!['traffic_signals', 'stop', 'crossing', 'parking'].includes(point.type) &&
                      point.type.replace('_', ' ').toUpperCase()}
                  </strong>
                  {point.name && (
                    <>
                      <br />
                      {point.name}
                    </>
                  )}
                  <br />
                  Breitengrad: {point.lat.toFixed(5)}
                  <br />
                  Längengrad: {point.lon.toFixed(5)}
                </Popup>
              </Marker>
            ))}

          <MapClickHandler onMapClick={handleMapClick} />
        </MapContainer>
      </div>
    </div>
  );
}
