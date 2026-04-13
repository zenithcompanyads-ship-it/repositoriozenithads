-- Create client_tasks table
CREATE TABLE IF NOT EXISTS client_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  due_date DATE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create client_task_comments table
CREATE TABLE IF NOT EXISTS client_task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES client_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create client_task_tags table
CREATE TABLE IF NOT EXISTS client_task_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES client_tasks(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_client_tasks_client_id ON client_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_client_tasks_created_by ON client_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_client_task_comments_task_id ON client_task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_client_task_tags_task_id ON client_task_tags(task_id);

-- Enable RLS
ALTER TABLE client_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_task_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_tasks (admin-only)
DROP POLICY IF EXISTS "Admins can view own client tasks" ON client_tasks;
CREATE POLICY "Admins can view own client tasks"
  ON client_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_tasks.client_id
        AND clients.id IN (
          SELECT id FROM clients
          WHERE EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid() AND users.role = 'admin'
          )
        )
    )
  );

DROP POLICY IF EXISTS "Admins can create client tasks" ON client_tasks;
CREATE POLICY "Admins can create client tasks"
  ON client_tasks FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update client tasks" ON client_tasks;
CREATE POLICY "Admins can update client tasks"
  ON client_tasks FOR UPDATE
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete client tasks" ON client_tasks;
CREATE POLICY "Admins can delete client tasks"
  ON client_tasks FOR DELETE
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for client_task_comments
DROP POLICY IF EXISTS "Admins can view task comments" ON client_task_comments;
CREATE POLICY "Admins can view task comments"
  ON client_task_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_tasks
      WHERE client_tasks.id = client_task_comments.task_id
        AND EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    )
  );

DROP POLICY IF EXISTS "Admins can create task comments" ON client_task_comments;
CREATE POLICY "Admins can create task comments"
  ON client_task_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for client_task_tags
DROP POLICY IF EXISTS "Admins can view task tags" ON client_task_tags;
CREATE POLICY "Admins can view task tags"
  ON client_task_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_tasks
      WHERE client_tasks.id = client_task_tags.task_id
        AND EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid() AND users.role = 'admin'
        )
    )
  );
