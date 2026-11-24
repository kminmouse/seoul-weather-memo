import { useState, useEffect } from "react";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, googleProvider, db } from "./firebase";

// Open-Meteo WMO 날씨 코드 변환
const getWeatherText = (code) => {
  if (code === 0) return "맑음 ☀️";
  if (code <= 3) return "구름 조금/흐림 ⛅";
  if (code <= 48) return "안개 🌫️";
  if (code <= 67) return "비 🌧️";
  if (code <= 77) return "눈 ❄️";
  if (code <= 82) return "소나기 🌦️";
  return "뇌우 ⛈️";
};

export default function App() {
  const [weather, setWeather] = useState(null);
  const [user, setUser] = useState(null);
  const [memo, setMemo] = useState("");
  const [memoList, setMemoList] = useState([]);

  // 1. Open-Meteo 서울 현재 날씨 불러오기
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current=temperature_2m,weather_code,wind_speed_10m&timezone=Asia%2FSeoul"
        );
        const data = await res.json();
        setWeather(data.current);
      } catch (err) {
        console.error("날씨 API 호출 실패:", err);
      }
    };
    fetchWeather();
  }, []);

  // 2. Firebase 로그인 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 3. 로그인한 사용자의 Firestore 옷차림 메모 실시간 조회
  useEffect(() => {
    if (!user) {
      setMemoList([]);
      return;
    }

    // orderBy("createdAt", "desc") 제거
    const q = query(
      collection(db, "outfit_memos"),
      where("uid", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // 최신순 정렬을 자바스크립트에서 직접 처리
        items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setMemoList(items);
      },
      (error) => {
        console.error("Firestore 조회 오류:", error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleLogin = () => signInWithPopup(auth, googleProvider);
  const handleLogout = () => signOut(auth);

  // 4. Firestore에 메모 저장
  const handleSaveMemo = async (e) => {
    e.preventDefault();
    if (!memo.trim() || !user) return;

    await addDoc(collection(db, "outfit_memos"), {
      uid: user.uid,
      author: user.displayName || user.email,
      text: memo,
      temp: weather ? weather.temperature_2m : null,
      createdAt: serverTimestamp(),
    });
    setMemo("");
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "outfit_memos", id));
  };

  return (
    <div style={{ maxWidth: "480px", margin: "40px auto", padding: "20px", fontFamily: "sans-serif" }}>
      <h2>🌤️ 지금 서울 날씨 & 옷차림 메모</h2>

      {/* 날씨 섹션 */}
      <div style={{ padding: "16px", background: "#f4f6f8", borderRadius: "12px", marginBottom: "20px" }}>
        {weather ? (
          <div>
            <p style={{ margin: "4px 0", fontSize: "18px", fontWeight: "bold" }}>
              현재 서울: {weather.temperature_2m}°C ({getWeatherText(weather.weather_code)})
            </p>
            <p style={{ margin: "4px 0", color: "#555", fontSize: "14px" }}>
              풍속: {weather.wind_speed_10m} km/h
            </p>
          </div>
        ) : (
          <p>서울 날씨 불러오는 중...</p>
        )}
      </div>

      {/* 로그인 섹션 */}
      <div style={{ marginBottom: "20px" }}>
        {user ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>👋 {user.displayName}님</span>
            <button onClick={handleLogout}>로그아웃</button>
          </div>
        ) : (
          <button onClick={handleLogin} style={{ width: "100%", padding: "10px" }}>
            Google 계정으로 로그인
          </button>
        )}
      </div>

      {/* 메모 입력 및 목록 */}
      {user && (
        <>
          <form onSubmit={handleSaveMemo} style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="오늘의 옷차림 한 줄 메모 (예: 경량패딩 필수)"
              style={{ flex: 1, padding: "8px" }}
            />
            <button type="submit" style={{ padding: "8px 16px" }}>저장</button>
          </form>

          <ul style={{ listStyle: "none", padding: 0 }}>
            {memoList.map((item) => (
              <li
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px",
                  borderBottom: "1px solid #eee",
                }}
              >
                <span>
                  {item.temp !== null && <strong>[{item.temp}°C] </strong>}
                  {item.text}
                </span>
                <button onClick={() => handleDelete(item.id)} style={{ color: "red", border: "none", background: "none", cursor: "pointer" }}>
                  삭제
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}