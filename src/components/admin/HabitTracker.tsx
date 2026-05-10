'use client';

import { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Flame, Trophy } from 'lucide-react';
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('⭐');

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

  const handleAddHabit = () => {
    if (!newHabitName.trim()) return;
    const newHabit = {
      id: Date.now().toString(),
      name: newHabitName,
      icon: newHabitIcon,
      color: `hsl(${Math.random() * 360}, 70%, 60%)`,
    };
    setHabits([...habits, newHabit]);
    setNewHabitName('');
    setNewHabitIcon('⭐');
    setShowAddForm(false);
  };

  const handleDeleteHabit = (id: string) => {
    setHabits(habits.filter(h => h.id !== id));
  };

  const tabItems: ViewTab[] = [
    { id: 'week', label: '📊 Semana', icon: '📊' },
    { id: 'month', label: '📅 Mês', icon: '📅' },
  ];

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '14px' }}>Carregando...</div>;
  }

  return (
    <div style={{ padding: '16px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      {/* Header Minimal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#1F2937' }}>Hábitos</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9CA3AF' }}>{habits.length} ativos • {weekCompleteCount} hoje</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            background: '#4040E8',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = '#3333D0'}
          onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = '#4040E8'}
        >
          <Plus size={16} /> Novo
        </button>
      </div>

      {/* Add Habit Form */}
      {showAddForm && (
        <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '12px', marginBottom: '16px', display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: '8px' }}>
          <input
            type="text"
            placeholder="Nome do hábito"
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddHabit()}
            style={{
              padding: '8px 10px',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              fontSize: '13px',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Ícone"
            value={newHabitIcon}
            onChange={(e) => setNewHabitIcon(e.target.value.slice(0, 1))}
            style={{
              padding: '8px 10px',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              fontSize: '13px',
              fontFamily: 'inherit',
              outline: 'none',
              textAlign: 'center',
            }}
          />
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={handleAddHabit}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: '#10B981',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Salvar
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              style={{
                padding: '8px 10px',
                background: '#EF4444',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', borderBottom: '1px solid #E5E7EB', paddingBottom: '0' }}>
        {tabItems.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 14px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #4040E8' : '2px solid transparent',
              color: activeTab === tab.id ? '#4040E8' : '#6B7280',
              fontWeight: activeTab === tab.id ? 600 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* WEEKLY VIEW */}
      {activeTab === 'week' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>
              {new Date(weekStart1).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} a {new Date(new Date(weekStart1).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
            </p>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => { const prev = new Date(weekStart); prev.setDate(prev.getDate() - 7); setWeekStart(prev); }} style={{ padding: '6px 10px', background: '#F3F4F6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><ChevronLeft size={14} /></button>
              <button onClick={() => setWeekStart(new Date())} style={{ padding: '6px 10px', background: '#4040E8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>Hoje</button>
              <button onClick={() => { const next = new Date(weekStart); next.setDate(next.getDate() + 7); setWeekStart(next); }} style={{ padding: '6px 10px', background: '#F3F4F6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><ChevronRight size={14} /></button>
            </div>
          </div>

          {/* Week Table Compact */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden', fontSize: '12px' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '140px repeat(7, 1fr) 40px', gap: '0', borderBottom: '1px solid #E5E7EB', background: '#FAFAFA' }}>
              <div style={{ padding: '10px 12px', fontWeight: 600, fontSize: '11px', color: '#6B7280' }}>Hábito</div>
              {weekDates.map((date, idx) => {
                const d = new Date(date);
                return (
                  <div key={date} style={{ padding: '10px 8px', fontWeight: 600, fontSize: '11px', color: '#6B7280', textAlign: 'center' }}>
                    <div>{daysOfWeek[idx]}</div>
                  </div>
                );
              })}
              <div style={{ padding: '10px 8px', fontWeight: 600, fontSize: '11px', color: '#6B7280', textAlign: 'center' }}>%</div>
            </div>

            {/* Rows */}
            {habits.map((habit, habitIdx) => {
              const completedDays = weekDates.filter(date => weekHabits.get(`${date}_${habit.id}`)?.done === 1).length;
              const percent = Math.round((completedDays / 7) * 100);
              return (
                <div key={habit.id} style={{ display: 'grid', gridTemplateColumns: '140px repeat(7, 1fr) 40px', gap: '0', borderBottom: habitIdx < habits.length - 1 ? '1px solid #E5E7EB' : 'none' }}>
                  {/* Habit Name */}
                  <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px', borderRight: '1px solid #E5E7EB', background: '#FAFAFA' }}>
                    <span style={{ fontSize: '16px' }}>{habit.icon}</span>
                    <span style={{ fontWeight: 500, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11px' }}>{habit.name}</span>
                  </div>

                  {/* Day cells */}
                  {weekDates.map((date, idx) => {
                    const key = `${date}_${habit.id}`;
                    const isDone = weekHabits.get(key)?.done === 1;
                    return (
                      <div key={date} style={{ padding: '8px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: idx < 6 ? '1px solid #E5E7EB' : 'none' }}>
                        <button onClick={() => handleHabitClick(habit.id, date)} style={{ width: '24px', height: '24px', border: isDone ? `1.5px solid ${habit.color}` : '1.5px solid #E5E7EB', borderRadius: '5px', background: isDone ? habit.color : '#fff', color: isDone ? '#fff' : '#D1D5DB', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }} onMouseEnter={(e) => { if (!isDone) { (e.currentTarget as HTMLElement).style.borderColor = habit.color; } }} onMouseLeave={(e) => { if (!isDone) { (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'; } }}>
                          {isDone ? '✓' : ''}
                        </button>
                      </div>
                    );
                  })}

                  {/* Percentage */}
                  <div style={{ padding: '10px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: habit.color, fontSize: '11px', borderLeft: '1px solid #E5E7EB', background: '#FAFAFA' }}>
                    {percent}%
                  </div>
                </div>
              );
            })}

            {/* Delete buttons row */}
            {habits.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '140px repeat(7, 1fr) 40px', gap: '0', borderTop: '1px solid #E5E7EB', background: '#FAFAFA' }}>
                <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>Ações</div>
                {habits.map((habit, idx) => (
                  <div key={`del-${habit.id}`} style={{ padding: '6px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: idx < 6 ? '1px solid #E5E7EB' : 'none' }}>
                    <button
                      onClick={() => handleDeleteHabit(habit.id)}
                      title="Deletar"
                      style={{
                        width: '20px',
                        height: '20px',
                        border: 'none',
                        borderRadius: '4px',
                        background: '#FEE2E2',
                        color: '#EF4444',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <div style={{ padding: '6px 8px' }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* MONTHLY VIEW */}
      {activeTab === 'month' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </p>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => { const prev = new Date(currentMonth); prev.setMonth(prev.getMonth() - 1); setCurrentMonth(prev); }} style={{ padding: '6px 10px', background: '#F3F4F6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><ChevronLeft size={14} /></button>
              <button onClick={() => setCurrentMonth(new Date())} style={{ padding: '6px 10px', background: '#4040E8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>Este Mês</button>
              <button onClick={() => { const next = new Date(currentMonth); next.setMonth(next.getMonth() + 1); setCurrentMonth(next); }} style={{ padding: '6px 10px', background: '#F3F4F6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><ChevronRight size={14} /></button>
            </div>
          </div>

          {/* Stats Grid Compact */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginBottom: '12px' }}>
            {habits.map(habit => {
              const stat = monthStats[habit.name] || { percentage: 0, done: 0, total: 0 };
              return (
                <div key={`stat-${habit.id}`} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '10px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '14px' }}>{habit.icon}</span>
                    <div style={{ fontWeight: 600, flex: 1, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{habit.name}</div>
                  </div>
                  <div style={{ height: '4px', background: '#E5E7EB', borderRadius: '2px', overflow: 'hidden', marginBottom: '4px' }}>
                    <div style={{ height: '100%', background: habit.color, width: `${stat.percentage}%`, transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ color: '#6B7280', fontWeight: 600 }}>{stat.percentage}%</div>
                </div>
              );
            })}
          </div>

          {/* Month Calendar Compact */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '12px', fontSize: '11px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {/* Day headers */}
              {daysOfWeek.map(day => (
                <div key={`header-${day}`} style={{ textAlign: 'center', fontWeight: 600, color: '#6B7280', padding: '6px', textTransform: 'uppercase' }}>
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
                  <div key={`day-${day}`} style={{ padding: '6px 2px', border: '1px solid #E5E7EB', borderRadius: '4px', textAlign: 'center', background: isComplete ? '#ECFDF5' : '#FAFAFA' }}>
                    <div style={{ fontWeight: 600, color: '#1F2937', fontSize: '10px' }}>{day}</div>
                    <div style={{ fontSize: '9px', color: isComplete ? '#10B981' : '#9CA3AF', marginTop: '2px' }}>
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
