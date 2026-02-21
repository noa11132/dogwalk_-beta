import React, { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import BottomTabBar from "../components/BottomTabBar";

//실제 플 젝트에서는 키를 코드에 그대로 올리지 않고 .env 같은 곳에 숨기기.
const KAKAO_JS_KEY = "c501500e882a8cc704505df42be58a40"; 


// WebView 안에서 실행될 "웹페이지"
const makeHtml = () => `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    html, body, #map { margin:0; padding:0; width:100%; height:100%; }
  </style>
</head>
<body>
  <div id="map"></div>

  <script>
    // RN으로 로그 보내는 함수
    function send(msg) {
      window.ReactNativeWebView?.postMessage(msg);
    }
    

    // 전역으로 지도/마커 보관
    var map = null;         // 카카오 지도 객체 저장
    var myMarker = null;    // 내 위치 마커 저장

    // RN이 좌표를 주입하면 호출할 함수(중요!)
    window.setMyLocation = function(lat, lng) {
      try {
        if (!window.kakao || !window.kakao.maps || !map) {
          send("setMyLocation called but map not ready");
          return;
        }

        var pos = new kakao.maps.LatLng(lat, lng);    //pos에 위도,경도(좌표) 객체 저장

        // 지도 중심 이동
        map.setCenter(pos);

        // 마커가 없으면 만들고, 있으면 위치만 업데이트
        if (!myMarker) {
          myMarker = new kakao.maps.Marker({ position: pos });
          myMarker.setMap(map);
        } else {
          myMarker.setPosition(pos);
        }

        send("Location applied: " + lat + "," + lng);
      } catch (e) {
        send("setMyLocation error: " + e.message);
      }
    };

    window.onerror = function(message, source, lineno, colno) {
      send("JS ERROR: " + message + " @ " + lineno + ":" + colno);
    };

    send("HTML loaded");
  </script>

  <script
    src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}"
    onload="window.ReactNativeWebView?.postMessage('Kakao SDK loaded')"
    onerror="window.ReactNativeWebView?.postMessage('Kakao SDK load FAILED')"
  ></script>

  <script>
    // 지도 초기 생성(일단 서울로)
    setTimeout(function() {
      if (!window.kakao || !window.kakao.maps) {
        window.ReactNativeWebView?.postMessage("kakao.maps not ready");
        return;
      }

      var container = document.getElementById('map');
      var options = {
        center: new kakao.maps.LatLng(37.5665, 126.9780),   //
        level: 3    //확대 레벨 작을수록 확대 up
      };

      map = new kakao.maps.Map(container, options);
      window.ReactNativeWebView?.postMessage("Map created OK");
    }, 200);
  </script>
</body>
</html>
`;

export default function MapScreen() {
  const webviewRef = useRef(null);    // useRef는 값이 바뀌어도 화면 리렌더링을 안 일으키는 "상자"같은 것

  const [coords, setCoords] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [activeTab, setActiveTab] = useState("walk");
  const [communityBadgeCount, setCommunityBadgeCount] = useState(0); // 0이면 배지 숨김, 나중에 알림 개수 연동

  // // 1) 앱 시작 시 위치 권한 요청 + 현재 위치 가져오기
  // useEffect(() => {

  //   let subscription = null;

  //   //async 함수를 통해 await 을 사용하여 promise를 반환
  //   (async () => {
  //     // 위치 권한 요청
  //     const { status } = await Location.requestForegroundPermissionsAsync();
  //     // status = "granted" or "denied"
  //     if (status !== "granted") {
  //       setErrorMsg("위치 권한이 거부되었습니다. (설정에서 허용 필요)");
  //       return;
  //     }

  //     // 현재 순간의 위치를 GPS로 가져옴 (시간이 걸리므로 promise로 반환 -> await 사용)
  //     const loc = await Location.getCurrentPositionAsync({
  //       // 정확도를 세팅
  //       accuracy: Location.Accuracy.Balanced,
  //     });
      
  //     // 구조분해할당
  //     const { latitude, longitude } = loc.coords;
  //     // Coords를 설정
  //     setCoords({ latitude, longitude });
  //   })();
  // }, []);
  // // useEffect ({}, []) 매개변수 뒤에 [](빈 배열)이면 초기에 "한번만" 실행 (초기 세팅)

  useEffect(() => {
  let subscription = null;

  (async () => {
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        setErrorMsg("기기의 위치 서비스(GPS)가 꺼져 있어요. 켜고 다시 실행해줘!");
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("위치 권한이 거부되었습니다. (설정에서 허용 필요)");
        return;
      }

      // ✅ 실시간 위치 추적 시작
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          // 아래 두 개는 “얼마나 자주 업데이트할지” 조건
          timeInterval: 1000,      // 최소 1초마다
          distanceInterval: 2,     // 또는 2m 움직이면
        },
        (loc) => {
          const { latitude, longitude, accuracy } = loc.coords;

          console.log(
            "[RN][WATCH]",
            "lat=", latitude,
            "lng=", longitude,
            "acc=", accuracy,
            "t=", new Date(loc.timestamp).toLocaleTimeString()
          );

          setCoords({ latitude, longitude });


        }
      );
    } catch (err) {
      setErrorMsg("위치 추적 실패: " + String(err?.message ?? err));
    }
  })();

  // 화면에서 MapScreen이 사라질 때 추적 중지(필수)
  return () => {
    if (subscription) subscription.remove();
  };
}, []);
  
  

  // 2) coords가 생기면 WebView에 JS 주입해서 지도 업데이트
  useEffect(() => {
    console.log("[RN] coords changed:", coords, "webviewRef:", !!webviewRef.current);
    if (!coords || !mapReady || !webviewRef.current) return;

    const js = `
      window.setMyLocation(${coords.latitude}, ${coords.longitude});
      true;
    `;
    console.log("[RN] injecting JS:", js);
    webviewRef.current.injectJavaScript(js);
  }, [coords, mapReady]);
  // coords가 변경될 때마다 실행

  return (
    <View style={styles.container}>
      {/* 지도 영역 */}
      <View style={styles.mapContainer}>
      <WebView
        ref={webviewRef}
        style={styles.webview}
        originWhitelist={["*"]}
        javaScriptEnabled
        source={{ html: makeHtml(), baseUrl: "https://localhost" }}
        onMessage={(e) => {
          const msg = e.nativeEvent.data;
          console.log("[WEBVIEW]", msg);

          if (msg === "Map created OK") {
             setMapReady(true);
          }
        }}
      />

      {/* 로딩/에러 오버레이 */}
      {!coords && !errorMsg && (
        <View style={styles.overlay}>
          <ActivityIndicator />
          <Text style={styles.overlayText}>현재 위치 가져오는 중…</Text>
        </View>
      )}

      {!!errorMsg && (
        <View style={styles.overlay}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}
      </View>

      {/* 하단 탭 바 */}
      <BottomTabBar activeTab={activeTab} onTabPress={setActiveTab} communityBadgeCount={communityBadgeCount} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: { flex: 1 },
  webview: { flex: 1 },
  overlay: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  overlayText: { marginTop: 8 },
  errorText: { color: "crimson" },
});
