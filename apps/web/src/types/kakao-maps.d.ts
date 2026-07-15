// 설치형 패키지 없이 사용하는 카카오 지도 Web SDK의 최소 타입이다.
export {};

declare global {
  namespace kakao.maps {
    class LatLng {
      constructor(latitude: number, longitude: number);
      getLat(): number;
      getLng(): number;
    }

    class LatLngBounds {
      constructor();
      extend(position: LatLng): void;
      getSouthWest(): LatLng;
      getNorthEast(): LatLng;
    }

    type MapOptions = {
      center: LatLng;
      level?: number;
    };

    class Map {
      constructor(container: HTMLElement, options: MapOptions);
      getBounds(): LatLngBounds;
      getCenter(): LatLng;
      panTo(position: LatLng): void;
      relayout(): void;
      setCenter(position: LatLng): void;
      setLevel(level: number): void;
    }

    type MarkerOptions = {
      map?: Map;
      position: LatLng;
      title?: string;
      zIndex?: number;
    };

    class Marker {
      constructor(options: MarkerOptions);
      setMap(map: Map | null): void;
      setZIndex(zIndex: number): void;
    }

    type CustomOverlayOptions = {
      content: HTMLElement | string;
      map?: Map;
      position: LatLng;
      xAnchor?: number;
      yAnchor?: number;
      zIndex?: number;
    };

    class CustomOverlay {
      constructor(options: CustomOverlayOptions);
      setMap(map: Map | null): void;
      setPosition(position: LatLng): void;
    }

    function load(callback: () => void): void;

    namespace event {
      function addListener(target: object, eventName: string, handler: () => void): void;
      function removeListener(target: object, eventName: string, handler: () => void): void;
    }

    namespace services {
      const Status: {
        OK: string;
        ZERO_RESULT: string;
        ERROR: string;
      };

      type AddressSearchResult = {
        x: string;
        y: string;
      };

      class Geocoder {
        addressSearch(
          address: string,
          callback: (result: AddressSearchResult[], status: string) => void,
        ): void;
      }
    }
  }

  interface Window {
    kakao?: {
      maps: typeof kakao.maps;
    };
  }
}
