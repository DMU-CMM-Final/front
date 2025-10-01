import React, { useState } from 'react';
import {
  CalendarWrapper,
  CalendarHeader,
  NavButton,
  DaysGrid,
  DayName,
  DayCell,
  EventDot,
} from './Calendar.styles';

interface CalendarEvent {
  eventId: number;
  tId: number | null;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
}

interface MiniCalendarProps {
  onClick: () => void;
  events: CalendarEvent[];
  onMonthChange: (date: Date) => void;
}

const Calendar: React.FC<MiniCalendarProps> = ({ onClick, events, onMonthChange }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const changeMonth = (amount: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + amount);
    setCurrentDate(newDate);
    onMonthChange(newDate);
  };

  const renderHeader = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    return (
      <CalendarHeader>
        <NavButton onClick={(e) => { e.stopPropagation(); changeMonth(-1); }}>&lt;</NavButton>
        <span>{`${year}년 ${month}월`}</span>
        <NavButton onClick={(e) => { e.stopPropagation(); changeMonth(1); }}>&gt;</NavButton>
      </CalendarHeader>
    );
  };

  const renderDays = () => {
    const today = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

    dayNames.forEach(name => days.push(<DayName key={name}>{name}</DayName>));
    for (let i = 0; i < firstDayOfMonth; i++) { days.push(<div key={`empty-${i}`} />); }

    const eventDates = new Set(events.map(event => new Date(event.startDate).toDateString()));

    for (let day = 1; day <= daysInMonth; day++) {
      const loopDate = new Date(year, month, day);
      const hasEvent = eventDates.has(loopDate.toDateString());
      
      days.push(
        <DayCell key={day} $isToday={today.toDateString() === loopDate.toDateString()}>
          {day}
          {hasEvent && <EventDot />}
        </DayCell>
      );
    }
    return <DaysGrid>{days}</DaysGrid>;
  };

  return (
    <CalendarWrapper onClick={onClick}>
      {renderHeader()}
      {renderDays()}
    </CalendarWrapper>
  );
};

export default Calendar;