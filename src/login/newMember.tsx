import React, { useState, useRef } from "react";
import styled from "styled-components";
import Header from "../header";
import { useNavigate } from "react-router-dom";
import api from "../api";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const NewMember: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("비밀번호가 일치하지 않습니다!");
      setPassword("");
      setConfirmPassword("");
      passwordRef.current?.focus();
      return;
    }
    setLoading(true);
    try {
      const response = await api.post<boolean>('/spring/api/users/register', {
        uid: email,
        uname: name,
        upassword: password
      });
      
      const result = response.data;

      if (result === true) {
        alert("회원가입이 완료되었습니다!");
        navigate("/login");
      } else {
        alert("회원가입에 실패했습니다. 이미 등록된 이메일일 수 있습니다.");
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in error) {
        const responseData = (error as any).response?.data;
        alert(responseData?.message || "회원가입에 실패했습니다.");
      } else {
        alert("서버와의 통신에 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  const checkDuplicate = async () => {
    if (!EMAIL_REGEX.test(email)) {
      alert("이메일 형식이 올바르지 않습니다.");
      return;
    }
    setLoading(true);
    try {
      const response = await api.get<boolean>('/spring/api/users/check-id', {
        params: { id: email }
      });
      
      const result = response.data;
      if (result === false) {
        alert("사용 가능한 이메일입니다.");
      } else {
        alert("이미 사용 중인 이메일입니다.");
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in error) {
        const responseData = (error as any).response?.data;
        alert(responseData?.message || "중복 확인 중 오류가 발생했습니다.");
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
        <SignUpCard>
          <Title>회원가입</Title>
          <Subtitle>BlankSync에 오신 것을 환영합니다!</Subtitle>
          <Form onSubmit={handleSubmit}>
            <InputWrapper>
              <Input 
                type="text" 
                placeholder="이름" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </InputWrapper>
            <InputWrapper>
              <Input 
                type="email" 
                placeholder="아이디(이메일)" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <DuplicateCheckButton type="button" onClick={checkDuplicate} disabled={loading}>
                {loading ? "확인 중..." : "중복확인"}
              </DuplicateCheckButton>
            </InputWrapper>
            <InputWrapper>
              <Input 
                type="password" 
                placeholder="비밀번호" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                ref={passwordRef}
                required
              />
            </InputWrapper>
            <InputWrapper>
              <Input 
                type="password" 
                placeholder="비밀번호 확인" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </InputWrapper>
            <SignUpButton type="submit" disabled={loading}>
              {loading ? "회원가입 중..." : "회원가입"}
            </SignUpButton>
          </Form>
        </SignUpCard>
      </Main>
    </Container>
  );
};

export default NewMember;

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

const SignUpCard = styled.div`
  background: ${COLOR.card};
  border-radius: 18px;
  box-shadow: 0 6px 32px ${COLOR.imgShadow};
  padding: 44px 36px 36px 36px;
  min-width: 340px;
  max-width: 420px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1.5px solid ${COLOR.border};
`;

const Title = styled.h2`
  font-size: 28px;
  font-weight: 800;
  color: ${COLOR.text};
  margin-bottom: 7px;
`;

const Subtitle = styled.p`
  font-size: 15px;
  color: ${COLOR.subText};
  margin-bottom: 22px;
  text-align: center;
`;

const Form = styled.form`
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`;

const InputWrapper = styled.div`
  width: 100%;
  position: relative;
  display: flex;
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

const DuplicateCheckButton = styled.button`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background-color: ${COLOR.accent};
  color: ${COLOR.text};
  border: none;
  border-radius: 8px;
  padding: 7px 14px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: background 0.18s, color 0.18s;
  &:hover {
    background-color: ${COLOR.accentDark};
    color: ${COLOR.card};
  }
  &:disabled {
    background-color: ${COLOR.imgBg};
    color: ${COLOR.subText};
    cursor: not-allowed;
  }
`;

const SignUpButton = styled.button`
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
  &:disabled {
    background-color: ${COLOR.imgBg};
    color: ${COLOR.subText};
    cursor: not-allowed;
  }
`;
