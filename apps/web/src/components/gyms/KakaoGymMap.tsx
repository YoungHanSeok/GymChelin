"use client";

// 검색된 업체와 현재 위치를 지도에 표시하고 지도 영역 변경을 상위 화면에 전달한다.
import { useEffect, useRef, useState } from "react";
import { loadKakaoMapSdk } from "@/lib/kakao-map-loader";
import type { GymMapPoint, GymMapViewport, GymPlaceLive } from "@/lib/gym-types";

type CenterRequest = GymMapPoint & {
  requestId: number;
};

type KakaoGymMapProps = {
  places: GymPlaceLive[];
  selectedPlaceId: string | null;
  centerRequest: CenterRequest | null;
  currentLocation: GymMapPoint | null;
  onSelectPlace: (place: GymPlaceLive) => void;
  onViewportIdle: (viewport: GymMapViewport, userMoved: boolean) => void;
};

type MarkerEntry = {
  providerPlaceId: string;
  marker: kakao.maps.Marker;
};

const defaultCenter = {
  latitude: 37.5665,
  longitude: 126.978,
};

const getViewport = (map: kakao.maps.Map): GymMapViewport => {
  const center = map.getCenter();
  const bounds = map.getBounds();
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();

  return {
    latitude: center.getLat(),
    longitude: center.getLng(),
    rect: [
      southWest.getLng(),
      southWest.getLat(),
      northEast.getLng(),
      northEast.getLat(),
    ].join(","),
  };
};

export default function KakaoGymMap({
  places,
  selectedPlaceId,
  centerRequest,
  currentLocation,
  onSelectPlace,
  onViewportIdle,
}: KakaoGymMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<kakao.maps.Map | null>(null);
  const markersRef = useRef<MarkerEntry[]>([]);
  const currentLocationOverlayRef = useRef<kakao.maps.CustomOverlay | null>(null);
  const userMovedRef = useRef(false);
  const onSelectPlaceRef = useRef(onSelectPlace);
  const onViewportIdleRef = useRef(onViewportIdle);
  const [isLoading, setIsLoading] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    onSelectPlaceRef.current = onSelectPlace;
  }, [onSelectPlace]);

  useEffect(() => {
    onViewportIdleRef.current = onViewportIdle;
  }, [onViewportIdle]);

  useEffect(() => {
    let isDisposed = false;
    let resizeObserver: ResizeObserver | null = null;
    let idleHandler: (() => void) | null = null;
    let dragEndHandler: (() => void) | null = null;
    let zoomChangedHandler: (() => void) | null = null;

    const initializeMap = async () => {
      try {
        const maps = await loadKakaoMapSdk();

        if (isDisposed || !containerRef.current) {
          return;
        }

        const map = new maps.Map(containerRef.current, {
          center: new maps.LatLng(defaultCenter.latitude, defaultCenter.longitude),
          level: 5,
        });
        mapRef.current = map;

        dragEndHandler = () => {
          userMovedRef.current = true;
        };
        zoomChangedHandler = () => {
          userMovedRef.current = true;
        };
        idleHandler = () => {
          onViewportIdleRef.current(getViewport(map), userMovedRef.current);
          userMovedRef.current = false;
        };

        maps.event.addListener(map, "dragend", dragEndHandler);
        maps.event.addListener(map, "zoom_changed", zoomChangedHandler);
        maps.event.addListener(map, "idle", idleHandler);

        resizeObserver = new ResizeObserver(() => map.relayout());
        resizeObserver.observe(containerRef.current);

        setErrorMessage(null);
        setIsLoading(false);
        setIsMapReady(true);
        onViewportIdleRef.current(getViewport(map), false);
      } catch (error) {
        if (!isDisposed) {
          setErrorMessage(error instanceof Error ? error.message : "카카오 지도를 불러오지 못했습니다.");
          setIsLoading(false);
        }
      }
    };

    void initializeMap();

    return () => {
      isDisposed = true;
      resizeObserver?.disconnect();
      markersRef.current.forEach(({ marker }) => marker.setMap(null));
      markersRef.current = [];
      currentLocationOverlayRef.current?.setMap(null);
      currentLocationOverlayRef.current = null;

      const maps = window.kakao?.maps;
      const map = mapRef.current;
      if (maps && map) {
        if (idleHandler) maps.event.removeListener(map, "idle", idleHandler);
        if (dragEndHandler) maps.event.removeListener(map, "dragend", dragEndHandler);
        if (zoomChangedHandler) maps.event.removeListener(map, "zoom_changed", zoomChangedHandler);
      }
      mapRef.current = null;
      setIsMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const maps = window.kakao?.maps;

    if (!map || !maps || !isMapReady || !centerRequest) {
      return;
    }

    map.setCenter(new maps.LatLng(centerRequest.latitude, centerRequest.longitude));
  }, [centerRequest, isMapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const maps = window.kakao?.maps;

    if (!map || !maps || !isMapReady) {
      return;
    }

    markersRef.current.forEach(({ marker }) => marker.setMap(null));
    markersRef.current = places.map((place) => {
      const marker = new maps.Marker({
        map,
        position: new maps.LatLng(place.latitude, place.longitude),
        title: place.name,
        zIndex: place.providerPlaceId === selectedPlaceId ? 10 : 1,
      });

      maps.event.addListener(marker, "click", () => onSelectPlaceRef.current(place));

      return {
        providerPlaceId: place.providerPlaceId,
        marker,
      };
    });
  }, [isMapReady, places, selectedPlaceId]);

  useEffect(() => {
    markersRef.current.forEach(({ providerPlaceId, marker }) => {
      marker.setZIndex(providerPlaceId === selectedPlaceId ? 10 : 1);
    });
  }, [selectedPlaceId]);

  useEffect(() => {
    const map = mapRef.current;
    const maps = window.kakao?.maps;

    if (!map || !maps || !isMapReady) {
      return;
    }

    currentLocationOverlayRef.current?.setMap(null);
    currentLocationOverlayRef.current = null;

    if (!currentLocation) {
      return;
    }

    const markerElement = document.createElement("span");
    markerElement.className = "block h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow-lg";
    markerElement.setAttribute("aria-label", "현재 위치");

    currentLocationOverlayRef.current = new maps.CustomOverlay({
      map,
      position: new maps.LatLng(currentLocation.latitude, currentLocation.longitude),
      content: markerElement,
      xAnchor: 0.5,
      yAnchor: 0.5,
      zIndex: 20,
    });
  }, [currentLocation, isMapReady]);

  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
      <div
        ref={containerRef}
        role="region"
        aria-label="헬스장 검색 지도"
        className="h-[420px] w-full sm:h-[500px]"
      />
      {isLoading && (
        <div role="status" className="absolute inset-0 flex items-center justify-center bg-white/90 text-sm text-slate-600">
          지도를 불러오는 중입니다.
        </div>
      )}
      {errorMessage && (
        <div role="alert" className="absolute inset-0 flex items-center justify-center bg-white/95 p-6 text-center text-sm text-red-700">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
