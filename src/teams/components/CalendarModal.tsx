import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import Calendar from 'react-calendar';
import Holidays from 'date-holidays';
import { useAuth } from '../../contexts/AuthContext';
import { Socket } from 'socket.io-client';

// --- 타입 정의 ---
interface CalendarEvent {
  eventId: number;
  tId: number | null;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  socket: Socket | null;
  teamId: number | null;
  events: CalendarEvent[];
  activeDate: Date;
  onMonthChange: (date: Date) => void;
  showAllEvents: boolean;
  onToggleShowAll: (show: boolean) => void;
  onEventAdded: (newEvent: CalendarEvent) => void;
}

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
  position: relative;
`;
const RightPanelContainer = styled.div`
  width: 320px;
  margin-left: 24px;
  padding-left: 24px;
  border-left: 1px solid #e0e0e0;
  min-height: 520px;
  display: flex;
  flex-direction: column;
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
  .react-calendar__tile--now:enabled:hover,
  .react-calendar__tile--now:enabled:focus {
    background: #f0f0f0;
  }
  button.react-calendar__tile--active,
  button.react-calendar__tile--active:enabled:hover,
  button.react-calendar__tile--active:enabled:focus {
    background: none;
    color: #000;
    border: 2px solid #B8B6F2;
    border-radius: 8px;
  }
  .saturday { color: #007bff; }
  .holiday abbr { color: #d93b3b; }
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
const HolidayName = styled.div`
  color: #d93b3b;
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
`;
const Form = styled.form` display: flex; flex-direction: column; gap: 15px; `;
const FormGroup = styled.div`
  display: flex; flex-direction: column; gap: 5px;
  label { font-size: 0.9rem; font-weight: bold; }
  input, textarea, select { padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 1rem; }
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
const EmptyPanel = styled.div`
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; color: #888; text-align: center;
`;
const AddEventButton = styled(ActionButton)`
  margin-top: 16px;
`;
const ToggleContainer = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  z-index: 10;
`;

// --- 헬퍼 함수 ---
const toDateTimeLocalString = (date: Date) => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    console.warn("Invalid date passed to toDateTimeLocalString:", date);
    date = new Date();
  }
  const ten = (i: number) => (i < 10 ? '0' : '') + i;
  return `${date.getFullYear()}-${ten(date.getMonth() + 1)}-${ten(date.getDate())}T${ten(date.getHours())}:${ten(date.getMinutes())}`;
};
const toDateInputString = (date: Date) => {
   if (!(date instanceof Date) || isNaN(date.getTime())) {
     console.warn("Invalid date passed to toDateInputString:", date);
     date = new Date();
  }
  return toDateTimeLocalString(date).slice(0, 10);
};
const formatDateTimeForServer = (date: Date) => {
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};
const hd = new Holidays('KR');

// --- 컴포넌트 ---
const CalendarModal: React.FC<Props> = ({
  isOpen,
  onClose,
  socket,
  teamId,
  events,
  activeDate,
  onMonthChange,
  showAllEvents,
  onToggleShowAll,
  onEventAdded
}) => {
  const { userEmail } = useAuth();

  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const [newEvent, setNewEvent] = useState({
    title: '', description: '', startDate: new Date(),
    endDate: new Date(Date.now() + 60 * 60 * 1000), isAllDay: false, tId: teamId
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      setSelectedDate(null);
      setIsAddingEvent(false);
      setEditingEvent(null);
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const getColorForTId = useCallback((tId: number | null): string => {
    if (tId !== null && tId !== undefined) {
      return '#8B4513';
    }
    return '#B8B6F2';
  }, []);

  const handleShowAddForm = () => {
    setIsAddingEvent(true);
    const baseDate = selectedDate ? new Date(selectedDate) : new Date();
    const currentTime = new Date();
    baseDate.setHours(currentTime.getHours(), currentTime.getMinutes());

    setNewEvent({
        title: '', description: '', startDate: baseDate,
        endDate: new Date(baseDate.getTime() + 60 * 60 * 1000),
        isAllDay: false, tId: teamId
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

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !userEmail || !newEvent.title) {
        alert("제목을 입력해주세요.");
        return;
    }

    let finalStartDate: Date;
    let finalEndDate: Date;
    let finalStartDateString: string;
    let finalEndDateString: string;

    const baseStartDate = newEvent.startDate instanceof Date && !isNaN(newEvent.startDate.getTime())
                           ? newEvent.startDate
                           : new Date();

    if (newEvent.isAllDay) {
        finalStartDate = new Date(baseStartDate);
        finalStartDate.setHours(0, 0, 0, 0);
        finalEndDate = new Date(baseStartDate);
        finalEndDate.setHours(0, 0, 0, 0);
    } else {
        finalStartDate = baseStartDate;
        finalEndDate = newEvent.endDate instanceof Date && !isNaN(newEvent.endDate.getTime())
                       ? newEvent.endDate
                       : new Date(finalStartDate.getTime() + 60 * 60 * 1000);
    }
    finalStartDateString = formatDateTimeForServer(finalStartDate);
    finalEndDateString = formatDateTimeForServer(finalEndDate);


    const payload = {
        uId: userEmail, tId: teamId, title: newEvent.title, description: newEvent.description,
        isAllDay: newEvent.isAllDay, startDate: finalStartDateString, endDate: finalEndDateString,
    };
    socket.emit('calendar-new', payload);

    const localNewEvent: CalendarEvent = {
        eventId: Date.now(),
        tId: teamId,
        title: newEvent.title,
        description: newEvent.description,
        startDate: new Date(finalStartDate), // Ensure it's a Date object
        endDate: new Date(finalEndDate),     // Ensure it's a Date object
        isAllDay: newEvent.isAllDay
    };
    console.log("Locally adding event:", localNewEvent);
    onEventAdded(localNewEvent);

    setIsAddingEvent(false);
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

  const handleUpdateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !userEmail || !editingEvent) return;

    let finalStartDate: Date;
    let finalEndDate: Date;
    let finalStartDateString: string;
    let finalEndDateString: string;

    const baseStartDate = editingEvent.startDate instanceof Date && !isNaN(editingEvent.startDate.getTime())
                           ? editingEvent.startDate
                           : new Date(); // Fallback to current date if invalid

    if (editingEvent.isAllDay) {
        finalStartDate = new Date(baseStartDate);
        finalStartDate.setHours(0, 0, 0, 0);
        finalEndDate = new Date(baseStartDate);
        finalEndDate.setHours(0, 0, 0, 0);
    } else {
        finalStartDate = baseStartDate;
        finalEndDate = editingEvent.endDate instanceof Date && !isNaN(editingEvent.endDate.getTime())
                       ? editingEvent.endDate
                       : new Date(finalStartDate.getTime() + 60 * 60 * 1000); // Fallback if invalid
    }
    finalStartDateString = formatDateTimeForServer(finalStartDate);
    finalEndDateString = formatDateTimeForServer(finalEndDate);

    const payload = {
        eventId: editingEvent.eventId,
        uId: userEmail,
        tId: editingEvent.tId,
        title: editingEvent.title,
        description: editingEvent.description,
        isAllDay: editingEvent.isAllDay,
        startDate: finalStartDateString,
        endDate: finalEndDateString,
    };

    socket.emit('calendar-update', payload);
    setEditingEvent(null); // Close edit form after sending update
  };

  const handleDeleteEvent = (eventId: number) => {
    if (!socket || !window.confirm("정말로 이 일정을 삭제하시겠습니까?")) return;
    socket.emit('calendar-delete', { eventId });
    setSelectedDate(null); // Clear selection after delete
    setEditingEvent(null); // Close edit form if open
  };

  const handleActiveStartDateChange = ({ activeStartDate }: { activeStartDate: Date | null }) => {
    if (activeStartDate) {
      onMonthChange(activeStartDate);
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsAddingEvent(false);
    setEditingEvent(null);
  };

  const renderTileContent = ({ date, view }: { date: Date, view: string }) => {
    if (view !== 'month') return null;

    const holidayInfo = hd.isHoliday(date);
    const isPublicHoliday = holidayInfo && holidayInfo.length > 0 && holidayInfo[0].type === 'public';

    const dayEvents = events.filter(event => {
        const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);
        const eventStart = event.startDate instanceof Date ? new Date(event.startDate) : null;
        const eventEnd = event.endDate instanceof Date ? new Date(event.endDate) : null;

        if (!eventStart || !eventEnd) return false;
        eventStart.setHours(0,0,0,0);
        eventEnd.setHours(23,59,59,999);

        return dayStart <= eventEnd && dayEnd >= eventStart;
    });

    const maxEventsToShow = isPublicHoliday ? 1 : 2;

    return (
        <>
            {isPublicHoliday && (
                <HolidayName title={holidayInfo[0].name}>{holidayInfo[0].name}</HolidayName>
            )}
            {dayEvents.slice(0, maxEventsToShow).map(event => (
                <EventHighlighter
                    key={event.eventId}
                    color={getColorForTId(event.tId)}
                    opacity={event.isAllDay ? 1 : 0.5}
                    title={event.title}
                >
                    {event.title}
                </EventHighlighter>
            ))}
        </>
    );
  };

  const renderRightPanelContent = () => {
    if (isAddingEvent || editingEvent) {
      const isEditMode = !!editingEvent;
      const currentEventData = isEditMode ? editingEvent : newEvent;
      const handleChange = isEditMode ? handleEditEventChange : handleNewEventChange;
      const handleSubmit = isEditMode ? handleUpdateEvent : handleSaveEvent;
      const handleCancel = () => {
        setIsAddingEvent(false);
        setEditingEvent(null);
      };

      return (
        <>
          <DetailsHeader>{isEditMode ? '일정 수정' : '새 일정 추가'}</DetailsHeader>
          <Form onSubmit={handleSubmit}>
            <FormGroup><label htmlFor="title">제목</label><input type="text" name="title" id="title" value={currentEventData.title} onChange={handleChange} required /></FormGroup>
            <FormGroup><FormRow><label>하루 종일</label><SwitchLabel><SwitchInput type="checkbox" name="isAllDay" checked={currentEventData.isAllDay} onChange={handleChange} /><SwitchSlider /></SwitchLabel></FormRow></FormGroup>
            <FormGroup>
              <label htmlFor="startDate">시작</label>
              <input type={currentEventData.isAllDay ? 'date' : 'datetime-local'} name="startDate" id="startDate"
                  value={currentEventData.isAllDay ? toDateInputString(currentEventData.startDate) : toDateTimeLocalString(currentEventData.startDate)}
                  onChange={handleChange} />
            </FormGroup>
            {!currentEventData.isAllDay && (
              <FormGroup>
                <label htmlFor="endDate">종료</label>
                <input type={'datetime-local'} name="endDate" id="endDate"
                    value={toDateTimeLocalString(currentEventData.endDate)}
                    onChange={handleChange} />
              </FormGroup>
            )}
            <FormGroup><label htmlFor="description">상세 설명</label><textarea name="description" id="description" rows={4} value={currentEventData.description} onChange={handleChange}></textarea></FormGroup>
            <ButtonContainer style={{ marginTop: 'auto' }}>
                <ActionButton type="submit">저장</ActionButton>
                <CloseButton type="button" onClick={handleCancel}>취소</CloseButton>
            </ButtonContainer>
          </Form>
        </>
      );
    }

    if (selectedDate) {
      const selectedDayEvents = events.filter(event => {
        const dayStart = new Date(selectedDate); dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(selectedDate); dayEnd.setHours(23, 59, 59, 999);
        const eventStart = event.startDate instanceof Date ? new Date(event.startDate) : null;
        const eventEnd = event.endDate instanceof Date ? new Date(event.endDate) : null;

        if (!eventStart || !eventEnd) return false;
        eventStart.setHours(0,0,0,0);
        eventEnd.setHours(23,59,59,999);

        return dayStart <= eventEnd && dayEnd >= eventStart;
      });

      console.log("Rendering details for selected day events:", selectedDayEvents.map(e => ({
          id: e.eventId, title: e.title, start: e.startDate, isDate: e.startDate instanceof Date, end: e.endDate, isEndDate: e.endDate instanceof Date
      })));

      return (
        <>
          <DetailsHeader>{selectedDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</DetailsHeader>
          {selectedDayEvents.length > 0 ? (
            selectedDayEvents.map(event => {
              const isValidStartDate = event.startDate instanceof Date && !isNaN(event.startDate.getTime());
              const isValidEndDate = event.endDate instanceof Date && !isNaN(event.endDate.getTime());

              const startTime = isValidStartDate
                ? event.startDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                : '시간 정보 없음';
              const endTime = isValidEndDate
                ? event.endDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <EventDetailCard key={event.eventId}>
                  <h4>{event.title}</h4>
                  <p><strong>시간:</strong> {event.isAllDay ? '하루종일' : `${startTime}${endTime && startTime !== endTime ? ` ~ ${endTime}` : ''}`}</p>
                  <p><strong>상세:</strong><br />{event.description}</p>
                  <DetailButtonContainer>
                    <DetailButton onClick={() => setEditingEvent(event)}>일정 수정</DetailButton>
                    <DetailButton onClick={() => handleDeleteEvent(event.eventId)}>일정 삭제</DetailButton>
                  </DetailButtonContainer>
                </EventDetailCard>
              );
            })
          ) : (
             <EmptyPanel>
                <p>등록된 일정이 없습니다.</p>
                <AddEventButton onClick={handleShowAddForm}>새 일정 추가</AddEventButton>
            </EmptyPanel>
          )}
        </>
      );
    }
    return (
      <EmptyPanel>
        <p style={{ fontSize: '1.2rem', marginBottom: '10px' }}>🗓️</p>
        <p>날짜를 선택하여<br/>일정을 확인하거나<br/>새 일정을 추가하세요.</p>
      </EmptyPanel>
    );
  };


  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
       <ModalContent onClick={(e) => e.stopPropagation()}>
          <CalendarContainer>
            <ToggleContainer>
              <span>전체 일정 보기</span>
              <SwitchLabel>
                <SwitchInput
                  type="checkbox"
                  checked={showAllEvents}
                  onChange={(e) => onToggleShowAll(e.target.checked)}
                />
                <SwitchSlider />
              </SwitchLabel>
            </ToggleContainer>
            <CalendarWrapper>
              {loading && <div style={{ position: 'absolute', zIndex: 1, top: '50%', left: '50%', transform: 'translate(-50%, -50%)'}}>로딩 중...</div>}
              <Calendar
                calendarType="gregory" formatDay={(locale, date) => date.getDate().toString()}
                tileClassName={({ date, view }) => {
                  if (view === 'month') {
                    const isHoliday = hd.isHoliday(date);
                    const classNames = [];
                    if ((isHoliday && isHoliday.length > 0 && isHoliday[0].type === 'public') || date.getDay() === 0) {
                      classNames.push('holiday');
                    }
                    if (date.getDay() === 6) {
                      classNames.push('saturday');
                    }
                    return classNames.join(' ');
                  }
                  return null;
                }}
                onActiveStartDateChange={handleActiveStartDateChange} tileContent={renderTileContent} onClickDay={handleDateClick}
                value={activeDate}
              />
            </CalendarWrapper>
            <ButtonContainer>
              <ActionButton onClick={handleShowAddForm}>일정 추가</ActionButton>
              <CloseButton onClick={onClose}>닫기</CloseButton>
            </ButtonContainer>
          </CalendarContainer>
          <RightPanelContainer>
            {renderRightPanelContent()}
          </RightPanelContainer>
       </ModalContent>
    </ModalOverlay>
  );
};

export default CalendarModal;