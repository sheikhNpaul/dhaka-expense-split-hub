
-- Function to get expense comments
CREATE OR REPLACE FUNCTION public.get_expense_comments(p_expense_id uuid)
RETURNS TABLE (
  id uuid,
  content text,
  user_id uuid,
  expense_id uuid,
  created_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    ec.id,
    ec.content,
    ec.user_id,
    ec.expense_id,
    ec.created_at
  FROM public.expense_comments ec
  WHERE ec.expense_id = p_expense_id
  ORDER BY ec.created_at ASC;
$$;

-- Function to insert expense comment
CREATE OR REPLACE FUNCTION public.insert_expense_comment(
  p_content text,
  p_user_id uuid,
  p_expense_id uuid
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO public.expense_comments (content, user_id, expense_id)
  VALUES (p_content, p_user_id, p_expense_id)
  RETURNING id;
$$;
