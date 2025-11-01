import React, { useState } from "react";
import styled from "styled-components";
import Header from "../header";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { KAKAO_AUTH_URL } from "./outh";
import api from "../api";
import axios from "axios";

interface LoginResponse {
  accessToken: string;
  uid: string;
  role: 'admin' | 'user'; // role이 'admin' 또는 'user'라고 가정
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [uid, setUid] = useState("");
  const [upassword, setUpassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const NAVER_CLIENT_ID = "YqfWThdztNwv006mYBBW";
  const NAVER_REDIRECT_URI = "https://blanksync.o-r.kr/spring/naver/callback";
  const NAVER_STATE = "random_state_string"; // CSRF 방지용 임의 문자열

  const NAVER_AUTH_URL =
    `https://nid.naver.com/oauth2.0/authorize?response_type=code` +
    `&client_id=${NAVER_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(NAVER_REDIRECT_URI)}` +
    `&state=${NAVER_STATE}`;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post<LoginResponse>(
        "/spring/api/users/login",
        { uid: uid, upassword: upassword }
      );

      const { accessToken, uid: resultUid, role } = response.data;

      alert("로그인 성공!");
      
      login(resultUid);

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("userEmail", resultUid); // 기존 로직 호환 (uid가 이메일이라 가정)
      localStorage.setItem("userRole", role); // role 저장

      // 4. role 값에 따라 다른 경로로 이동
      if (role === 'admin') {
        navigate("/traffic"); // admin일 경우 관리자 페이지로
      } else {
        navigate("/"); // user 또는 그 외의 경우 메인 페이지로
      }

    } catch (error) {
      console.error("Login error:", error);
      if (error && typeof error === 'object' && 'response' in error) {
        const responseData = (error as any).response?.data;
        alert(responseData?.message || "아이디 또는 비밀번호가 올바르지 않습니다.");
      } else {
        alert("서버와의 통신에 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Header />
      <Main>
        <LoginCard>
          <Title>BlankSync</Title>
          <Subtitle>새로운 협업툴에 도전해보세요!</Subtitle>
          <InfoText>
            처음이신가요?
            <SignUpLink onClick={() => navigate("/signup")}>회원가입</SignUpLink>
          </InfoText>
          <Form onSubmit={handleLogin}>
            <Input
              type="text"
              placeholder="아이디"
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="비밀번호"
              value={upassword}
              onChange={(e) => setUpassword(e.target.value)}
              required
            />
            <Button type="submit" disabled={loading}>
              {loading ? "로그인 중..." : "로그인"}
            </Button>

            <Divider>또는</Divider>

            <SocialLoginRow>
              <SocialIconButton href={KAKAO_AUTH_URL} aria-label="카카오 로그인">
                <img src={process.env.PUBLIC_URL + `/image/kakao.png`} alt="카카오 로그인" />
              </SocialIconButton>
              <SocialIconButton href={NAVER_AUTH_URL} aria-label="네이버 로그인">
                <img src={process.env.PUBLIC_URL + `/image/naver.png`} alt="네이버 로그인" />
              </SocialIconButton>
            </SocialLoginRow>
          </Form>
          <HelpLinks>
            <HelpLink href="#">아이디 찾기</HelpLink>
            <HelpLink href="#">비밀번호 찾기</HelpLink>
          </HelpLinks>
        </LoginCard>
      </Main>
    </Container>
  );

};

export default Login;

const COLOR = {
  bg: "#EDE9F2",        // 전체 배경
  card: "#F2F2F2",      // 카드/박스 배경
  accent: "#B8B6F2",    // 주요 버튼/포인트
  accentDark: "#545159",// 버튼 hover 등
  text: "#3B3740",      // 기본 텍스트
  subText: "#A19FA6",   // 서브 텍스트
  logo: "#C6C4F2",      // 로고/포인트
  imgBg: "#D1D0F2",     // 이미지 영역 배경
  imgShadow: "#CEDEF2", // 이미지 그림자
  border: "#E3DCF2",    // 경계선/구분선
};

const Container = styled.div`
  min-height: 100vh;
  background: ${COLOR.bg};
  display: flex;
  flex-direction: column;
`;

const Main = styled.main`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LoginCard = styled.div`
  background: ${COLOR.card};
  border-radius: 18px;
  box-shadow: 0 6px 32px ${COLOR.imgShadow};
  padding: 48px 36px 36px 36px;
  min-width: 340px;
  max-width: 380px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1.5px solid ${COLOR.border};
`;

const Title = styled.h2`
  font-size: 32px;
  font-weight: 800;
  color: ${COLOR.text};
  margin-bottom: 8px;
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: ${COLOR.subText};
  margin-bottom: 30px;
`;

const InfoText = styled.p`
  font-size: 14px;
  color: ${COLOR.subText};
  margin-bottom: 18px;
`;

const SignUpLink = styled.span`
  color: ${COLOR.accent};
  cursor: pointer;
  font-weight: 600;
  margin-left: 4px;
  &:hover {
    text-decoration: underline;
    color: ${COLOR.accentDark};
  }
`;

const Form = styled.form`
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
`;

const Input = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1.5px solid ${COLOR.border};
  background: #fff;
  font-size: 16px;
  color: ${COLOR.text};
  outline: none;
  transition: border 0.18s;
  &:focus {
    border: 1.5px solid ${COLOR.accent};
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 14px;
  border-radius: 10px;
  border: none;
  background-color: ${COLOR.accent};
  color: ${COLOR.text};
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 8px;
  transition: background 0.18s, color 0.18s;
  &:hover {
    background-color: ${COLOR.accentDark};
    color: ${COLOR.card};
  }
`;

const Divider = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  margin: 18px 0 8px 0;
  color: ${COLOR.subText};
  font-size: 14px;
  font-weight: 500;
  &::before, &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: ${COLOR.border};
    margin: 0 8px;
  }
`;

const SocialLoginRow = styled.div`
  width: 100%;
  display: flex;
  flex-direction: row;
  gap: 12px;
  justify-content: center;
  align-items: center;
  margin: 0 0 8px 0;
`;

const SocialIconButton = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0; /* 여백 제거 */
  border: none;
  background: none;
  box-shadow: none;

  img {
    width: 140px;      /* 공식 버튼 이미지 크기 */
    height: 40px;
    border-radius: 7px;
    margin: 0;
    padding: 0;
    display: block;
    border: none;
    object-fit: cover;
    background: none;
  }
`;

const HelpLinks = styled.div`
  margin-top: 10px;
  font-size: 13px;
  color: ${COLOR.subText};
  display: flex;
  gap: 10px;
  justify-content: center;
`;

const HelpLink = styled.a`
  color: ${COLOR.accentDark};
  cursor: pointer;
  &:hover {
    color: ${COLOR.accent};
    text-decoration: underline;
  }
`;


