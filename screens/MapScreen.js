import React, { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";

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
    // RN으로 로그 보내기
    function send(msg) {
      window.ReactNativeWebView?.postMessage(msg);
    }

    // 전역으로 지도/마커 보관
    var map = null;
    var myMarker = null;

    // RN이 좌표를 주입하면 호출할 함수(중요!)
    window.setMyLocation = function(lat, lng) {
      try {
        if (!window.kakao || !window.kakao.maps || !map) {
          send("setMyLocation called but map not ready");
          return;
        }

        var pos = new kakao.maps.LatLng(lat, lng);

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
        center: new kakao.maps.LatLng(37.5665, 126.9780),
        level: 3
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

  // 1) 앱 시작 시 위치 권한 요청 + 현재 위치 가져오기
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("위치 권한이 거부되었습니다. (설정에서 허용 필요)");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = loc.coords;
      setCoords({ latitude, longitude });
    })();
  }, []);

  // 2) coords가 생기면 WebView에 JS 주입해서 지도 업데이트
  useEffect(() => {
    if (!coords || !webviewRef.current) return;

    const js = `
      window.setMyLocation(${coords.latitude}, ${coords.longitude});
      true;
    `;
    webviewRef.current.injectJavaScript(js);
  }, [coords]);

  return (
    <View style={styles.container}>
      {/* 지도는 WebView가 차지 */}
      <WebView
        ref={webviewRef}
        style={styles.webview}
        originWhitelist={["*"]}
        javaScriptEnabled
        source={{ html: makeHtml(), baseUrl: "https://localhost" }}
        onMessage={(e) => console.log("[WEBVIEW]", e.nativeEvent.data)}
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
