BEGIN;

-- ==============================================================================
-- Fix Café pack size from 1GR to 500GR
-- ==============================================================================

-- Step 1: Delete the old 1GR Café item_key (and cascade to basket_item)
DELETE FROM inflacao_brasil.item_key
WHERE qtd_embalagem = '1'
  AND unidade_sigla = 'GR'
  AND produto_categoria = 9
  AND produto_subcategoria = 90001;

-- Step 2: Ensure 500GR Café is linked to default_basket (via 0011, but double-check)
INSERT INTO inflacao_brasil.basket_item (basket_id, item_id, weight)
SELECT
    b.id,
    ik.id,
    1.0
FROM inflacao_brasil.basket b
CROSS JOIN inflacao_brasil.item_key ik
WHERE b.code = 'default_basket'
  AND ik.qtd_embalagem = '500'
  AND ik.unidade_sigla = 'GR'
  AND ik.produto_categoria = 9
  AND ik.produto_subcategoria = 90001
ON CONFLICT (basket_id, item_id) DO NOTHING;

COMMIT;
