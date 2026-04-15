'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getWeekHabits, getMonthHabits, getAllHabits, saveHabitState, getHabitStats } from '@/lib/rud-habits';

interface HabitEntry {
  date: string;
  habitId: string;
  habitName: string;
  state: -1 | 0 | 1; // -1: skip, 0: not done, 1: done
}

const daysOfWeek = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function HabitTracker() {
  const [habits, setHabits] = useState<any[]>([]);
  const [weekHabits, setWeekHabits] = useState<Map<string, any>>(new Map());
  const [monthHabits, setMonthHabits] = useState<Map<string, any>>(new Map());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [weekStart, setWeekStart] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [monthStats, setMonthStats] = useState<Record<string, any>>({});

  // Get week start (Monday)
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  // Load data on mount and when dates change
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const allHabits = await getAllHabits();
        setHabits(allHabits);

        // Load week habits
        const weekStartStr = getWeekStart(weekStart).toISOString().split('T')[0];
        const weekData = await getWeekHabits(weekStartStr);
        const weekMap = new Map();
        weekData.forEach((item: any) => {
          const key = `${item.date}_${item.habit_id}`;
          weekMap.set(key, item);
        });
        setWeekHabits(weekMap);

        // Load month habits and stats
        const monthData = await getMonthHabits(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
        const monthMap = new Map();
        monthData.forEach((item: any) => {
          const key = `${item.date}_${item.habit_id}`;
          monthMap.set(key, item);
        });
        setMonthHabits(monthMap);

        // Get stats
        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        const startStr = firstDay.toISOString().split('T')[0];
        const endStr = lastDay.toISOString().split('T')[0];
        const stats = await getHabitStats(startStr, endStr);
        setMonthStats(stats);
      } catch (error) {
        console.error('Error loading habit data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [weekStart, currentMonth]);

  const handleHabitClick = async (habitName: string, date: string) => {
    const key = `${date}_${habits.find(h => h.name === habitName)?.id}`;
    const current = weekHabits.get(key)?.done ?? 0;
    const next = current === 1 ? -1 : current === -1 ? 0 : 1;

    try {
      await saveHabitState(habitName, date, next);
      const newMap = new Map(weekHabits);
      if (next === 0) {
        newMap.delete(key);
      } else {
        newMap.set(key, { done: next });
      }
      setWeekHabits(newMap);
    } catch (error) {
      console.error('Error saving habit state:', error);
    }
  };

  const getStateSymbol = (state?: number) => {
    if (state === 1) return '✓';
    if (state === -1) return '✕';
    return '';
  };

  const getStateColor = (state?: number) => {
    if (state === 1) return '#34C759';
    if (state === -1) return '#FF3B30';
    return '#E5E5EA';
  };

  // Week view
  const weekStart1 = getWeekStart(weekStart);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart1);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  // Month calendar
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Carregando hábitos...</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* WEEKLY VIEW */}
      <div style={{ marginBottom: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>📊 Semana Atual</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                const prev = new Date(weekStart);
                prev.setDate(prev.getDate() - 7);
                setWeekStart(prev);
              }}
              style={{ padding: '8px 12px', background: '#f0f0f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setWeekStart(new Date())}
              style={{ padding: '6px 12px', background: '#4040E8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
            >
              Hoje
            </button>
            <button
              onClick={() => {
                const next = new Date(weekStart);
                next.setDate(next.getDate() + 7);
                setWeekStart(next);
              }}
              style={{ padding: '8px 12px', background: '#f0f0f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${habits.length}, 1fr)`, gap: '16px', marginBottom: '24px' }}>
          {habits.map((habit) => (
            <div key={habit.id} style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: '#333' }}>{habit.name}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                {weekDates.map((date) => {
                  const habitData = habits.find(h => h.id === habit.id);
                  const key = `${date}_${habit.id}`;
                  const state = weekHabits.get(key)?.done;
                  return (
                    <button
                      key={date}
                      onClick={() => handleHabitClick(habit.name, date)}
                      style={{
                        width: '28px',
                        height: '28px',
                        border: 'none',
                        borderRadius: '6px',
                        background: getStateColor(state),
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title={daysOfWeek[new Date(date).getDay()]}
                    >
                      {getStateSymbol(state)}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '8px' }}>
                {monthStats[habit.name]?.percentage || 0}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MONTHLY VIEW */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>📅 Mês: {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                const prev = new Date(currentMonth);
                prev.setMonth(prev.getMonth() - 1);
                setCurrentMonth(prev);
              }}
              style={{ padding: '8px 12px', background: '#f0f0f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              style={{ padding: '6px 12px', background: '#4040E8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
            >
              Este Mês
            </button>
            <button
              onClick={() => {
                const next = new Date(currentMonth);
                next.setMonth(next.getMonth() + 1);
                setCurrentMonth(next);
              }}
              style={{ padding: '8px 12px', background: '#f0f0f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Month Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {habits.map((habit) => (
            <div key={`stat-${habit.id}`} style={{ background: '#f9f9f9', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>{habit.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, height: '6px', background: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      background: '#34C759',
                      width: `${monthStats[habit.name]?.percentage || 0}%`,
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, minWidth: '35px', textAlign: 'right' }}>
                  {monthStats[habit.name]?.percentage || 0}%
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '6px' }}>
                {monthStats[habit.name]?.done || 0} de {monthStats[habit.name]?.total || 0} dias
              </div>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {/* Day headers */}
            {daysOfWeek.map((day) => (
              <div key={`header-${day}`} style={{ textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#666', padding: '8px' }}>
                {day}
              </div>
            ))}
            {/* Empty cells for days before month starts */}
            {Array.from({ length: startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1 }).map((_, i) => (
              <div key={`empty-${i}`} style={{ padding: '8px' }} />
            ))}
            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
              const dateStr = date.toISOString().split('T')[0];

              // Count completed habits for this day
              let completedCount = 0;
              habits.forEach((habit) => {
                const key = `${dateStr}_${habit.id}`;
                if (monthHabits.get(key)?.done === 1) {
                  completedCount++;
                }
              });

              return (
                <div
                  key={`day-${day}`}
                  style={{
                    padding: '8px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    textAlign: 'center',
                    background: completedCount === habits.length && habits.length > 0 ? '#E8FAF0' : '#fafafa',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>{day}</div>
                  <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                    {completedCount}/{habits.length}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
