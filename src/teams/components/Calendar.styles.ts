import styled from 'styled-components';
import { COLOR } from '../Team.styles';

export const CalendarWrapper = styled.div`
  flex-shrink: 0;
  margin: 16px 0 0 0; /* 위쪽 여백 추가 */
  padding: 12px;
  background-color: ${COLOR.bg}; /* 배경색 추가 */
  border-radius: 8px; /* 둥근 모서리 추가 */
  cursor: pointer; /* 클릭 가능함을 나타내는 커서 */
  transition: background-color 0.2s;

  &:hover {
    background-color: ${COLOR.imgBg}; /* 호버 시 약간 더 진한 색상 */
  }
`;

export const CalendarHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding: 0 4px; /* 내부 여백 조정 */
  font-size: 13px;
  font-weight: 600;
  color: ${COLOR.text};
`;

export const NavButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${COLOR.subText};
  border-radius: 50%;
  transition: all 0.2s;

  &:hover {
    color: ${COLOR.accentDark};
    background: ${COLOR.card}; /* 호버 색상 변경 */
  }
`;

export const DaysGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  text-align: center;
`;

export const DayName = styled.div`
  font-size: 11px;
  font-weight: 500;
  color: ${COLOR.subText};
  padding-bottom: 4px;
`;

export const DayCell = styled.div<{ $isToday?: boolean }>`
  position: relative;
  font-size: 11px;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  background: ${({ $isToday }) => ($isToday ? COLOR.imgBg : 'transparent')};
  color: ${({ $isToday }) => ($isToday ? COLOR.accentDark : 'inherit')};
  font-weight: ${({ $isToday }) => ($isToday ? 'bold' : 'normal')};
`;

export const EventDot = styled.div`
  position: absolute;
  bottom: 3px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  background-color: #f56565;
  border-radius: 50%;
`;