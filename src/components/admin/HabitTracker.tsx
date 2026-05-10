'use client';

import { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Flame, Trophy } from 'lucide-react';
import { getWeekHabits, getMonthHabits, getAllHabits, saveHabitState, batchSaveHabitStates, getHabitStats } from '@/lib/rud-habits';

const BLACK = '#0F172A';

const PRESET_HABITS = [
  { id: '1', name: 'Tomar mais água', icon: '💧', color: BLACK },
  { id: '2', name: 'Estudar 1h/30min de inglês', icon: '🎓', color: BLACK },
  { id: '3', name: 'Enviar relatório na semana', icon: '📊', color: BLACK },
  { id: '4', name: 'Não adiar uma reunião', icon: '📞', color: BLACK },
  { id: '5', name: 'Falar com meu gestor', icon: '💬', color: BLACK },
  { id: '6', name: 'Pensar sobre a viagem', icon: '✈️', color: BLACK },
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
  const [saving, setSaving] = useState(false);

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
          // Match DB habit name to local habit ID (DB uses UUID, UI uses '1','2'...)
          const localHabit = habits.find(h => h.name === item.rud_habits?.name);
          if (!localHabit) return;
          const isDone = item.done === true || item.done === 1 ? 1 : 0;
          if (isDone === 1) {
            const key = `${item.date}_${localHabit.id}`;
            weekMap.set(key, { done: 1 });
          }
        });
        setWeekHabits(weekMap);

        const monthData = await getMonthHabits(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
        const monthMap = new Map();
        monthData.forEach((item: any) => {
          const localHabit = habits.find(h => h.name === item.rud_habits?.name);
          if (!localHabit) return;
          const isDone = item.done === true || item.done === 1 ? 1 : 0;
          if (isDone === 1) {
            const key = `${item.date}_${localHabit.id}`;
            monthMap.set(key, { done: 1 });
          }
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
  }, [weekStart, currentMonth, habits]);

  const handleHabitClick = async (habitId: string, date: string) => {
    const key = `${date}_${habitId}`;
    const current = weekHabits.get(key)?.done ?? 0;
    const next = current === 1 ? 0 : 1;
    const habitName = habits.find(h => h.id === habitId)?.name || '';

    // Save to database first
    try {
      await saveHabitState(habitName, date, next);

      // Update UI after successful save
      const newMap = new Map(weekHabits);
      if (next === 0) {
        newMap.delete(key);
      } else {
        newMap.set(key, { done: next });
      }
      setWeekHabits(newMap);
    } catch (error) {
      console.error('Error saving habit state:', error);
      alert(`❌ Erro ao salvar: ${error instanceof Error ? error.message : 'Desconhecido'}`);
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

  const weekProgress = useMemo(() => {
    const total = habits.length * 7;
    if (total === 0) return 0;
    let done = 0;
    habits.forEach(habit => {
      weekDates.forEach(date => {
        const key = `${date}_${habit.id}`;
        if (weekHabits.get(key)?.done === 1) done++;
      });
    });
    return Math.round((done / total) * 100);
  }, [weekHabits, habits, weekDates]);

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
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif', background: '#FFFFFF', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.8px' }}>Hábitos</h1>
          <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#6B7280' }}>{habits.length} ativos • {weekCompleteCount} concluídos hoje</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '11px 18px',
            background: '#0F172A',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#1F2937';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#0F172A';
          }}
        >
          <Plus size={16} /> Novo Hábito
        </button>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '28px', background: '#F9F9FA', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Progresso da semana</span>
          <span style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>{weekProgress}%</span>
        </div>
        <div style={{ height: '8px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${weekProgress}%`, background: '#0F172A', borderRadius: '4px', transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {/* Add Habit Form */}
      {showAddForm && (
        <div style={{ background: '#F9F9FA', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px', marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 100px 1fr', gap: '12px' }}>
          <input
            type="text"
            placeholder="Nome do hábito"
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddHabit()}
            style={{
              padding: '11px 14px',
              border: '1px solid #D1D5DB',
              borderRadius: '7px',
              fontSize: '14px',
              fontFamily: 'inherit',
              outline: 'none',
              background: '#FFFFFF',
              color: '#1F2937',
            }}
          />
          <input
            type="text"
            placeholder="Ícone"
            value={newHabitIcon}
            onChange={(e) => setNewHabitIcon(e.target.value.slice(0, 1))}
            style={{
              padding: '11px 14px',
              border: '1px solid #D1D5DB',
              borderRadius: '7px',
              fontSize: '14px',
              fontFamily: 'inherit',
              outline: 'none',
              textAlign: 'center',
              background: '#FFFFFF',
              color: '#1F2937',
            }}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleAddHabit}
              style={{
                flex: 1,
                padding: '11px 14px',
                background: '#10B981',
                color: '#fff',
                border: 'none',
                borderRadius: '7px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = '#059669'}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = '#10B981'}
            >
              ✓ Salvar
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              style={{
                padding: '11px 14px',
                background: '#EF4444',
                color: '#fff',
                border: 'none',
                borderRadius: '7px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = '#DC2626'}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = '#EF4444'}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', borderBottom: '2px solid #E5E7EB', paddingBottom: '0' }}>
        {tabItems.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '14px 0',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid #0F172A' : '3px solid transparent',
              color: activeTab === tab.id ? '#0F172A' : '#6B7280',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: '15px',
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#374151', fontWeight: 500 }}>
              {new Date(weekStart1).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} a {new Date(new Date(weekStart1).getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { const prev = new Date(weekStart); prev.setDate(prev.getDate() - 7); setWeekStart(prev); }} style={{ padding: '8px 12px', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: '6px', cursor: 'pointer', color: '#374151' }}><ChevronLeft size={16} /></button>
              <button onClick={() => setWeekStart(new Date())} style={{ padding: '8px 14px', background: '#0F172A', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Hoje</button>
              <button onClick={() => { const next = new Date(weekStart); next.setDate(next.getDate() + 7); setWeekStart(next); }} style={{ padding: '8px 12px', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: '6px', cursor: 'pointer', color: '#374151' }}><ChevronRight size={16} /></button>
            </div>
          </div>

          {/* Save Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px', gap: '12px' }}>
            <button
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  // Prepare all states to save
                  const statesToSave = [];
                  for (const habit of habits) {
                    for (const date of weekDates) {
                      const key = `${date}_${habit.id}`;
                      const isDone = weekHabits.get(key)?.done === 1 ? 1 : 0;
                      statesToSave.push({
                        habitName: habit.name,
                        date,
                        state: isDone as -1 | 0 | 1,
                      });
                    }
                  }
                  // Batch save all at once
                  await batchSaveHabitStates(statesToSave);
                  alert('✓ Hábitos salvos com sucesso!');
                } catch (error) {
                  alert(`❌ Erro ao salvar: ${error instanceof Error ? error.message : 'Desconhecido'}`);
                  console.error(error);
                } finally {
                  setSaving(false);
                }
              }}
              style={{
                padding: '11px 22px',
                background: saving ? '#9CA3AF' : '#0F172A',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: saving ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!saving) (e.currentTarget as HTMLElement).style.background = '#1F2937';
              }}
              onMouseLeave={(e) => {
                if (!saving) (e.currentTarget as HTMLElement).style.background = '#0F172A';
              }}
            >
              {saving ? 'Salvando...' : 'Salvar Semana'}
            </button>
          </div>

          {/* Week Table */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(7, 56px) 64px 44px', gap: '0', borderBottom: '1px solid #E5E7EB', background: '#FAFAFA' }}>
              <div style={{ padding: '14px 18px', fontWeight: 700, fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Hábito</div>
              {weekDates.map((date, idx) => (
                <div key={date} style={{ padding: '14px 0', fontWeight: 700, fontSize: '11px', color: '#6B7280', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  {daysOfWeek[idx]}
                </div>
              ))}
              <div style={{ padding: '14px 0', fontWeight: 700, fontSize: '11px', color: '#6B7280', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.6px' }}>%</div>
              <div />
            </div>

            {/* Rows */}
            {habits.map((habit, habitIdx) => {
              const completedDays = weekDates.filter(date => weekHabits.get(`${date}_${habit.id}`)?.done === 1).length;
              const percent = Math.round((completedDays / 7) * 100);
              return (
                <div
                  key={habit.id}
                  style={{ display: 'grid', gridTemplateColumns: '1fr repeat(7, 56px) 64px 44px', gap: '0', borderBottom: habitIdx < habits.length - 1 ? '1px solid #F3F4F6' : 'none', background: '#FFFFFF', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = '#FAFAFA'}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = '#FFFFFF'}
                >
                  {/* Habit Name */}
                  <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <span style={{ fontSize: '20px', flexShrink: 0 }}>{habit.icon}</span>
                    <span style={{ fontWeight: 500, color: '#0F172A', fontSize: '14px', lineHeight: '1.3' }}>{habit.name}</span>
                  </div>

                  {/* Day cells */}
                  {weekDates.map((date) => {
                    const key = `${date}_${habit.id}`;
                    const isDone = weekHabits.get(key)?.done === 1;
                    return (
                      <div key={date} style={{ padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleHabitClick(habit.id, date)}
                          style={{
                            width: '30px',
                            height: '30px',
                            border: `2px solid ${isDone ? '#0F172A' : '#D1D5DB'}`,
                            borderRadius: '7px',
                            background: isDone ? '#0F172A' : '#FFFFFF',
                            color: isDone ? '#FFFFFF' : 'transparent',
                            fontWeight: 700,
                            fontSize: '14px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            if (!isDone) {
                              (e.currentTarget as HTMLElement).style.borderColor = '#0F172A';
                              (e.currentTarget as HTMLElement).style.background = '#F3F4F6';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isDone) {
                              (e.currentTarget as HTMLElement).style.borderColor = '#D1D5DB';
                              (e.currentTarget as HTMLElement).style.background = '#FFFFFF';
                            }
                          }}
                        >
                          {isDone ? '✓' : ''}
                        </button>
                      </div>
                    );
                  })}

                  {/* Percentage */}
                  <div style={{ padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#0F172A', fontSize: '13px' }}>
                    {percent}%
                  </div>

                  {/* Delete */}
                  <div style={{ padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <button
                      onClick={() => handleDeleteHabit(habit.id)}
                      title="Excluir hábito"
                      style={{
                        width: '24px',
                        height: '24px',
                        border: 'none',
                        borderRadius: '6px',
                        background: 'transparent',
                        color: '#9CA3AF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = '#FEE2E2';
                        (e.currentTarget as HTMLElement).style.color = '#DC2626';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                        (e.currentTarget as HTMLElement).style.color = '#9CA3AF';
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MONTHLY VIEW */}
      {activeTab === 'month' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <p style={{ margin: 0, fontSize: '15px', color: '#1F2937', fontWeight: 600 }}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { const prev = new Date(currentMonth); prev.setMonth(prev.getMonth() - 1); setCurrentMonth(prev); }} style={{ padding: '8px 12px', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: '6px', cursor: 'pointer', color: '#374151' }}><ChevronLeft size={16} /></button>
              <button onClick={() => setCurrentMonth(new Date())} style={{ padding: '8px 14px', background: '#0F172A', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Este Mês</button>
              <button onClick={() => { const next = new Date(currentMonth); next.setMonth(next.getMonth() + 1); setCurrentMonth(next); }} style={{ padding: '8px 12px', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: '6px', cursor: 'pointer', color: '#374151' }}><ChevronRight size={16} /></button>
            </div>
          </div>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            {habits.map(habit => {
              const stat = monthStats[habit.name] || { percentage: 0, done: 0, total: 0 };
              return (
                <div key={`stat-${habit.id}`} style={{ background: '#F9F9FA', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '12px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '16px', flexShrink: 0 }}>{habit.icon}</span>
                    <div style={{ fontWeight: 600, flex: 1, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{habit.name}</div>
                  </div>
                  <div style={{ height: '6px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                    <div style={{ height: '100%', background: habit.color, width: `${stat.percentage}%`, transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ color: '#0F172A', fontWeight: 700, fontSize: '14px' }}>{stat.percentage}%</div>
                </div>
              );
            })}
          </div>

          {/* Month Calendar */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {/* Day headers */}
              {daysOfWeek.map(day => (
                <div key={`header-${day}`} style={{ textAlign: 'center', fontWeight: 700, color: '#374151', padding: '8px', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.5px' }}>
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
                  <div key={`day-${day}`} style={{ padding: '8px 4px', border: '1px solid #E5E7EB', borderRadius: '6px', textAlign: 'center', background: isComplete ? '#ECFDF5' : '#F9F9FA', transition: 'all 0.2s' }}>
                    <div style={{ fontWeight: 700, color: '#1F2937', fontSize: '13px' }}>{day}</div>
                    <div style={{ fontSize: '11px', color: isComplete ? '#10B981' : '#6B7280', marginTop: '3px', fontWeight: 600 }}>
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
