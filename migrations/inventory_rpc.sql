CREATE OR REPLACE FUNCTION increment_inventory(
  p_user_id UUID,
  p_item_id TEXT,
  p_quantity INTEGER DEFAULT 1
) RETURNS void AS $$
BEGIN
  UPDATE inventory
  SET quantity = quantity + p_quantity
  WHERE user_id = p_user_id AND item_id = p_item_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_inventory(
  p_user_id UUID,
  p_item_id TEXT,
  p_quantity INTEGER DEFAULT 1
) RETURNS void AS $$
BEGIN
  UPDATE inventory
  SET quantity = GREATEST(0, quantity - p_quantity)
  WHERE user_id = p_user_id AND item_id = p_item_id;
  -- Clean up zero-quantity rows
  DELETE FROM inventory
  WHERE user_id = p_user_id AND item_id = p_item_id AND quantity <= 0;
END;
$$ LANGUAGE plpgsql;
