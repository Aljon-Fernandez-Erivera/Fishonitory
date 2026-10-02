import { useEffect, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import markerIconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [12.8797, 121.774];

const locationMarkerIcon = L.icon({
  iconRetinaUrl: markerIconRetinaUrl,
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapClickHandler({ onSelect, disabled }) {
  useMapEvents({
    click(event) {
      if (!disabled) {
        onSelect({
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
        });
      }
    },
  });

  return null;
}

function CenterMapOnLocation({ location }) {
  const map = useMap();

  useEffect(() => {
    if (location) {
      map.flyTo([location.latitude, location.longitude], Math.max(map.getZoom(), 16));
    }
  }, [location, map]);

  return null;
}

function RefreshMapSize({ isOpen }) {
  const map = useMap();

  useEffect(() => {
    if (!isOpen) return undefined;

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        map.invalidateSize({ pan: false });
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [isOpen, map]);

  return null;
}

function formatAddress(address) {
  const street = [address.house_number, address.road]
    .filter(Boolean)
    .join(" ");
  const barangay =
    address.neighbourhood ||
    address.suburb ||
    address.city_district ||
    address.quarter ||
    address.hamlet;
  const locality =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county;

  return [
    street,
    barangay,
    locality,
    address.state_district,
    address.state || address.region,
    address.postcode,
    address.country,
  ]
    .filter(Boolean)
    .filter((part, index, parts) => parts.indexOf(part) === index)
    .join(", ")
    .slice(0, 255);
}

function BusinessLocationPicker({
  value,
  onChange,
  onConfirm,
  isOpen,
  disabled = false,
  mapClassName = "h-64",
}) {
  const [locating, setLocating] = useState(false);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [locationError, setLocationError] = useState("");

  const selectLocation = (location) => {
    onChange(location);
    setLocationError("");
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Location is unavailable in this browser.");
      return;
    }

    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        selectLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setLocating(false);
      },
      () => {
        setLocationError(
          "Could not get your location. Allow location access or select a point on the map.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const confirmLocation = async () => {
    if (!value) return;

    setResolvingAddress(true);
    setLocationError("");

    try {
      const query = new URLSearchParams({
        format: "jsonv2",
        addressdetails: "1",
        zoom: "18",
        lat: String(value.latitude),
        lon: String(value.longitude),
      });
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?${query.toString()}`,
        {
          headers: {
            Accept: "application/json",
            "Accept-Language": "en",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Address lookup failed.");
      }

      const result = await response.json();
      const address = formatAddress(result.address || {}) || result.display_name;

      if (!address) {
        throw new Error("No address details were found for this pin.");
      }

      onConfirm({ ...value, address: address.slice(0, 255) });
    } catch {
      setLocationError(
        "Could not find an address for this pin. Try another point or enter the address manually.",
      );
    } finally {
      setResolvingAddress(false);
    }
  };

  const markerPosition = value ? [value.latitude, value.longitude] : null;

  return (
    <div className="mt-3 rounded-xl border border-sky-100/10 bg-[#001523] p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 font-['Poppins'] text-xs text-[#a9c8cf]">
          Click the map to place the pin. Drag it to adjust.
        </p>
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={disabled || locating}
          className="rounded-lg border border-[#73c4ca]/30 bg-[#73c4ca]/10 px-3 py-2 font-['Poppins'] text-xs font-medium text-[#bce9e9] transition hover:bg-[#73c4ca]/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {locating ? "Finding location..." : "Use my location"}
        </button>
      </div>

      <MapContainer
        center={markerPosition || DEFAULT_CENTER}
        zoom={markerPosition ? 16 : 5}
        scrollWheelZoom={!disabled}
        dragging={!disabled}
        className={`${mapClassName} w-full rounded-lg`}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onSelect={selectLocation} disabled={disabled} />
        <CenterMapOnLocation location={value} />
        <RefreshMapSize isOpen={isOpen} />
        {value && (
          <Marker
            position={markerPosition}
            icon={locationMarkerIcon}
            draggable={!disabled}
            eventHandlers={{
              dragend(event) {
                const point = event.target.getLatLng();
                selectLocation({ latitude: point.lat, longitude: point.lng });
              },
            }}
          />
        )}
      </MapContainer>

      <p aria-live="polite" className="mb-0 mt-2 font-['Poppins'] text-xs text-[#91b5bf]">
        {value
          ? `Pinned: ${value.latitude.toFixed(6)}, ${value.longitude.toFixed(6)}`
          : "No location selected yet."}
      </p>
      {locationError && (
        <p role="alert" className="mb-0 mt-1 font-['Poppins'] text-xs text-[#ffd1d1]">
          {locationError}
        </p>
      )}
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={confirmLocation}
          disabled={disabled || resolvingAddress || !value}
          className="rounded-lg bg-[#75bec4] px-4 py-2.5 font-['Poppins'] text-sm font-semibold text-[#052d45] transition hover:bg-[#91d2d5] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {resolvingAddress ? "Finding address..." : "Select this location"}
        </button>
      </div>
    </div>
  );
}

export default BusinessLocationPicker;