// 카카오 지도 SDK를 브라우저에서 한 번만 비동기로 불러온다.
type KakaoMapsApi = NonNullable<Window["kakao"]>["maps"];

const scriptId = "kakao-map-sdk";
let sdkPromise: Promise<KakaoMapsApi> | null = null;

const resolveLoadedSdk = (resolve: (maps: KakaoMapsApi) => void, reject: (reason: Error) => void) => {
  const maps = window.kakao?.maps;

  if (!maps) {
    reject(new Error("카카오 지도 SDK를 초기화하지 못했습니다."));
    return;
  }

  maps.load(() => resolve(maps));
};

export const loadKakaoMapSdk = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("카카오 지도는 브라우저에서만 사용할 수 있습니다."));
  }

  if (sdkPromise) {
    return sdkPromise;
  }

  sdkPromise = new Promise<KakaoMapsApi>((resolve, reject) => {
    const javaScriptKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY?.trim();

    if (!javaScriptKey) {
      reject(new Error("카카오 지도 JavaScript 키가 설정되지 않았습니다."));
      return;
    }

    if (window.kakao?.maps) {
      resolveLoadedSdk(resolve, reject);
      return;
    }

    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    const script = existingScript ?? document.createElement("script");

    const handleLoad = () => resolveLoadedSdk(resolve, reject);
    const handleError = () => reject(new Error("카카오 지도 SDK를 불러오지 못했습니다."));

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });

    if (!existingScript) {
      script.id = scriptId;
      script.async = true;
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(javaScriptKey)}&autoload=false&libraries=services`;
      document.head.appendChild(script);
    }
  }).catch((error) => {
    // 실패한 스크립트를 제거해야 같은 화면에서 SDK를 다시 요청할 수 있다.
    document.getElementById(scriptId)?.remove();
    sdkPromise = null;
    throw error;
  });

  return sdkPromise;
};

export const findKakaoAddress = async (address: string) => {
  const maps = await loadKakaoMapSdk();

  return new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
    const geocoder = new maps.services.Geocoder();

    geocoder.addressSearch(address, (result, status) => {
      if (status !== maps.services.Status.OK || !result[0]) {
        reject(new Error("선택한 지역의 위치를 찾지 못했습니다."));
        return;
      }

      resolve({
        latitude: Number(result[0].y),
        longitude: Number(result[0].x),
      });
    });
  });
};
