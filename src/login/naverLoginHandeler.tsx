import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const API_URL = process.env.REACT_APP_API_URL;

const NaverLoginHandeler = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loginDone, setLoginDone] = useState(false);

  useEffect(() => {
    if (loginDone) return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");

    if (!code || !state) {
      alert("네이버 인증 코드가 없습니다.");
      navigate("/login");
      return;
    }

    const naverLogin = async () => {
      try {
        const response = await fetch(
          `spring/naver/callback`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, state }),
          }
        );

        if (!response.ok) {
          const text = await response.text();
          alert("네이버 로그인 처리 중 오류가 발생했습니다.\n" + text);
          navigate("/login");
          throw new Error(text);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          alert("서버 오류: JWT 응답 형식이 올바르지 않습니다.");
          navigate("/login");
          throw new Error("Invalid response type from server");
        }

        const result = await response.json();
        const { accessToken, refreshToken, uid, role } = result;

        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);
        localStorage.setItem("userEmail", uid); // 기존 로직 호환 (uid가 이메일이라 가정)
        if (role) { // role 정보가 있는 경우 저장
          localStorage.setItem("userRole", role);
        }

        if (login) login(uid);

        setLoginDone(true);
        navigate("/");
      } catch (error) {
        alert("네이버 로그인 처리 중 오류가 발생했습니다.");
        navigate("/login");
        console.error(error);
      }
    };

    naverLogin();
  }, [navigate, loginDone]);

  return (
    <div className="loginHandeler">
      <div className="notice">
        <p>네이버 로그인 중입니다.</p>
        <p>잠시만 기다려주세요.</p>
        <div className="spinner"></div>
      </div>
    </div>
  );
};

export default NaverLoginHandeler;
