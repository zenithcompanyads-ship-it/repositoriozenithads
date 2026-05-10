'use client';

import { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Flame, Trophy, Star, Target } from 'lucide-react';
import { getWeekHabits, getMonthHabits, getAllHabits, saveHabitState, getHabitStats } from '@/lib/rud-habits';

const PRESET_HABITS = [
  { id: '1', name: 'Tomar mais água', icon: '💧', color: '#3B82F6' },
  { id: '2', name: 'Estudar 1h/30min de inglês', icon: '🎓', color: '#8B5CF6' },
  { id: '3', name: 'Enviar relatório na semana', icon: '📊', color: '#EC4899' },
  { id: '4', name: 'Não adiar uma reunião', icon: '📞', color: '#F59E0B' },
  { id: '5', name: 'Falar com meu gestor', icon: '💬', color: '#10B981' },
  { id: '6', name: 'Pensar sobre a viagem', icon: '✈️', color: '#06B6D4' },
];

const daysOfWeek = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface ViewTab {
  id: 'week' | 'month';
  label: string;
  icon: string;
}

export function HabitTracker() {
  const [habits, setHabits] = useState(PRESET_HABITS);
  const [weekHabits, setWeekHabits] = useState<Map<string, any>>(new Map());
  const [monthHabits, setMonthHabits] = useState<Map<string, any>>(new Map());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [weekStart, setWeekStart] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [monthStats, setMonthStats] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'week' | 'month'>('week');

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const weekStartStr = getWeekStart(weekStart).toISOString().split('T')[0];
        const weekData = await getWeekHabits(weekStartStr);
        const weekMap = new Map();
        weekData.forEach((item: any) => {
          const key = `${item.date}_${item.habit_id}`;
          weekMap.set(key, item);
        });
        setWeekHabits(weekMap);

        const monthData = await getMonthHabits(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
        const monthMap = new Map();
        monthData.forEach((item: any) => {
          const key = `${item.date}_${item.habit_id}`;
          monthMap.set(key, item);
        });
        setMonthHabits(monthMap);

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

  const handleHabitClick = async (habitId: string, date: string) => {
    const key = `${date}_${habitId}`;
    const current = weekHabits.get(key)?.done ?? 0;
    const next = current === 1 ? 0 : 1;
    const habitName = habits.find(h => h.id === habitId)?.name || '';

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

  const weekStart1 = getWeekStart(weekStart);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart1);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const weekCompleteCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    let count = 0;
    habits.forEach(habit => {
      const key = `${today}_${habit.id}`;
      if (weekHabits.get(key)?.done === 1) count++;
    });
    return count;
  }, [weekHabits, habits]);

  const totalPoints = useMemo(() => {
    return Object.values(monthStats).reduce((sum: number, stat: any) => sum + (stat.done * 10), 0);
  }, [monthStats]);

  const tabItems: ViewTab[] = [
    { id: 'week', label: 'Semana', icon: '📊' },
    { id: 'month', label: 'Mês', icon: '📅' },
  ];

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Carregando hábitos...</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      {/* Header with Gamification */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: '#1F2937', marginBottom: '4px' }}>
              Rastreador de Hábitos
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>Acompanhe seu progresso e conquiste suas metas</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
          <div style={{ background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)', borderRadius: '12px', padding: '16px', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Flame size={20} />
              <span style={{ fontSize: '12px', fontWeight: 600 }}>Hoje</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{weekCompleteCount}/{habits.length}</div>
            <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>concluídos</div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #F093FB 0%, #F5576C 100%)', borderRadius: '12px', padding: '16px', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Trophy size={20} />
              <span style={{ fontSize: '12px', fontWeight: 600 }}>Pontos</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{totalPoints}</div>
            <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>este mês</div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)', borderRadius: '12px', padding: '16px', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Star size={20} />
              <span style={{ fontSize: '12px', fontWeight: 600 }}>Taxa Média</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700 }}>
              {Math.round((Object.values(monthStats) as any[]).reduce((sum, s) => sum + (s.percentage || 0), 0) / habits.length)}%
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>conclusão</div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #FA709A 0%, #FEE140 100%)', borderRadius: '12px', padding: '16px', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Target size={20} />
              <span style={{ fontSize: '12px', fontWeight: 600 }}>Hábitos</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{habits.length}</div>
            <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>ativos</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #E5E7EB', paddingBottom: '0' }}>
        {tabItems.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #4040E8' : '2px solid transparent',
              color: activeTab === tab.id ? '#4040E8' : '#6B7280',
              fontWeight: activeTab === tab.id ? 600 : 500,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ marginRight: '6px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* WEEKLY VIEW */}
      {activeTab === 'week' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1F2937', marginBottom: '4px' }}>
                Semana de {new Date(weekStart1).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>Complete os hábitos diários</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  const prev = new Date(weekStart);
                  prev.setDate(prev.getDate() - 7);
                  setWeekStart(prev);
                }}
                style={{ padding: '8px 12px', background: '#F3F4F6', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#1F2937' }}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setWeekStart(new Date())}
                style={{ padding: '8px 16px', background: '#4040E8', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, fontSize: '13px' }}
              >
                Hoje
              </button>
              <button
                onClick={() => {
                  const next = new Date(weekStart);
                  next.setDate(next.getDate() + 7);
                  setWeekStart(next);
                }}
                style={{ padding: '8px 12px', background: '#F3F4F6', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#1F2937' }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Week Table */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '200px repeat(7, 1fr)', gap: '0', borderBottom: '1px solid #E5E7EB' }}>
              <div style={{ padding: '14px 16px', fontWeight: 600, fontSize: '13px', color: '#6B7280', textTransform: 'uppercase' }}>Hábito</div>
              {weekDates.map((date, idx) => {
                const d = new Date(date);
                return (
                  <div
                    key={date}
                    style={{
                      padding: '14px 12px',
                      fontWeight: 600,
                      fontSize: '12px',
                      color: '#6B7280',
                      textAlign: 'center',
                      borderRight: idx < 6 ? '1px solid #E5E7EB' : 'none',
                    }}
                  >
                    <div>{daysOfWeek[idx]}</div>
                    <div style={{ fontSize: '11px', marginTop: '2px', color: '#9CA3AF' }}>{d.getDate()}</div>
                  </div>
                );
              })}
            </div>

            {/* Rows */}
            {habits.map((habit, habitIdx) => {
              const completedDays = weekDates.filter(date => weekHabits.get(`${date}_${habit.id}`)?.done === 1).length;
              return (
                <div
                  key={habit.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '200px repeat(7, 1fr)',
                    gap: '0',
                    borderBottom: habitIdx < habits.length - 1 ? '1px solid #E5E7EB' : 'none',
                  }}
                >
                  {/* Habit Name */}
                  <div
                    style={{
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      borderRight: '1px solid #E5E7EB',
                      background: '#FAFAFA',
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{habit.icon}</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937' }}>{habit.name}</div>
                      <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{completedDays}/7</div>
                    </div>
                  </div>

                  {/* Day cells */}
                  {weekDates.map((date, idx) => {
                    const key = `${date}_${habit.id}`;
                    const isDone = weekHabits.get(key)?.done === 1;
                    return (
                      <div
                        key={date}
                        style={{
                          padding: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRight: idx < 6 ? '1px solid #E5E7EB' : 'none',
                          background: isDone ? `${habit.color}15` : '#fff',
                        }}
                      >
                        <button
                          onClick={() => handleHabitClick(habit.id, date)}
                          style={{
                            width: '36px',
                            height: '36px',
                            border: isDone ? `2px solid ${habit.color}` : '2px solid #E5E7EB',
                            borderRadius: '8px',
                            background: isDone ? habit.color : '#fff',
                            color: isDone ? '#fff' : '#D1D5DB',
                            fontWeight: 700,
                            fontSize: '16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            if (!isDone) {
                              (e.currentTarget as HTMLElement).style.borderColor = habit.color;
                              (e.currentTarget as HTMLElement).style.color = habit.color;
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isDone) {
                              (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB';
                              (e.currentTarget as HTMLElement).style.color = '#D1D5DB';
                            }
                          }}
                        >
                          {isDone ? '✓' : ''}
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MONTHLY VIEW */}
      {activeTab === 'month' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1F2937' }}>
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>Seu progresso do mês</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  const prev = new Date(currentMonth);
                  prev.setMonth(prev.getMonth() - 1);
                  setCurrentMonth(prev);
                }}
                style={{ padding: '8px 12px', background: '#F3F4F6', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                style={{ padding: '8px 16px', background: '#4040E8', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}
              >
                Este Mês
              </button>
              <button
                onClick={() => {
                  const next = new Date(currentMonth);
                  next.setMonth(next.getMonth() + 1);
                  setCurrentMonth(next);
                }}
                style={{ padding: '8px 12px', background: '#F3F4F6', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            {habits.map(habit => {
              const stat = monthStats[habit.name] || { percentage: 0, done: 0, total: 0 };
              return (
                <div
                  key={`stat-${habit.id}`}
                  style={{
                    background: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                    padding: '16px',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '20px' }}>{habit.icon}</span>
                    <div style={{ fontSize: '13px', fontWeight: 600, flex: 1, color: '#1F2937' }}>{habit.name}</div>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', color: '#6B7280' }}>Conclusão</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: habit.color }}>{stat.percentage}%</span>
                    </div>
                    <div style={{ height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          background: habit.color,
                          width: `${stat.percentage}%`,
                          transition: 'width 0.3s',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: '#6B7280' }}>
                    <strong style={{ color: '#1F2937' }}>{stat.done}</strong> de <strong>{stat.total}</strong> dias
                  </div>
                </div>
              );
            })}
          </div>

          {/* Month Calendar */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
              {/* Day headers */}
              {daysOfWeek.map(day => (
                <div key={`header-${day}`} style={{ textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6B7280', padding: '12px', textTransform: 'uppercase' }}>
                  {day}
                </div>
              ))}
              {/* Empty cells */}
              {Array.from({ length: startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1 }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {/* Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                const dateStr = date.toISOString().split('T')[0];

                let completedCount = 0;
                habits.forEach(habit => {
                  const key = `${dateStr}_${habit.id}`;
                  if (monthHabits.get(key)?.done === 1) completedCount++;
                });

                const isComplete = completedCount === habits.length && habits.length > 0;
                return (
                  <div
                    key={`day-${day}`}
                    style={{
                      padding: '12px 8px',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      textAlign: 'center',
                      background: isComplete ? '#ECFDF5' : '#FAFAFA',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937' }}>{day}</div>
                    <div style={{ fontSize: '11px', color: isComplete ? '#10B981' : '#9CA3AF', marginTop: '4px', fontWeight: 500 }}>
                      {completedCount}/{habits.length}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
