import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext"; // 로그인 상태 관리용 (선택)


const LoginHandeler = () => {
  const navigate = useNavigate();
  const { login } = useAuth(); // 로그인 상태 관리 (선택)
  const code = new URL(window.location.href).searchParams.get("code");
  const [loginDone, setLoginDone] = useState(false);

  useEffect(() => {
    if (!code || loginDone) return;

    const kakaoLogin = async () => {
      try {
        const response = await fetch(
          `${process.env.REACT_APP_REDIRECT_URL}?code=${code}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json;charset=utf-8",
            },
          }
        );

        if (!response.ok) {
          const text = await response.text();
          alert("로그인 처리 중 오류가 발생했습니다.\n" + text);
          throw new Error(text);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          alert("서버 오류: JWT 응답 형식이 올바르지 않습니다.");
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

        setLoginDone(true); // 중복 호출 방지

        navigate("/");
      } catch (error) {
        alert("로그인 처리 중 오류가 발생했습니다.");
        console.error(error);
      }
    };
    kakaoLogin();
  }, [navigate, code, loginDone]);

  return (
    <div className="loginHandeler">
      <div className="notice">
        <p>로그인 중입니다.</p>
        <p>잠시만 기다려주세요.</p>
        <div className="spinner"></div>
      </div>
    </div>
  );
};

export default LoginHandeler;
