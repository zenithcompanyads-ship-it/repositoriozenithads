import { SupabaseClient } from '@supabase/supabase-js';

export interface Task {
  id: string;
  client_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high';
  due_date?: string;
  assigned_to?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  tags?: string[];
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  updated_at: string;
  user?: { name?: string; email?: string };
}

// Get all tasks for a client
export async function getClientTasks(supabase: SupabaseClient, clientId: string): Promise<Task[]> {
  const { data: tasks, error } = await supabase
    .from('client_tasks')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Fetch tags for each task
  const tasksWithTags = await Promise.all(
    (tasks || []).map(async (task) => {
      const { data: tags } = await supabase
        .from('client_task_tags')
        .select('tag')
        .eq('task_id', task.id);
      return {
        ...task,
        tags: tags?.map((t) => t.tag) || [],
      };
    })
  );

  return tasksWithTags;
}

// Create a new task
export async function createTask(
  supabase: SupabaseClient,
  clientId: string,
  userId: string,
  taskData: Omit<Task, 'id' | 'client_id' | 'created_by' | 'created_at' | 'updated_at'>
): Promise<Task> {
  const { data: task, error } = await supabase
    .from('client_tasks')
    .insert({
      client_id: clientId,
      created_by: userId,
      title: taskData.title,
      description: taskData.description,
      status: taskData.status || 'pending',
      priority: taskData.priority || 'normal',
      due_date: taskData.due_date,
      assigned_to: taskData.assigned_to,
    })
    .select()
    .single();

  if (error) throw error;

  // Create tags if provided
  if (taskData.tags && taskData.tags.length > 0) {
    await supabase.from('client_task_tags').insert(
      taskData.tags.map((tag) => ({
        task_id: task.id,
        tag,
      }))
    );
  }

  return {
    ...task,
    tags: taskData.tags || [],
  };
}

// Update a task
export async function updateTask(
  supabase: SupabaseClient,
  taskId: string,
  updates: Partial<Task>
): Promise<Task> {
  // Remove tags from updates, we'll handle them separately
  const { tags, ...taskUpdates } = updates;

  const { data: task, error } = await supabase
    .from('client_tasks')
    .update({
      ...taskUpdates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;

  // Update tags if provided
  if (tags !== undefined) {
    // Delete old tags
    await supabase.from('client_task_tags').delete().eq('task_id', taskId);

    // Create new tags
    if (tags.length > 0) {
      await supabase.from('client_task_tags').insert(
        tags.map((tag) => ({
          task_id: taskId,
          tag,
        }))
      );
    }
  }

  return {
    ...task,
    tags: tags || [],
  };
}

// Delete a task
export async function deleteTask(supabase: SupabaseClient, taskId: string): Promise<void> {
  const { error } = await supabase.from('client_tasks').delete().eq('id', taskId);
  if (error) throw error;
}

// Get task comments
export async function getTaskComments(
  supabase: SupabaseClient,
  taskId: string
): Promise<TaskComment[]> {
  const { data: comments, error } = await supabase
    .from('client_task_comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return comments || [];
}

// Add comment to task
export async function addTaskComment(
  supabase: SupabaseClient,
  taskId: string,
  userId: string,
  comment: string
): Promise<TaskComment> {
  const { data, error } = await supabase
    .from('client_task_comments')
    .insert({
      task_id: taskId,
      user_id: userId,
      comment,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete comment
export async function deleteTaskComment(
  supabase: SupabaseClient,
  commentId: string
): Promise<void> {
  const { error } = await supabase.from('client_task_comments').delete().eq('id', commentId);
  if (error) throw error;
}
