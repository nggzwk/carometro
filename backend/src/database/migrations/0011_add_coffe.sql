BEGIN;

-- ==============================================================================
-- Add Coffee (Café) to the Default Basket
-- ==============================================================================

-- 1. Create the item_key for Café if it doesn't exist
-- Category 9, Subcategory 90001, 500 GR (adjust weight/unit if needed based on your CSVs)
INSERT INTO inflacao_brasil.item_key (qtd_embalagem, unidade_sigla, produto_categoria, produto_subcategoria)
VALUES ('500', 'GR', 9, 90001)
ON CONFLICT (qtd_embalagem, unidade_sigla, produto_categoria, produto_subcategoria) DO NOTHING;

-- 2. Link the new Café item to the default_basket
INSERT INTO inflacao_brasil.basket_item (basket_id, item_id, weight)
SELECT
    b.id,
    ik.id,
    1.0 -- Standard weight of 1, can be updated later for "True Quantity"
FROM inflacao_brasil.basket b
CROSS JOIN inflacao_brasil.item_key ik
WHERE b.code = 'default_basket'
  AND ik.qtd_embalagem = '500' 
  AND ik.unidade_sigla = 'GR' 
  AND ik.produto_categoria = 9 
  AND ik.produto_subcategoria = 90001
ON CONFLICT (basket_id, item_id) DO NOTHING;

COMMIT;