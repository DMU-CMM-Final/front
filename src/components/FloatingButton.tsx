import React from 'react';
import styled from 'styled-components'; // styled-components import

// props 타입 정의 (변화 없음)
interface Props {
  onClick: () => void;
}

const COLOR = {
  accent: "#B8B6F2",
  accentDark: "#545159",
};


// styled-components를 사용해 버튼 스타일을 정의
// 'button' 태그에 스타일을 입힌 'FloatingButtonStyle'이라는 새 컴포넌트를 생성
const FloatingButtonStyle = styled.button`
  position: fixed;
  bottom: 40px;
  right: 40px;
  z-index: 1000;
  
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background-color 0.2s ease-in-out, transform 0.2s ease-in-out;

  background-color: ${COLOR.accent};
  
  &:hover {
    background-color: ${COLOR.accentDark};
    transform: translateY(-4px); // 호버 시 살짝 떠오르는 효과 추가
  }
  
  svg {
    width: 28px;
    height: 28px;
    fill: white; // 아이콘 색상을 흰색으로 고정
  }
`;

const FloatingButton: React.FC<Props> = ({ onClick }) => {
  return (
    // 기존 <button className="..."> 대신 방금 만든 <FloatingButtonStyle> 사용
    <FloatingButtonStyle onClick={onClick}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M19 19H5V8h14m-3-7v2H8V1H6v2H5c-1.11 0-2 .89-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-1V1m-1 11h-5v5h5v-5Z"/>
      </svg>
    </FloatingButtonStyle>
  );
};

export default FloatingButton;