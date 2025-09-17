import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import Calendar from 'react-calendar';
import { useAuth } from '../contexts/AuthContext';
import { uid } from 'chart.js/dist/helpers/helpers.core';

// --- 타입 정의 ---
// 컴포넌트에서 사용하는 이벤트 타입. startDate와 endDate를 Date 객체로 정의합니다.
interface CalendarEvent {
  eventId: number;
  tId: number | null;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
}

const API_URL = process.env.REACT_APP_API_URL;


// --- 스타일 정의 ---
const ModalOverlay = styled.div`
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background-color: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1100;
`;
const ModalContent = styled.div`
  background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  display: flex; flex-direction: row; align-items: flex-start;
`;
const CalendarContainer = styled.div`
  display: flex; flex-direction: column; align-items: center;
`;
const RightPanelContainer = styled.div`
  width: 300px; margin-left: 20px; padding-left: 20px; border-left: 1px solid #e0e0e0; height: 500px; overflow-y: auto;
`;
const EventDetailCard = styled.div`
  margin-bottom: 15px; padding: 10px; border-radius: 8px; background-color: #f9f9f9; border: 1px solid #eee;
  h4 { margin-top: 0; margin-bottom: 8px; font-size: 1.1rem; }
  p { margin: 4px 0; font-size: 0.9rem; color: #555; white-space: pre-wrap; }
`;
const DetailsHeader = styled.h3`
  font-size: 1.3rem; margin-top: 0; padding-bottom: 10px; border-bottom: 1px solid #eee;
`;
const CalendarWrapper = styled.div`
  .react-calendar { width: 600px; border: none; font-size: 1.3rem; }
  .react-calendar__navigation__label { font-size: 1.8rem; font-weight: bold; }
  .react-calendar__month-view__weekdays__weekday abbr { font-size: 1.2rem; text-decoration: none; font-weight: 600; }
  .react-calendar__tile { height: 70px; display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-start; padding: 4px; overflow-y: hidden; }
  .react-calendar__tile--now { background: #f0f0f0; font-weight: bold; border-radius: 8px; }
  .react-calendar__tile--active { background: #007bff; color: white; border-radius: 8px; }
  .saturday { color: #007bff; }
`;
const ButtonContainer = styled.div`
  display: flex; justify-content: center; gap: 10px; width: 100%; margin-top: 20px;
`;
const ActionButton = styled.button`
  padding: 8px 16px; border-radius: 5px; border: 1px solid #B8B6F2; background-color: #B8B6F2;
  color: white; font-weight: bold; cursor: pointer; transition: background-color 0.2s ease;
  &:hover { background-color: #a09ee0; }
`;
const CloseButton = styled.button`
  padding: 8px 16px; border-radius: 5px; border: 1px solid #ccc; background-color: #f0f0f0;
  cursor: pointer; transition: background-color 0.2s ease;
  &:hover { background-color: #e0e0e0; }
`;
const EventHighlighter = styled.div<{ color: string; opacity: number }>`
  background-color: ${(props) => `rgba(${parseInt(props.color.slice(1, 3), 16)}, ${parseInt(props.color.slice(3, 5), 16)}, ${parseInt(props.color.slice(5, 7), 16)}, ${props.opacity})`};
  color: #111; padding: 0 4px; margin-bottom: 2px; border-radius: 3px; font-size: 0.8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;
`;
const Form = styled.form` display: flex; flex-direction: column; gap: 15px; `;
const FormGroup = styled.div`
  display: flex; flex-direction: column; gap: 5px;
  label { font-size: 0.9rem; font-weight: bold; }
  input, textarea { padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 1rem; }
`;
const FormRow = styled.div` display: flex; align-items: center; justify-content: space-between; `;
const SwitchLabel = styled.label`
  position: relative; display: inline-block; width: 44px; height: 24px;
  input { opacity: 0; width: 0; height: 0; }
`;
const SwitchSlider = styled.span`
  position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 24px;
  &:before { position: absolute; content: ""; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
`;
const SwitchInput = styled.input`
  &:checked + ${SwitchSlider} { background-color: #B8B6F2; }
  &:checked + ${SwitchSlider}:before { transform: translateX(20px); }
`;
const DetailButtonContainer = styled.div`
  display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px;
`;
const DetailButton = styled.button`
  padding: 4px 8px; font-size: 0.8rem; border-radius: 4px; border: 1px solid #ccc;
  background-color: #fff; cursor: pointer; &:hover { background-color: #f0f0f0; }
`;

// --- 헬퍼 함수 ---
interface Props { isOpen: boolean; onClose: () => void; }

const toDateTimeLocalString = (date: Date) => {
  const ten = (i: number) => (i < 10 ? '0' : '') + i;
  return `${date.getFullYear()}-${ten(date.getMonth() + 1)}-${ten(date.getDate())}T${ten(date.getHours())}:${ten(date.getMinutes())}`;
};
const toDateInputString = (date: Date) => toDateTimeLocalString(date).slice(0, 10);

const CalendarModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { userEmail } = useAuth(); 
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [activeDate, setActiveDate] = useState(new Date()); 
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const [newEvent, setNewEvent] = useState({
    title: '', description: '', startDate: new Date(),
    endDate: new Date(Date.now() + 60 * 60 * 1000), isAllDay: false
  });

  const tIdColorMap = useMemo(() => new Map<number, string>(), []);
  const getColorForTId = useCallback((tId: number | null): string => {
    if (tId === null) return '#B8B6F2'; 
    if (!tIdColorMap.has(tId)) { const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'); tIdColorMap.set(tId, randomColor); }
    return tIdColorMap.get(tId)!;
  }, [tIdColorMap]);
  
  // ==================================================================
  // ====================== 주요 변경 사항 ==============================
  // ==================================================================
  const fetchEvents = useCallback(async (date: Date) => {
    if (!userEmail) return; 
    setLoading(true);

    /* // --- 실제 API 호출 코드 (주석 처리) ---
    const dateParam = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    const url = `${API_URL}/api/calender?uId=${encodeURIComponent(userEmail)}&date=${encodeURIComponent(dateParam)}`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data: any[] = await response.json();
      
      const processedEvents: CalendarEvent[] = data.map(event => ({
        ...event,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate)
      }));
      setEvents(processedEvents);

    } catch (error) { console.error("캘린더 데이터를 가져오는 데 실패했습니다:", error); } 
    finally { setLoading(false); }
    */


    // --- 더미 데이터 시작 (테스트 후 이 블록을 삭제하고 위 코드를 주석 해제하세요) ---
    console.log("더미 데이터를 로드합니다.");
    
    // 현재 월을 기준으로 동적으로 더미 데이터 생성
    const currentYear = date.getFullYear();
    const currentMonth = (date.getMonth() + 1).toString().padStart(2, '0');

    const dummyData = [
      { eventId: 1, tId: 101, title: "팀 회의", description: "주간 성과 리뷰", startDate: `${currentYear}-${currentMonth}-05T10:00:00`, endDate: `${currentYear}-${currentMonth}-05T11:30:00`, isAllDay: false },
      { eventId: 2, tId: 102, title: "프로젝트 마감", description: "최종 보고서 제출", startDate: `${currentYear}-${currentMonth}-10T00:00:00`, endDate: `${currentYear}-${currentMonth}-10T23:59:59`, isAllDay: true },
      { eventId: 3, tId: null, title: "개인 약속", description: "병원 방문", startDate: `${currentYear}-${currentMonth}-15T14:00:00`, endDate: `${currentYear}-${currentMonth}-15T15:00:00`, isAllDay: false },
      { eventId: 4, tId: 101, title: "장기 프로젝트", description: "1단계 개발 기간", startDate: `${currentYear}-${currentMonth}-18T09:00:00`, endDate: `${currentYear}-${currentMonth}-22T18:00:00`, isAllDay: false },
      { eventId: 5, tId: 103, title: "워크샵", description: "전사 워크샵", startDate: `${currentYear}-${currentMonth}-25T09:00:00`, endDate: `${currentYear}-${currentMonth}-26T17:00:00`, isAllDay: false },
    ];
    
    // 실제 API 호출처럼 약간의 딜레이를 줍니다.
    setTimeout(() => {
        const processedEvents: CalendarEvent[] = dummyData.map(event => ({
            ...event,
            startDate: new Date(event.startDate),
            endDate: new Date(event.endDate)
        }));
        setEvents(processedEvents);
        setLoading(false);
    }, 500); // 0.5초 딜레이
    // --- 더미 데이터 끝 ---

  }, [userEmail]);

  useEffect(() => {
    if (isOpen) { fetchEvents(activeDate); } 
    else { 
      setSelectedDate(null); 
      setIsAddingEvent(false);
      setEditingEvent(null);
    }
  }, [isOpen, activeDate, fetchEvents]);
  
  const handleShowAddForm = () => {
    setSelectedDate(null); setIsAddingEvent(true);
    const now = new Date();
    setNewEvent({
        title: '', description: '', startDate: now,
        endDate: new Date(now.getTime() + 60 * 60 * 1000), isAllDay: false,
    });
  };
  
  const handleNewEventChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    
    setNewEvent(prev => ({
      ...prev,
      [name]: isCheckbox ? (e.target as HTMLInputElement).checked : (name === 'startDate' || name === 'endDate' ? new Date(value) : value)
    }));
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title) { alert("제목을 입력해주세요."); return; }
    
    const payload = {
        uId: userEmail,
        title: newEvent.title,
        description: newEvent.description,
        isAllDay: newEvent.isAllDay,
        startDate: newEvent.startDate,
        endDate: newEvent.endDate,
    };
    
    console.log('Sending this payload to Spring:', JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(`${API_URL}/spring/calender/new`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error("일정 저장에 실패했습니다.");
        setIsAddingEvent(false);
        await fetchEvents(activeDate);
    } catch (error) { console.error(error); alert(String(error)); }
  };

  const handleEditEventChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!editingEvent) return;
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';

    setEditingEvent({
      ...editingEvent,
      [name]: isCheckbox ? (e.target as HTMLInputElement).checked : (name === 'startDate' || name === 'endDate' ? new Date(value) : value)
    });
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) { alert("수정할 일정이 없습니다."); return; }

    const payload = {
      eventId: editingEvent.eventId,
      uId: userEmail,
      title: editingEvent.title,
      description: editingEvent.description,
      startDate: editingEvent.startDate,
      endDate: editingEvent.endDate,
      isAllDay: editingEvent.isAllDay,
    };

    try {
      const response = await fetch(`${API_URL}/spring/calender/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("일정 수정에 실패했습니다.");
      setEditingEvent(null); // 수정 모드 종료
      await fetchEvents(activeDate); // 최신 정보로 캘린더 새로고침
    } catch (error) { console.error(error); alert(String(error)); }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!window.confirm("정말로 이 일정을 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`${API_URL}/spring/calender/delete?eventId=${eventId}`, {
        method: 'GET' // 명시적으로 GET으로 설정 (기본값이 GET이긴 함)
      });
      if (!response.ok) throw new Error("일정 삭제에 실패했습니다.");
      setSelectedDate(null); // 우측 패널 닫기
      await fetchEvents(activeDate); // 최신 정보로 캘린더 새로고침
    } catch (error) { console.error(error); alert(String(error)); }
  };

  const handleActiveStartDateChange = ({ activeStartDate }: { activeStartDate: Date | null }) => { if (activeStartDate) setActiveDate(activeStartDate); };
  const handleDateClick = (date: Date) => {
    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);
    const hasEvents = events.some(event => event.startDate <= dayEnd && event.endDate >= dayStart);
    if (hasEvents) { 
      setSelectedDate(date); 
      setIsAddingEvent(false); 
      setEditingEvent(null);
    }
  };
  
  const renderTileContent = ({ date, view }: { date: Date, view: string }) => {
    if (view !== 'month') return null;
    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);
    const dayEvents = events.filter(event => event.startDate <= dayEnd && event.endDate >= dayStart);
    return ( <>{dayEvents.slice(0, 2).map(event => (<EventHighlighter key={event.eventId} color={getColorForTId(event.tId)} opacity={event.isAllDay ? 1 : 0.5} title={event.title}>{event.title}</EventHighlighter>))}</> );
  };
  
  const selectedDayEvents = selectedDate ? events.filter(event => {
      const dayStart = new Date(selectedDate); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(selectedDate); dayEnd.setHours(23, 59, 59, 999);
      return event.startDate <= dayEnd && event.endDate >= dayStart;
  }) : [];

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <CalendarContainer>
          <CalendarWrapper>
            {loading && <div style={{ position: 'absolute', zIndex: 1, top: '50%', left: '50%', transform: 'translate(-50%, -50%)'}}>로딩 중...</div>}
            <Calendar
              calendarType="gregory" formatDay={(locale, date) => date.getDate().toString()}
              tileClassName={({ date, view }) => (view === 'month' && date.getDay() === 6 ? 'saturday' : null)}
              onActiveStartDateChange={handleActiveStartDateChange} tileContent={renderTileContent} onClickDay={handleDateClick}
            />
          </CalendarWrapper>
          <ButtonContainer>
            <ActionButton onClick={handleShowAddForm}>일정 추가</ActionButton>
            <CloseButton onClick={onClose}>닫기</CloseButton>
          </ButtonContainer>
        </CalendarContainer>
        
        <RightPanelContainer>
          {editingEvent ? (
            // --- 3. 수정 모드일 때 ---
            <>
              <DetailsHeader>일정 수정</DetailsHeader>
              <Form onSubmit={handleUpdateEvent}>
                <FormGroup><label htmlFor="title">제목</label><input type="text" name="title" id="title" value={editingEvent.title} onChange={handleEditEventChange} required /></FormGroup>
                <FormGroup><FormRow><label>하루 종일</label><SwitchLabel><SwitchInput type="checkbox" name="isAllDay" checked={editingEvent.isAllDay} onChange={handleEditEventChange} /><SwitchSlider /></SwitchLabel></FormRow></FormGroup>
                <FormGroup>
                  <label htmlFor="startDate">시작</label>
                  <input type={editingEvent.isAllDay ? 'date' : 'datetime-local'} name="startDate" id="startDate"
                    value={editingEvent.isAllDay ? toDateInputString(editingEvent.startDate) : toDateTimeLocalString(editingEvent.startDate)}
                    onChange={handleEditEventChange} />
                </FormGroup>
                <FormGroup>
                  <label htmlFor="endDate">종료</label>
                  <input type={editingEvent.isAllDay ? 'date' : 'datetime-local'} name="endDate" id="endDate"
                    value={editingEvent.isAllDay ? toDateInputString(editingEvent.endDate) : toDateTimeLocalString(editingEvent.endDate)}
                    onChange={handleEditEventChange} />
                </FormGroup>
                <FormGroup><label htmlFor="description">상세 설명</label><textarea name="description" id="description" rows={4} value={editingEvent.description} onChange={handleEditEventChange}></textarea></FormGroup>
                <ButtonContainer>
                  <ActionButton type="submit">저장</ActionButton>
                  <CloseButton type="button" onClick={() => setEditingEvent(null)}>취소</CloseButton>
                </ButtonContainer>
              </Form>
            </>
          ) : isAddingEvent ? (
            // --- 2. 추가 모드일 때 ---
            <>
              <DetailsHeader>새 일정 추가</DetailsHeader>
              <Form onSubmit={handleSaveEvent}>
                <FormGroup><label htmlFor="title">제목</label><input type="text" name="title" id="title" value={newEvent.title} onChange={handleNewEventChange} required /></FormGroup>
                <FormGroup><FormRow><label>하루 종일</label><SwitchLabel><SwitchInput type="checkbox" name="isAllDay" checked={newEvent.isAllDay} onChange={handleNewEventChange} /><SwitchSlider /></SwitchLabel></FormRow></FormGroup>
                <FormGroup>
                  <label htmlFor="startDate">시작</label>
                  <input type={newEvent.isAllDay ? 'date' : 'datetime-local'} name="startDate" id="startDate"
                    value={newEvent.isAllDay ? toDateInputString(newEvent.startDate) : toDateTimeLocalString(newEvent.startDate)}
                    onChange={handleNewEventChange} />
                </FormGroup>
                <FormGroup>
                  <label htmlFor="endDate">종료</label>
                  <input type={newEvent.isAllDay ? 'date' : 'datetime-local'} name="endDate" id="endDate"
                    value={newEvent.isAllDay ? toDateInputString(newEvent.endDate) : toDateTimeLocalString(newEvent.endDate)}
                    onChange={handleNewEventChange} />
                </FormGroup>
                <FormGroup><label htmlFor="description">상세 설명</label><textarea name="description" id="description" rows={4} value={newEvent.description} onChange={handleNewEventChange}></textarea></FormGroup>
                <ButtonContainer>
                  <ActionButton type="submit">저장</ActionButton>
                  <CloseButton type="button" onClick={() => setIsAddingEvent(false)}>취소</CloseButton>
                </ButtonContainer>
              </Form>
            </>
          ) : selectedDate && (
            // --- 1. 상세 보기 모드일 때 ---
            <>
              <DetailsHeader>{selectedDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</DetailsHeader>
              {selectedDayEvents.length > 0 ? (
                selectedDayEvents.map(event => (
                  <EventDetailCard key={event.eventId}>
                    <h4>{event.title}</h4>
                    <p><strong>시간:</strong> {event.isAllDay ? '하루종일' : `${event.startDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} ~ ${event.endDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`}</p>
                    <p><strong>상세:</strong><br />{event.description}</p>
                    {/* --- ✨ 수정/삭제 버튼 추가 --- */}
                    <DetailButtonContainer>
                      <DetailButton onClick={() => setEditingEvent(event)}>일정 수정</DetailButton>
                      <DetailButton onClick={() => handleDeleteEvent(event.eventId)}>일정 삭제</DetailButton>
                    </DetailButtonContainer>
                  </EventDetailCard>
                ))
              ) : <p>선택된 날짜에 일정이 없습니다.</p>}
            </>
          )}
        </RightPanelContainer>
      </ModalContent>
    </ModalOverlay>
  );
};

export default CalendarModal;

