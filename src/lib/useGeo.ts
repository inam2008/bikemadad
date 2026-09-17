import { useEffect, useState } from "react";

export type Coords = { lat: number; lng: number };

/** Watches the device GPS position. `watch: false` takes a single reading. */
export function useGeo(watch = true) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("This device can't share its location.");
      return;
    }

    const onOk = (pos: GeolocationPosition) =>
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    const onErr = (err: GeolocationPositionError) =>
      setError(
        err.code === err.PERMISSION_DENIED
          ? "Location is blocked. Allow it so a mechanic can find you."
          : "Couldn't get your location yet.",
      );
    const options: PositionOptions = { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 };

    if (!watch) {
      navigator.geolocation.getCurrentPosition(onOk, onErr, options);
      return;
    }

    const id = navigator.geolocation.watchPosition(onOk, onErr, options);
    return () => navigator.geolocation.clearWatch(id);
  }, [watch]);

  return { coords, error };
}
